import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatedSection } from "@/components/AnimatedSection";
import { Plus, Trash2, Sparkles, BookOpen, HelpCircle, Layers, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export default function NotesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [subject, setSubject] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const { data: notes } = useQuery({
    queryKey: ["notes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const createNote = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("notes")
      .insert({ user_id: user.id })
      .select()
      .single();
    if (error) { toast.error("Lỗi tạo ghi chú"); return; }
    queryClient.invalidateQueries({ queryKey: ["notes", user.id] });
    openNote(data);
  };

  const openNote = (note: any) => {
    setActiveNoteId(note.id);
    setTitle(note.title);
    setContent(note.content || "");
    setSubject(note.subject || "");
    setAiResult("");
  };

  const saveNote = async () => {
    if (!activeNoteId || !user) return;
    await supabase.from("notes").update({
      title, content, subject: subject || null,
      updated_at: new Date().toISOString(),
    }).eq("id", activeNoteId);
    queryClient.invalidateQueries({ queryKey: ["notes", user.id] });
    toast.success("Đã lưu");
  };

  const deleteNote = async (id: string) => {
    await supabase.from("notes").delete().eq("id", id);
    if (activeNoteId === id) { setActiveNoteId(null); }
    queryClient.invalidateQueries({ queryKey: ["notes", user?.id] });
    toast.success("Đã xóa");
  };

  const runAiTool = async (action: string) => {
    if (!content.trim()) { toast.error("Ghi chú trống"); return; }
    setAiLoading(true);
    setAiResult("");
    try {
      const { data, error } = await supabase.functions.invoke("ai-notes-tool", {
        body: { content, action },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiResult(data.result || "");
    } catch (e: any) {
      toast.error(e.message || "Lỗi AI");
    } finally {
      setAiLoading(false);
    }
  };

  const aiTools = [
    { action: "summarize", label: "Tóm tắt", icon: Sparkles },
    { action: "explain", label: "Giải thích", icon: BookOpen },
    { action: "flashcards", label: "Flashcards", icon: Layers },
    { action: "quiz", label: "Quiz", icon: HelpCircle },
  ];

  if (activeNoteId) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => { saveNote(); setActiveNoteId(null); }}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tiêu đề"
              className="font-heading font-bold text-lg"
            />
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Môn học"
              className="text-sm"
            />
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nội dung ghi chú..."
              className="min-h-[300px] resize-none"
            />
            <div className="flex gap-2 flex-wrap">
              {aiTools.map((tool) => (
                <Button
                  key={tool.action}
                  variant="outline"
                  size="sm"
                  onClick={() => runAiTool(tool.action)}
                  disabled={aiLoading}
                >
                  <tool.icon className="w-3.5 h-3.5 mr-1" />
                  {tool.label}
                </Button>
              ))}
            </div>
            <Button onClick={saveNote} className="bg-accent text-accent-foreground hover:bg-accent/90">
              Lưu ghi chú
            </Button>
          </div>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-heading">Kết quả AI</CardTitle>
            </CardHeader>
            <CardContent>
              {aiLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : aiResult ? (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{aiResult}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-12">
                  Sử dụng các công cụ AI bên trái để phân tích ghi chú
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatedSection>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-heading font-bold text-foreground">Ghi chú</h1>
          <Button onClick={createNote} className="bg-accent text-accent-foreground hover:bg-accent/90" size="sm">
            <Plus className="w-4 h-4 mr-1" /> Tạo mới
          </Button>
        </div>
      </AnimatedSection>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {notes?.map((note: any, i: number) => (
          <AnimatedSection key={note.id} delay={i * 0.05}>
            <Card className="bg-card border-border cursor-pointer hover:shadow-md transition-shadow" onClick={() => openNote(note)}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-foreground text-sm truncate">{note.title}</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-6 w-6"
                    onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                {note.subject && (
                  <span className="text-xs bg-accent/20 text-accent-foreground px-2 py-0.5 rounded">{note.subject}</span>
                )}
                <p className="text-xs text-muted-foreground line-clamp-3">{note.content || "Trống"}</p>
              </CardContent>
            </Card>
          </AnimatedSection>
        ))}
      </div>

      {(!notes || notes.length === 0) && (
        <AnimatedSection delay={0.1}>
          <div className="text-center py-12 text-muted-foreground">
            <Plus className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Tạo ghi chú đầu tiên!</p>
          </div>
        </AnimatedSection>
      )}
    </div>
  );
}
