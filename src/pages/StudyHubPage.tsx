import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Send,
  MessageSquare,
  Loader2,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Code2,
  Layers,
  BookMarked,
  NotebookPen,
  CalendarRange,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Msg = { role: "user" | "assistant"; content: string };

type FileType = "image" | "doc" | "code" | "text";
type Attachment = {
  name: string;
  type: FileType;
  content?: string;
  dataUrl?: string;
  mimeType?: string;
  storagePath?: string;
};

const TEXT_EXT = new Set([
  "txt", "md", "json", "yaml", "yml", "html", "css", "js", "jsx", "ts", "tsx",
  "py", "java", "c", "cpp", "h", "go", "rs", "rb", "php", "sh", "sql", "xml",
  "csv", "log", "env",
]);
const CODE_EXT = new Set([
  "js", "jsx", "ts", "tsx", "py", "java", "c", "cpp", "h", "go", "rs", "rb",
  "php", "sh", "sql", "html", "css",
]);
const DOC_EXT = new Set(["pdf", "docx", "pptx", "xlsx", "doc", "ppt", "xls"]);
const IMG_EXT = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

const MAX_BYTES = 20 * 1024 * 1024;

function getExt(name: string) {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

function fileIcon(t: FileType) {
  if (t === "image") return <ImageIcon className="w-3 h-3" />;
  if (t === "code") return <Code2 className="w-3 h-3" />;
  return <FileText className="w-3 h-3" />;
}

function slugify(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export default function StudyHubPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: userNotes } = useQuery({
    queryKey: ["study-hub-embed-notes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("notes")
        .select("id, title, subject, content, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      return data || [];
    },
    enabled: !!user && embedOpen,
  });

  const { data: userPlans } = useQuery({
    queryKey: ["study-hub-embed-plans", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: plans } = await supabase
        .from("study_plans")
        .select("id, subject, duration, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!plans) return [];
      const ids = plans.map((p) => p.id);
      const { data: tasks } = await supabase
        .from("study_tasks")
        .select("plan_id, day_number, title, description, completed")
        .in("plan_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])
        .order("day_number", { ascending: true });
      return plans.map((p) => ({
        ...p,
        tasks: (tasks || []).filter((t) => t.plan_id === p.id),
      }));
    },
    enabled: !!user && embedOpen,
  });

  const { data: conversations } = useQuery({
    queryKey: ["study-hub-convos", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("study_hub_conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Persistent file context per conversation
  const { data: convoFiles } = useQuery({
    queryKey: ["study-hub-files", activeConvoId],
    queryFn: async () => {
      if (!activeConvoId) return [];
      const { data } = await supabase
        .from("study_hub_files")
        .select("*")
        .eq("conversation_id", activeConvoId)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!activeConvoId,
  });

  // Load messages on convo change
  useEffect(() => {
    if (!activeConvoId) {
      setMessages([]);
      setPendingAttachments([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("study_hub_messages")
        .select("role, content")
        .eq("conversation_id", activeConvoId)
        .order("created_at", { ascending: true });
      setMessages((data || []).map((m: any) => ({ role: m.role, content: m.content })));
      setPendingAttachments([]);
    })();
  }, [activeConvoId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createConversation = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("study_hub_conversations")
      .insert({ user_id: user.id })
      .select()
      .single();
    if (error) {
      toast.error("Lỗi tạo workspace");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["study-hub-convos", user.id] });
    setActiveConvoId(data.id);
    setMessages([]);
    setPendingAttachments([]);
  };

  const readAsText = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve((r.result as string) || "");
      r.onerror = () => reject(r.error);
      r.readAsText(file);
    });

  const readAsDataURL = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve((r.result as string) || "");
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!user || !activeConvoId) {
        toast.error("Hãy tạo workspace trước.");
        return;
      }
      const arr = Array.from(files);
      setUploading(true);
      const newAtts: Attachment[] = [];

      for (const file of arr) {
        if (file.size > MAX_BYTES) {
          toast.error(`${file.name}: vượt quá 20MB`);
          continue;
        }
        const ext = getExt(file.name);
        toast.message(`File received. Analyzing ${file.name}...`);

        try {
          let att: Attachment | null = null;

          if (IMG_EXT.has(ext)) {
            // Upload to storage + base64 for AI
            const safe = `${slugify(file.name.replace(/\.[^/.]+$/, ""))}-${Date.now()}.${ext}`;
            const path = `${user.id}/${activeConvoId}/${safe}`;
            const { error: upErr } = await supabase.storage
              .from("scriba-files")
              .upload(path, file);
            if (upErr) throw upErr;

            const dataUrl = await readAsDataURL(file);
            att = {
              name: file.name,
              type: "image",
              dataUrl,
              mimeType: file.type || `image/${ext}`,
              storagePath: path,
            };
          } else if (DOC_EXT.has(ext)) {
            // Upload + parse via parse-document
            const safe = `${slugify(file.name.replace(/\.[^/.]+$/, ""))}-${Date.now()}.${ext}`;
            const path = `${user.id}/${activeConvoId}/${safe}`;
            const { error: upErr } = await supabase.storage
              .from("scriba-files")
              .upload(path, file);
            if (upErr) throw upErr;

            const { data, error } = await supabase.functions.invoke("parse-document", {
              body: { filePath: path, conversationId: activeConvoId },
            });
            if (error) throw error;

            att = {
              name: file.name,
              type: "doc",
              content: data?.text || "",
              storagePath: path,
            };
          } else if (TEXT_EXT.has(ext) || file.type.startsWith("text/")) {
            const text = await readAsText(file);
            att = {
              name: file.name,
              type: CODE_EXT.has(ext) ? "code" : "text",
              content: text,
            };
          } else {
            toast.error(`${file.name}: định dạng không hỗ trợ`);
            continue;
          }

          // Persist file metadata
          await supabase.from("study_hub_files").insert({
            conversation_id: activeConvoId,
            user_id: user.id,
            file_name: att.name,
            file_type: att.type,
            content: att.content || null,
            storage_path: att.storagePath || null,
          });

          newAtts.push(att);
        } catch (e: any) {
          toast.error(`${file.name}: ${e.message || "lỗi xử lý"}`);
        }
      }

      if (newAtts.length > 0) {
        setPendingAttachments((prev) => [...prev, ...newAtts]);
        queryClient.invalidateQueries({ queryKey: ["study-hub-files", activeConvoId] });
        toast.success(`Đã thêm ${newAtts.length} file vào workspace.`);
      }
      setUploading(false);
    },
    [user, activeConvoId, queryClient],
  );

  const removePendingAtt = (idx: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const embedNote = async (note: { id: string; title: string; subject: string | null; content: string | null }) => {
    if (!user || !activeConvoId) {
      toast.error("Hãy tạo workspace trước.");
      return;
    }
    const name = `Note: ${note.title}`;
    const body = `# ${note.title}${note.subject ? ` (${note.subject})` : ""}\n\n${note.content || "(trống)"}`;
    const att: Attachment = { name, type: "text", content: body };
    await supabase.from("study_hub_files").insert({
      conversation_id: activeConvoId,
      user_id: user.id,
      file_name: name,
      file_type: "text",
      content: body,
      storage_path: null,
    });
    setPendingAttachments((p) => [...p, att]);
    queryClient.invalidateQueries({ queryKey: ["study-hub-files", activeConvoId] });
    toast.success("Đã embed ghi chú vào workspace.");
    setEmbedOpen(false);
  };

  const embedPlan = async (plan: any) => {
    if (!user || !activeConvoId) {
      toast.error("Hãy tạo workspace trước.");
      return;
    }
    const name = `Plan: ${plan.subject}`;
    const tasksByDay = new Map<number, any[]>();
    (plan.tasks || []).forEach((t: any) => {
      if (!tasksByDay.has(t.day_number)) tasksByDay.set(t.day_number, []);
      tasksByDay.get(t.day_number)!.push(t);
    });
    let body = `# Kế hoạch học: ${plan.subject}\n`;
    body += `**Thời lượng**: ${plan.duration} • **Trạng thái**: ${plan.status}\n\n`;
    body += `| Day | Task | Description | Status |\n|---|---|---|---|\n`;
    [...tasksByDay.keys()].sort((a, b) => a - b).forEach((day) => {
      tasksByDay.get(day)!.forEach((t) => {
        body += `| ${day} | ${t.title} | ${(t.description || "").replace(/\|/g, "\\|").replace(/\n/g, " ")} | ${t.completed ? "✅" : "⏳"} |\n`;
      });
    });
    const att: Attachment = { name, type: "text", content: body };
    await supabase.from("study_hub_files").insert({
      conversation_id: activeConvoId,
      user_id: user.id,
      file_name: name,
      file_type: "text",
      content: body,
      storage_path: null,
    });
    setPendingAttachments((p) => [...p, att]);
    queryClient.invalidateQueries({ queryKey: ["study-hub-files", activeConvoId] });
    toast.success("Đã embed kế hoạch vào workspace.");
    setEmbedOpen(false);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const sendMessage = async () => {
    if ((!input.trim() && pendingAttachments.length === 0) || isStreaming || !user || !activeConvoId)
      return;

    const userText = input.trim() || (pendingAttachments.length > 0 ? "(Đã đính kèm file)" : "");
    const userMsg: Msg = { role: "user", content: userText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    // Build full attachment context: persisted files + pending new ones
    const persistedAtts: Attachment[] = (convoFiles || []).map((f: any) => ({
      name: f.file_name,
      type: f.file_type as FileType,
      content: f.content || undefined,
      // Note: persisted images don't replay base64 — only pending images get vision input
    }));
    // Avoid duplicating pending (just-added) entries that are also in persisted list
    const persistedNames = new Set((convoFiles || []).map((f: any) => f.file_name));
    const justAdded = pendingAttachments.filter((a) => !persistedNames.has(a.name) || a.type === "image");
    const allAttachments = [
      ...persistedAtts.filter((a) => a.type !== "image"),
      ...justAdded,
    ];

    await supabase.from("study_hub_messages").insert({
      conversation_id: activeConvoId,
      user_id: user.id,
      role: "user",
      content: userText,
      attachments: pendingAttachments.map((a) => ({
        name: a.name,
        type: a.type,
        storage_path: a.storagePath || null,
      })),
    });

    if (messages.length === 0) {
      await supabase
        .from("study_hub_conversations")
        .update({
          title: userText.slice(0, 50) || "Workspace mới",
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeConvoId);
      queryClient.invalidateQueries({ queryKey: ["study-hub-convos", user.id] });
    }

    const sentAttachments = pendingAttachments;
    setPendingAttachments([]);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/study-hub-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: newMessages,
          attachments: allAttachments,
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
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m,
                  );
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      if (assistantContent) {
        await supabase.from("study_hub_messages").insert({
          conversation_id: activeConvoId,
          user_id: user.id,
          role: "assistant",
          content: assistantContent,
          attachments: [],
        });
      }
    } catch (e: any) {
      toast.error(e.message || "Lỗi kết nối AI");
      // restore attachments so user can retry
      setPendingAttachments(sentAttachments);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar */}
      <div className="w-64 shrink-0 flex flex-col gap-2">
        <Button
          onClick={createConversation}
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" /> Workspace mới
        </Button>
        <div className="flex-1 overflow-y-auto space-y-1">
          {conversations?.map((c: any) => (
            <button
              key={c.id}
              onClick={() => setActiveConvoId(c.id)}
              className={`w-full text-left px-3 py-2 rounded text-sm truncate transition-colors ${
                activeConvoId === c.id
                  ? "bg-accent/20 text-foreground"
                  : "text-muted-foreground hover:bg-accent/10"
              }`}
            >
              <MessageSquare className="w-3 h-3 inline mr-1.5" />
              {c.title}
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <Card
        className="flex-1 flex flex-col bg-card border-border"
        onDragOver={(e) => {
          if (activeConvoId) e.preventDefault();
        }}
        onDrop={handleDrop}
      >
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {!activeConvoId ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Tạo workspace để bắt đầu</p>
                <p className="text-xs mt-1">Drop files, paste a plan, or share a screenshot.</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Layers className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Drop files, paste a plan, or share a screenshot to start.</p>
                <p className="text-xs mt-2 opacity-70">
                  Hỗ trợ: PDF, DOCX, PPTX, XLSX, code, text, images.
                </p>
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring" as const, stiffness: 400, damping: 28, delay: i * 0.02 }}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm ${
                    m.role === "user"
                      ? "bg-accent/20 text-foreground"
                      : "bg-secondary text-foreground"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-strong:text-foreground prose-code:text-foreground">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    m.content
                  )}
                </div>
              </motion.div>
            ))
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {activeConvoId && (
          <div className="p-3 border-t border-border space-y-2">
            {/* File chips */}
            {pendingAttachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {pendingAttachments.map((a, i) => (
                  <div
                    key={i}
                    className="inline-flex items-center gap-1.5 bg-accent/15 text-foreground text-xs pl-2 pr-1 py-1 rounded"
                  >
                    {fileIcon(a.type)}
                    <span className="max-w-[160px] truncate">{a.name}</span>
                    <button
                      onClick={() => removePendingAtt(i)}
                      className="hover:bg-accent/30 rounded p-0.5"
                      aria-label="remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="shrink-0"
                aria-label="attach"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Paperclip className="w-4 h-4" />
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.docx,.pptx,.xlsx,.doc,.ppt,.xls,.txt,.md,.json,.html,.css,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.go,.rs,.rb,.php,.sh,.sql,.xml,.csv,.log,.png,.jpg,.jpeg,.webp,.gif"
                onChange={(e) => {
                  if (e.target.files) handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Drop files, paste a plan, or ask anything..."
                className="min-h-[44px] max-h-32 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <Button
                onClick={sendMessage}
                disabled={isStreaming || (!input.trim() && pendingAttachments.length === 0)}
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
