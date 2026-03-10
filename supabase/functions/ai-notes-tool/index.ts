import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { content, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const actionPrompts: Record<string, string> = {
      summarize: "Hãy tóm tắt nội dung sau đây một cách ngắn gọn, rõ ràng bằng tiếng Việt:",
      explain: "Hãy giải thích chi tiết nội dung sau đây bằng tiếng Việt, dễ hiểu cho học sinh:",
      flashcards: "Từ nội dung sau, hãy tạo 5-10 flashcard dạng câu hỏi - đáp án bằng tiếng Việt. Format: **Q:** câu hỏi\\n**A:** đáp án",
      quiz: "Từ nội dung sau, hãy tạo 5 câu hỏi trắc nghiệm bằng tiếng Việt với 4 đáp án A/B/C/D và đáp án đúng:",
    };

    const prompt = actionPrompts[action] || actionPrompts.summarize;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Bạn là trợ lý học tập AI cho học sinh Việt Nam. Trả lời bằng tiếng Việt, sử dụng markdown." },
          { role: "user", content: `${prompt}\n\n${content}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        return new Response(JSON.stringify({ error: response.status === 429 ? "Rate limited" : "Payment required" }), {
          status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "";
    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-notes-tool error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
