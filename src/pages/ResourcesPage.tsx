import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatedSection } from "@/components/AnimatedSection";
import { Search, Loader2, Bookmark, BookmarkCheck, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Resource {
  title: string;
  description: string;
  url?: string;
  subject: string;
}

export default function ResourcesPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Resource[]>([]);

  const { data: savedResources } = useQuery({
    queryKey: ["saved-resources", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("saved_resources")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const searchResources = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-resources", {
        body: { query, grade: profile?.grade, subjects: profile?.subjects },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResults(data.resources || []);
    } catch (e: any) {
      toast.error(e.message || "Lỗi tìm kiếm");
    } finally {
      setSearching(false);
    }
  };

  const saveResource = async (r: Resource) => {
    if (!user) return;
    await supabase.from("saved_resources").insert({
      user_id: user.id,
      title: r.title,
      description: r.description,
      url: r.url || null,
      subject: r.subject,
    });
    queryClient.invalidateQueries({ queryKey: ["saved-resources", user.id] });
    toast.success("Đã lưu tài nguyên");
  };

  const deleteResource = async (id: string) => {
    await supabase.from("saved_resources").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["saved-resources", user?.id] });
    toast.success("Đã xóa");
  };

  const ResourceCard = ({ r, saved, onAction }: { r: any; saved?: boolean; onAction: () => void }) => (
    <Card className="bg-card border-border">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-foreground text-sm">{r.title}</h3>
          <Button variant="ghost" size="icon" onClick={onAction} className="shrink-0">
            {saved ? <BookmarkCheck className="w-4 h-4 text-accent" /> : <Bookmark className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{r.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs bg-accent/20 text-accent-foreground px-2 py-0.5 rounded">{r.subject}</span>
          {r.url && (
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-foreground flex items-center gap-1 hover:underline">
              Mở <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <AnimatedSection>
        <h1 className="text-2xl font-heading font-bold text-foreground">Tài nguyên</h1>
      </AnimatedSection>

      <Tabs defaultValue="search">
        <TabsList>
          <TabsTrigger value="search">Tìm kiếm mới</TabsTrigger>
          <TabsTrigger value="saved">Đã lưu ({savedResources?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4 mt-4">
          <div className="flex gap-2">
            <Input
              placeholder="Tìm tài nguyên học tập..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchResources()}
            />
            <Button onClick={searchResources} disabled={searching} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((r, i) => (
              <AnimatedSection key={i} delay={i * 0.05}>
                <ResourceCard r={r} onAction={() => saveResource(r)} />
              </AnimatedSection>
            ))}
          </div>

          {results.length === 0 && !searching && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nhập từ khóa để tìm tài nguyên</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedResources?.map((r: any) => (
              <ResourceCard key={r.id} r={r} saved onAction={() => deleteResource(r.id)} />
            ))}
          </div>
          {(!savedResources || savedResources.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">
              <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Chưa có tài nguyên nào được lưu</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
