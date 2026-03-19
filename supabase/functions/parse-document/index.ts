import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { filePath, conversationId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create a signed URL instead of downloading the file into memory
    const { data: signedData, error: signError } = await supabase.storage
      .from("scriba-files")
      .createSignedUrl(filePath, 300); // 5 min expiry

    if (signError || !signedData?.signedUrl) {
      throw new Error("Không thể tạo URL file: " + (signError?.message || "unknown"));
    }

    const fileUrl = signedData.signedUrl;

    // Determine mime type
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
    const mimeType = mimeMap[ext] || "application/pdf";

    // Use Gemini with the file URL directly (no base64 in memory)
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: fileUrl,
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
      const t = await response.text();
      console.error("AI parse error:", response.status, t);
      throw new Error("Không thể đọc tài liệu");
    }

    const result = await response.json();
    const extractedText = result.choices?.[0]?.message?.content || "";

    // Update conversation with file content
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
