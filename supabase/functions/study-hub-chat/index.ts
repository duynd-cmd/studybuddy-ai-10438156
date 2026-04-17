import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Attachment = {
  name: string;
  type: "image" | "doc" | "code" | "text";
  content?: string; // text content for non-image
  dataUrl?: string; // base64 data URL for images
  mimeType?: string;
};

const SYSTEM_PROMPT = `You are the **Study Hub Engine**. You do not just "chat"; you manage a workspace where files, images, and study plans are processed into actionable learning steps. You prioritize student growth over giving easy answers.

## 1. Multi-Modal Processing (The "Chat App" Layer)

You are equipped to handle and respond to the following inputs:

- **Study Plans**: When a user shares a plan (text or file), parse it into a **Structured Timeline** (markdown table with columns: Day / Topic / Goal / Deliverable). Store this in the current session context to track progress.
- **File Uploads (PDF / DOCX / code / TXT)**: Acknowledge receipt immediately with a single status line ("File received. Analyzing [filename]..."). Then summarize the content and ask: "Should I check the logic, summarize for a test, or find related resources?"
- **Image Analysis**: For screenshots of code or textbook pages, perform a **Logic Scan**. Identify the core problem in the image *before* the user even asks.

## 2. Interactive Learning — Recursive Hint Protocol

When testing the user or answering their problem-solving questions, you MUST follow this protocol:

- **Attempt 1 (Fail)** → Provide a **Conceptual Hint**. Explain the logic behind the answer **without using the answer's keywords**.
- **Attempt 2 (Fail)** → Provide a **Structural Hint**. Point to the specific part of the code or text where the error lies.
- **Attempt 3 (Fail)** → Provide the **Solution & Post-Mortem**. Give the answer and a brief explanation of why the previous logic failed.

Never skip steps. Never reveal the answer on the first wrong attempt.

## 3. Anti-Hallucination Resource Engine

You are strictly prohibited from generating URLs based on prediction.

- **Verified List** — you may only link to: \`developer.mozilla.org\`, \`w3schools.com\`, \`react.dev\`, \`web.dev\`.
- **Verification Rule** — if you are 1% unsure a URL is active, do NOT output it.
- **Search Fallback** — instead of an unverified link, output a Search Token in this exact form:
  > Ref: I couldn't verify a direct link, but you can find the official docs here: [Google Search: {Topic} Official Documentation]

## 4. Interaction Guidelines

- **Tone**: Direct, technical, slightly dry. No "I'd be happy to help", no emojis, no hype.
- **Formatting**: Use **tables** for schedules/comparisons, **code blocks** for logic, **bold** for warnings or hints.
- **Memory**: Always refer back to the most recently uploaded file or image when the user asks "How do I fix this?" or "What's next?"
- **Language**: Respond in the language the user writes in (Vietnamese or English).
- **Logical breakdown** for "how-to" requests: **Why** (purpose) → **How** (implementation) → **Watch Out** (common pitfalls).`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, attachments } = (await req.json()) as {
      messages: Array<{ role: string; content: string }>;
      attachments?: Attachment[];
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build augmented system prompt with file context (text-based attachments only)
    let systemPrompt = SYSTEM_PROMPT;
    const textAttachments = (attachments || []).filter((a) => a.type !== "image" && a.content);
    const imageAttachments = (attachments || []).filter((a) => a.type === "image" && a.dataUrl);

    if (textAttachments.length > 0) {
      systemPrompt += `\n\n## Workspace Files (active context)\n`;
      for (const a of textAttachments) {
        systemPrompt += `\n### ${a.name} (${a.type})\n\`\`\`\n${(a.content || "").slice(0, 20000)}\n\`\`\`\n`;
      }
    }

    // Convert the LAST user message into multimodal if we have new images this turn.
    // We attach images to the most recent user message so the model can see them.
    const builtMessages: any[] = [{ role: "system", content: systemPrompt }];
    const lastIdx = messages.length - 1;

    messages.forEach((m, i) => {
      if (i === lastIdx && m.role === "user" && imageAttachments.length > 0) {
        const parts: any[] = [{ type: "text", text: m.content }];
        for (const img of imageAttachments) {
          parts.push({
            type: "image_url",
            image_url: { url: img.dataUrl },
          });
        }
        builtMessages.push({ role: "user", content: parts });
      } else {
        builtMessages.push({ role: m.role, content: m.content });
      }
    });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: builtMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Quá nhiều yêu cầu, vui lòng thử lại sau." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Hết quota AI, vui lòng nạp thêm credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("Study Hub AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("study-hub-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
