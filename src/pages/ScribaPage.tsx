import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Send, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

export default function ScribaPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations
  const { data: conversations } = useQuery({
    queryKey: ["scriba-convos", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("scriba_conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConvoId) { setMessages([]); return; }
    (async () => {
      const { data } = await supabase
        .from("scriba_messages")
        .select("role, content")
        .eq("conversation_id", activeConvoId)
        .order("created_at", { ascending: true });
      setMessages((data || []).map((m: any) => ({ role: m.role, content: m.content })));
    })();
  }, [activeConvoId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createConversation = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("scriba_conversations")
      .insert({ user_id: user.id })
      .select()
      .single();
    if (error) { toast.error("Lỗi tạo cuộc trò chuyện"); return; }
    queryClient.invalidateQueries({ queryKey: ["scriba-convos", user.id] });
    setActiveConvoId(data.id);
    setMessages([]);
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming || !user || !activeConvoId) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    // Save user message
    await supabase.from("scriba_messages").insert({
      conversation_id: activeConvoId,
      user_id: user.id,
      role: "user",
      content: userMsg.content,
    });

    // Update conversation title from first message
    if (messages.length === 0) {
      await supabase.from("scriba_conversations").update({
        title: userMsg.content.slice(0, 50),
        updated_at: new Date().toISOString(),
      }).eq("id", activeConvoId);
      queryClient.invalidateQueries({ queryKey: ["scriba-convos", user.id] });
    }

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scriba-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: newMessages,
          grade: profile?.grade,
          subjects: profile?.subjects,
          goal: profile?.goal,
        }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "Stream error");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch { /* partial */ }
        }
      }

      // Save assistant message
      if (assistantContent) {
        await supabase.from("scriba_messages").insert({
          conversation_id: activeConvoId,
          user_id: user.id,
          role: "assistant",
          content: assistantContent,
        });
        queryClient.invalidateQueries({ queryKey: ["message-count", user.id] });
      }
    } catch (e: any) {
      toast.error(e.message || "Lỗi kết nối AI");
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar */}
      <div className="w-64 shrink-0 flex flex-col gap-2">
        <Button onClick={createConversation} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" size="sm">
          <Plus className="w-4 h-4 mr-1" /> Trò chuyện mới
        </Button>
        <div className="flex-1 overflow-y-auto space-y-1">
          {conversations?.map((c: any) => (
            <button
              key={c.id}
              onClick={() => setActiveConvoId(c.id)}
              className={`w-full text-left px-3 py-2 rounded text-sm truncate transition-colors ${
                activeConvoId === c.id ? "bg-accent/20 text-foreground" : "text-muted-foreground hover:bg-accent/10"
              }`}
            >
              <MessageSquare className="w-3 h-3 inline mr-1.5" />
              {c.title}
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <Card className="flex-1 flex flex-col bg-card border-border">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {!activeConvoId ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Chọn hoặc tạo cuộc trò chuyện mới</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Hãy đặt câu hỏi cho Scriba!</p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-accent/20 text-foreground"
                    : "bg-secondary text-foreground"
                }`}>
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : m.content}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {activeConvoId && (
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nhập câu hỏi..."
                className="min-h-[44px] max-h-32 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                }}
              />
              <Button
                onClick={sendMessage}
                disabled={isStreaming || !input.trim()}
                size="icon"
                className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0"
              >
                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
