import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as encodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_INLINE_FILE_SIZE_BYTES = 12 * 1024 * 1024; // 12MB

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: fileData, error: downloadError } = await supabase.storage
      .from("scriba-files")
      .download(filePath);

    if (downloadError || !fileData) {
      throw new Error("Không thể tải file: " + (downloadError?.message || "unknown"));
    }

    if (fileData.size > MAX_INLINE_FILE_SIZE_BYTES) {
      return new Response(
        JSON.stringify({
          error: "Tài liệu quá lớn để phân tích trực tiếp. Vui lòng dùng file nhỏ hơn 12MB.",
        }),
        {
          status: 413,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const ext = filePath.split(".").pop()?.toLowerCase() || "";
    const mimeMap: Record<string, string> = {
      pdf: "application/pdf",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      doc: "application/msword",
      ppt: "application/vnd.ms-powerpoint",
      xls: "application/vnd.ms-excel",
      txt: "text/plain",
    };
    const mimeType = mimeMap[ext] || "application/octet-stream";

    const bytes = new Uint8Array(await fileData.arrayBuffer());
    const base64 = encodeBase64(bytes);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64}`,
                },
              },
              {
                type: "text",
                text: "Hãy trích xuất TOÀN BỘ nội dung text từ tài liệu này. Giữ nguyên cấu trúc, tiêu đề, danh sách. Trả về dưới dạng plain text có format markdown. Không thêm nhận xét hay giải thích, chỉ nội dung tài liệu.",
              },
            ],
          },
        ],
      }),
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
    const extractedText = result.choices?.[0]?.message?.content || "";

    const { error: updateError } = await supabase
      .from("scriba_conversations")
      .update({
        file_name: filePath.split("/").pop(),
        file_content: extractedText.slice(0, 50000),
      })
      .eq("id", conversationId);

    if (updateError) {
      console.error("Update error:", updateError);
    }

    return new Response(JSON.stringify({ text: extractedText, fileName: filePath.split("/").pop() }), {
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
