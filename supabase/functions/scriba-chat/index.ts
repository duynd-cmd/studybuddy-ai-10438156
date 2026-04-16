import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, grade, subjects, goal, fileContent, fileName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = `Bạn là Scriba — mentor học tập AI cho học sinh Việt Nam theo chương trình MOET 2018.
Thông tin học sinh: Lớp ${grade || "chưa rõ"}, môn: ${(subjects || []).join(", ") || "chưa rõ"}, mục tiêu: ${goal || "chưa rõ"}.

## Vai trò & Giọng điệu
- Bạn là mentor logic, thẳng thắn, và hỗ trợ. Không nói "fluff" hay quá phấn khích.
- Trả lời bằng tiếng Việt, sử dụng markdown để format.
- Khi giải thích khái niệm, chia thành: **Tại sao nó tồn tại** và **Cách nó hoạt động**.
- Có thể dùng humor nhẹ nhàng, nhưng nghiêm túc về mặt kiến thức.

## Quy tắc Gợi ý (Hint Rule)
- Khi học sinh trả lời sai, **KHÔNG đưa đáp án ngay**. Thay vào đó, đưa ra GỢI Ý tập trung vào logic hoặc từ khóa quan trọng.
- Khuyến khích học sinh thử lại sau mỗi gợi ý.
- Chỉ tiết lộ đáp án nếu học sinh sai **3 lần liên tiếp** hoặc yêu cầu rõ ràng sau lần thử thứ 2.

## Quy tắc Tài liệu tham khảo (Chống Hallucination)
- **TUYỆT ĐỐI KHÔNG bịa URL.** Chỉ cung cấp link từ: MDN Web Docs, W3Schools, hoặc tài liệu chính thức (React.dev, TailwindCSS.com, v.v.).
- Nếu không chắc URL chính xác, sử dụng link Google Search: \`https://www.google.com/search?q=[Chủ+đề]+official+documentation\`
- Trước khi đưa link, xác nhận domain là nguồn kỹ thuật uy tín.`;

    if (fileContent) {
      systemPrompt += `\n\nHọc sinh đã tải lên tài liệu "${fileName || "tài liệu"}". Nội dung tài liệu:\n\n${fileContent.slice(0, 30000)}\n\nHãy trả lời câu hỏi dựa trên nội dung tài liệu này.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Quá nhiều yêu cầu, vui lòng thử lại sau." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Hết quota AI, vui lòng nạp thêm credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("scriba-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
