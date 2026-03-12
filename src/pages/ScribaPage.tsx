import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Send, MessageSquare, Loader2, Upload, FileText, X } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.ms-powerpoint",
  "application/vnd.ms-excel",
  "text/plain",
];

export default function ScribaPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeConvoFile, setActiveConvoFile] = useState<string | null>(null);
  const [activeConvoFileContent, setActiveConvoFileContent] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Load messages + file info when conversation changes
  useEffect(() => {
    if (!activeConvoId) {
      setMessages([]);
      setActiveConvoFile(null);
      setActiveConvoFileContent(null);
      return;
    }
    (async () => {
      const [messagesRes, convoRes] = await Promise.all([
        supabase
          .from("scriba_messages")
          .select("role, content")
          .eq("conversation_id", activeConvoId)
          .order("created_at", { ascending: true }),
        supabase
          .from("scriba_conversations")
          .select("file_name, file_content")
          .eq("id", activeConvoId)
          .single(),
      ]);
      setMessages((messagesRes.data || []).map((m: any) => ({ role: m.role, content: m.content })));
      setActiveConvoFile(convoRes.data?.file_name || null);
      setActiveConvoFileContent(convoRes.data?.file_content || null);
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
    setActiveConvoFile(null);
    setActiveConvoFileContent(null);
  };

  const handleFileUpload = useCallback(async (file: File) => {
    if (!user || !activeConvoId) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Định dạng file không được hỗ trợ. Hãy tải PDF, Word, PowerPoint, Excel hoặc TXT.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File quá lớn (tối đa 20MB)");
      return;
    }

    setUploading(true);
    try {
      const filePath = `${user.id}/${activeConvoId}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("scriba-files")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      // Parse document
      const { data, error } = await supabase.functions.invoke("parse-document", {
        body: { filePath, conversationId: activeConvoId },
      });
      if (error) throw error;

      setActiveConvoFile(data.fileName || file.name);
      setActiveConvoFileContent(data.text || "");
      queryClient.invalidateQueries({ queryKey: ["scriba-convos", user.id] });
      toast.success(`Đã tải lên: ${file.name}`);
    } catch (e: any) {
      toast.error(e.message || "Lỗi tải file");
    } finally {
      setUploading(false);
    }
  }, [user, activeConvoId, queryClient]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const sendMessage = async () => {
    if (!input.trim() || isStreaming || !user || !activeConvoId) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    await supabase.from("scriba_messages").insert({
      conversation_id: activeConvoId,
      user_id: user.id,
      role: "user",
      content: userMsg.content,
    });

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
          fileContent: activeConvoFileContent || undefined,
          fileName: activeConvoFile || undefined,
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

  const hasFile = !!activeConvoFile;

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
        {/* File badge */}
        {activeConvoId && hasFile && (
          <div className="px-4 pt-3 pb-0">
            <div className="inline-flex items-center gap-1.5 bg-accent/15 text-foreground text-xs px-2.5 py-1 rounded">
              <FileText className="w-3 h-3" />
              {activeConvoFile}
            </div>
          </div>
        )}

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {!activeConvoId ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Chọn hoặc tạo cuộc trò chuyện mới</p>
              </div>
            </div>
          ) : !hasFile ? (
            /* File upload prompt */
            <div className="flex items-center justify-center h-full">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center max-w-sm w-full hover:border-accent/50 transition-colors"
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-accent" />
                    <p className="text-sm text-muted-foreground">Đang xử lý tài liệu...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground mb-1">Tải lên tài liệu để bắt đầu</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      PDF, Word, PowerPoint, Excel hoặc TXT (tối đa 20MB)
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Chọn file
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.docx,.pptx,.xlsx,.doc,.ppt,.xls,.txt"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                    />
                  </>
                )}
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Tài liệu đã sẵn sàng. Hãy đặt câu hỏi cho Scriba!</p>
            </div>
          ) : (
            messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring" as const, stiffness: 400, damping: 28, delay: i * 0.03 }}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm ${
                  m.role === "user" ? "bg-accent/20 text-foreground" : "bg-secondary text-foreground"
                }`}>
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : m.content}
                </div>
              </motion.div>
            ))
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {activeConvoId && hasFile && (
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hỏi về tài liệu..."
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
