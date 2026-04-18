import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as encodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as mammoth from "https://esm.sh/mammoth@1.8.0?target=deno";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const PARSE_PROMPT =
  "Hãy trích xuất TOÀN BỘ nội dung text từ tài liệu này. Giữ nguyên cấu trúc, tiêu đề, danh sách. Trả về dưới dạng plain text có format markdown. Không thêm nhận xét hay giải thích, chỉ nội dung tài liệu.";

// MIME types Gemini supports natively for inline_data
const GEMINI_NATIVE_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
  "text/plain",
]);

function getExt(filePath: string) {
  return filePath.split(".").pop()?.toLowerCase() || "";
}

function getMimeType(filePath: string) {
  const ext = getExt(filePath);
  const mimeMap: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    txt: "text/plain",
    md: "text/plain",
  };
  return mimeMap[ext] || "application/octet-stream";
}

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function buildGatewayBodyStream(source: ReadableStream<Uint8Array>, mimeType: string) {
  const encoder = new TextEncoder();
  const promptJson = JSON.stringify(PARSE_PROMPT);

  const prefix = `{"model":"google/gemini-3-flash-preview","messages":[{"role":"user","content":[{"type":"image_url","image_url":{"url":"data:${mimeType};base64,`;
  const suffix = `"}},{"type":"text","text":${promptJson}}]}]}`;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(prefix));

      const reader = source.getReader();
      let carry = new Uint8Array(0);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = value ?? new Uint8Array(0);
        const merged = concatBytes(carry, chunk);
        const processLen = merged.length - (merged.length % 3);

        if (processLen > 0) {
          controller.enqueue(encoder.encode(encodeBase64(merged.subarray(0, processLen))));
        }

        carry = merged.subarray(processLen);
      }

      if (carry.length > 0) {
        controller.enqueue(encoder.encode(encodeBase64(carry)));
      }

      controller.enqueue(encoder.encode(suffix));
      controller.close();
    },
  });
}

async function extractDocx(bytes: Uint8Array): Promise<string> {
  // mammoth in Deno expects a Node-style Buffer-like object via `buffer` key.
  // Fallback: parse DOCX as ZIP and extract text from word/document.xml ourselves.
  try {
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    // @ts-ignore - mammoth Deno build accepts {buffer}
    const result = await mammoth.extractRawText({ buffer: bytes });
    if (result?.value) return result.value;
    const result2 = await mammoth.extractRawText({ arrayBuffer: ab });
    if (result2?.value) return result2.value;
  } catch (err) {
    console.warn("mammoth failed, falling back to zip parse:", err);
  }

  // Fallback: extract text from word/document.xml via JSZip
  const zip = await JSZip.loadAsync(bytes);
  const docXml = zip.file("word/document.xml");
  if (!docXml) throw new Error("DOCX không hợp lệ: thiếu word/document.xml");
  const xml = await docXml.async("string");
  const paragraphs = [...xml.matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g)].map((p) => {
    const texts = [...p[1].matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]);
    return texts.join("");
  });
  return paragraphs.filter(Boolean).join("\n");
}

async function extractXlsx(bytes: Uint8Array): Promise<string> {
  const workbook = XLSX.read(bytes, { type: "array" });
  const parts: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    parts.push(`## ${sheetName}\n\n${XLSX.utils.sheet_to_csv(sheet)}`);
  }
  return parts.join("\n\n");
}

async function extractPptx(bytes: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  const slideFiles = Object.keys(zip.files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || "0");
      const nb = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || "0");
      return na - nb;
    });

  const parts: string[] = [];
  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.files[slideFiles[i]].async("string");
    const texts = [...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map((m) => m[1]);
    if (texts.length) parts.push(`## Slide ${i + 1}\n\n${texts.join(" ")}`);
  }
  return parts.join("\n\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { filePath, conversationId } = await req.json();
    if (!filePath || !conversationId) {
      return new Response(JSON.stringify({ error: "Thiếu filePath hoặc conversationId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: signedData, error: signError } = await supabase.storage
      .from("scriba-files")
      .createSignedUrl(filePath, 120);

    if (signError || !signedData?.signedUrl) {
      throw new Error("Không thể tạo URL file: " + (signError?.message || "unknown"));
    }

    const fileUrl = signedData.signedUrl;
    const headResp = await fetch(fileUrl, { method: "HEAD" });
    const contentLength = Number(headResp.headers.get("content-length") ?? "0");

    if (contentLength > 0 && contentLength > MAX_FILE_SIZE_BYTES) {
      return new Response(
        JSON.stringify({ error: "File quá lớn để xử lý. Vui lòng chọn file nhỏ hơn 10MB." }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ext = getExt(filePath);
    const fileName = filePath.split("/").pop() || "file";
    let extractedText = "";

    // Office formats: extract text locally (Gemini doesn't accept these MIME types)
    if (["docx", "xlsx", "pptx"].includes(ext)) {
      const fileResp = await fetch(fileUrl);
      if (!fileResp.ok) throw new Error("Không thể tải file");
      const bytes = new Uint8Array(await fileResp.arrayBuffer());

      try {
        if (ext === "docx") extractedText = await extractDocx(bytes);
        else if (ext === "xlsx") extractedText = await extractXlsx(bytes);
        else if (ext === "pptx") extractedText = await extractPptx(bytes);
      } catch (err) {
        console.error(`Extract ${ext} error:`, err);
        return new Response(
          JSON.stringify({ error: `Không thể trích xuất nội dung từ file .${ext}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (["doc", "ppt", "xls"].includes(ext)) {
      return new Response(
        JSON.stringify({
          error: `Định dạng .${ext} (Office cũ) không được hỗ trợ. Vui lòng lưu lại dưới dạng .${ext}x rồi tải lên.`,
        }),
        { status: 415, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // PDF / images / text → stream to Gemini
      const mimeType = getMimeType(filePath);
      if (!GEMINI_NATIVE_MIME.has(mimeType)) {
        return new Response(
          JSON.stringify({ error: `Định dạng file không được hỗ trợ: .${ext}` }),
          { status: 415, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

      const fileResp = await fetch(fileUrl);
      if (!fileResp.ok || !fileResp.body) throw new Error("Không thể tải stream file");

      const bodyStream = buildGatewayBodyStream(fileResp.body, mimeType);

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: bodyStream,
      });

      if (!response.ok) {
        const raw = await response.text();
        console.error("AI parse error:", response.status, raw);

        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Bạn đang gửi quá nhiều yêu cầu, vui lòng thử lại sau ít phút." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Hệ thống AI đã hết credits, vui lòng nạp thêm để tiếp tục." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "Không thể đọc tài liệu" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content;
      extractedText = typeof content === "string"
        ? content
        : Array.isArray(content)
          ? content.map((part: any) => part?.text || "").join("")
          : "";
    }

    const { error: updateError } = await supabase
      .from("scriba_conversations")
      .update({
        file_name: fileName,
        file_content: extractedText.slice(0, 50000),
      })
      .eq("id", conversationId);

    if (updateError) console.error("Update error:", updateError);

    return new Response(JSON.stringify({ text: extractedText, fileName }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-document error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
