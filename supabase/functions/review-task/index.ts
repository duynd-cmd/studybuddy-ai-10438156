import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { taskTitle, taskDescription, grade, subject } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `Bạn là giáo viên Việt Nam theo chương trình MOET 2018.
Học sinh vừa hoàn thành bài học: "${taskTitle}"${taskDescription ? `\nMô tả: ${taskDescription}` : ""}${grade ? `\nLớp: ${grade}` : ""}${subject ? `\nMôn: ${subject}` : ""}

Hãy tạo CHÍNH XÁC 2 câu hỏi trắc nghiệm (4 đáp án A/B/C/D) liên quan đến nội dung bài học để kiểm tra kiến thức.

Trả về JSON theo format sau (KHÔNG thêm text nào khác):
{
  "questions": [
    {
      "question": "Câu hỏi 1?",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correct": 0
    },
    {
      "question": "Câu hỏi 2?",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correct": 1
    }
  ]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("review-task error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
