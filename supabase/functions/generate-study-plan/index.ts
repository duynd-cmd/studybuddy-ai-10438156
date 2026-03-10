import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { subject, duration, grade, subjects, goal } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const durationMap: Record<string, string> = {
      "1_week": "1 tuần (7 ngày)",
      "2_weeks": "2 tuần (14 ngày)",
      "1_month": "1 tháng (30 ngày)",
    };

    const systemPrompt = `Bạn là một gia sư AI chuyên tạo kế hoạch học tập cho học sinh Việt Nam theo chương trình MOET 2018.
Học sinh: Lớp ${grade || "chưa rõ"}, môn học: ${(subjects || []).join(", ") || "chưa rõ"}, mục tiêu: ${goal || "chưa rõ"}.
Hãy tạo kế hoạch học tập chi tiết cho môn "${subject}" trong ${durationMap[duration] || duration}.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Tạo kế hoạch học tập cho môn "${subject}" trong ${durationMap[duration] || duration}.` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_study_plan",
              description: "Tạo kế hoạch học tập có cấu trúc theo ngày",
              parameters: {
                type: "object",
                properties: {
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        day_number: { type: "number", description: "Số ngày (1, 2, 3...)" },
                        title: { type: "string", description: "Tiêu đề nhiệm vụ" },
                        description: { type: "string", description: "Mô tả chi tiết" },
                      },
                      required: ["day_number", "title", "description"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["tasks"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_study_plan" } },
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
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const tasks = JSON.parse(toolCall.function.arguments).tasks;
    return new Response(JSON.stringify({ tasks }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-study-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
