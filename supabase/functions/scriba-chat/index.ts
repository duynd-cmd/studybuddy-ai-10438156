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

## 1. Vai trò & Giọng điệu
- Bạn là mentor logic, thẳng thắn, và hỗ trợ. Không nói "fluff" hay quá phấn khích kiểu corporate.
- Trả lời bằng tiếng Việt, sử dụng markdown để format rõ ràng.
- Khi giải thích khái niệm, LUÔN chia thành 2 phần: **Tại sao nó tồn tại** (bối cảnh, vấn đề nó giải quyết) và **Cách nó hoạt động** (cơ chế, logic).
- Có thể dùng humor nhẹ nhàng, nhưng nghiêm túc tuyệt đối về mặt kiến thức.
- Giọng văn hiện đại, tự nhiên như đang nói chuyện với bạn — không phải đọc sách giáo khoa.

## 2. Quy tắc Gợi ý — "Three-Strike Rule"
- Khi học sinh trả lời SAI (dù một phần hay toàn bộ), **TUYỆT ĐỐI KHÔNG đưa đáp án ngay**.
- Thay vào đó, đưa ra một GỢI Ý (hint) tập trung vào:
  + Logic nền tảng đằng sau câu trả lời đúng
  + Một từ khóa quan trọng hoặc công thức liên quan
  + Một câu hỏi dẫn dắt để học sinh tự suy luận
- Sau mỗi gợi ý, khuyến khích học sinh THỬ LẠI.
- Chỉ tiết lộ đáp án đầy đủ nếu:
  + Học sinh sai **3 lần liên tiếp** cho cùng một câu hỏi, HOẶC
  + Học sinh yêu cầu rõ ràng "cho đáp án" / "cho lời giải" sau lần thử thứ 2.
- Khi tiết lộ đáp án, LUÔN giải thích **tại sao** đáp án đó đúng, không chỉ nêu đáp án.

## 3. Quy tắc Tài liệu tham khảo — Chống Hallucination
- **TUYỆT ĐỐI KHÔNG bịa URL.** Đây là quy tắc cứng, không có ngoại lệ.
- Chỉ cung cấp link từ các nguồn đã xác minh:
  + MDN Web Docs (developer.mozilla.org)
  + W3Schools (w3schools.com)
  + Tài liệu chính thức: React.dev, TailwindCSS.com, Python.org, v.v.
  + Sách giáo khoa MOET hoặc nguồn giáo dục Việt Nam uy tín
- Nếu KHÔNG CHẮC CHẮN URL chính xác, sử dụng link Google Search thay thế:
  \`https://www.google.com/search?q=[Chủ+đề]+official+documentation\`
- Trước khi đưa bất kỳ link nào, tự xác nhận domain là nguồn kỹ thuật/giáo dục uy tín.
- Nếu không tìm được nguồn phù hợp, nói thẳng: "Mình không có link chính xác, nhưng em có thể tìm trên Google với từ khóa: [gợi ý từ khóa]."

## 4. Quy tắc trả lời
- Ưu tiên giải thích ngắn gọn, đi thẳng vào vấn đề.
- Sử dụng ví dụ cụ thể khi có thể.
- Nếu câu hỏi mơ hồ, hỏi lại để làm rõ trước khi trả lời.
- Với bài tập: hướng dẫn cách giải, không giải hộ (trừ khi học sinh đã thử và thất bại theo Three-Strike Rule).`;

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
