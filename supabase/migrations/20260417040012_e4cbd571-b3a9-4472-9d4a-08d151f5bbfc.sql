-- Study Hub conversations
CREATE TABLE public.study_hub_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Workspace mới',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.study_hub_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own study_hub_conversations"
ON public.study_hub_conversations
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_study_hub_conversations_updated_at
BEFORE UPDATE ON public.study_hub_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Study Hub messages
CREATE TABLE public.study_hub_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.study_hub_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.study_hub_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own study_hub_messages"
ON public.study_hub_messages
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_study_hub_messages_conversation ON public.study_hub_messages(conversation_id, created_at);

-- Study Hub files (workspace memory)
CREATE TABLE public.study_hub_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.study_hub_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  content TEXT,
  storage_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.study_hub_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own study_hub_files"
ON public.study_hub_files
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_study_hub_files_conversation ON public.study_hub_files(conversation_id);