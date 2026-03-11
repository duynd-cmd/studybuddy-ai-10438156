

# Phase 2 Enhancements Plan

Three changes requested: (1) sidebar redesign, (2) task review questions + plan flashcards, (3) Scriba file-first flow.

## 1. Sidebar Redesign (per screenshot)

Redesign `AppSidebar.tsx` to match the uploaded reference:
- **Top**: AI Mentor logo/icon + "AI Mentor" text
- **User card**: Avatar initial, "Xin chào, [name]", grade badge below
- **Section label**: "CÔNG CỤ HỌC TẬP"
- **Nav items** (renamed):
  - Tổng quan (Home icon)
  - Lộ trình (Book icon) — was "Kế hoạch học tập"
  - Tài liệu (Search icon) — was "Tài nguyên"
  - Scriba AI (Brain/globe icon) — was "Scriba"
  - Đồng hồ (Clock icon) — was "Pomodoro"
  - Ghi chú (File icon)
- **Active item**: Dark border pill with accent background
- **Footer**: "Đăng xuất" with arrow icon
- Fetch user profile (name from email, grade) to show in the user card

## 2. Task Review Questions + Plan Flashcards

### 2a. Review Questions on Task Completion
When a user checks a task complete in `StudyPlanPage.tsx`:
- Show a dialog/modal with exactly 2 AI-generated review questions related to the task
- Create new edge function `review-task` that takes task title + description + user profile, returns 2 questions (multiple choice or short answer)
- User answers questions; answers are shown as correct/incorrect
- Store results in a new `task_reviews` table: `id, task_id, user_id, questions (jsonb), answers (jsonb), score, created_at`
- Task only marked complete after answering (or user can skip)

### 2b. Flashcards After Plan Completion
When ALL tasks in a plan are completed:
- Show a "Tạo Flashcards" button on the plan card
- Create new edge function `generate-flashcards` that takes all task titles/descriptions from the plan, returns flashcard pairs (front/back)
- Store in new `flashcards` table: `id, plan_id, user_id, front, back, created_at`
- Display as flip-able cards UI (click to reveal back)

### Database Migration
```sql
CREATE TABLE task_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES study_tasks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  questions jsonb NOT NULL DEFAULT '[]',
  answers jsonb DEFAULT '[]',
  score integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE task_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own task_reviews" ON task_reviews FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES study_plans(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  front text NOT NULL,
  back text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own flashcards" ON flashcards FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### Edge Functions
- **`review-task`**: Non-streaming, tool-calling. Takes task title/description, returns exactly 2 questions with correct answers.
- **`generate-flashcards`**: Non-streaming, tool-calling. Takes all task data from a plan, returns array of {front, back} pairs.

## 3. Scriba File-First Flow

Modify `ScribaPage.tsx` so when a new conversation is created:
- Show a file upload prompt instead of the chat input: "Tải lên tài liệu để bắt đầu" with a drag-and-drop area
- Accept PDF, DOCX, PPTX, XLSX files (1 file per chat)
- Upload file to Lovable Cloud storage (create `scriba-files` bucket)
- Create edge function `parse-document` that extracts text from the uploaded file
- Store extracted text in `scriba_conversations` (add `file_name` and `file_content` text columns)
- After upload + parsing, inject file content into the system prompt for all subsequent messages in that conversation
- Update `scriba-chat` edge function to accept optional `fileContent` parameter and include it in system prompt
- Chat input only appears after file is uploaded

### Database Changes
```sql
ALTER TABLE scriba_conversations ADD COLUMN file_name text;
ALTER TABLE scriba_conversations ADD COLUMN file_content text;
```

### Storage
- Create `scriba-files` bucket with RLS (users access own files)

### Edge Function: `parse-document`
- Receives file from storage, extracts text
- For PDF: use a Deno PDF parsing library
- For DOCX/PPTX/XLSX: extract text content
- Returns extracted text to store on the conversation

## Implementation Order
1. Database migration (task_reviews, flashcards, scriba_conversations columns)
2. Storage bucket setup
3. Sidebar redesign
4. Task review questions (edge function + UI dialog)
5. Plan flashcards (edge function + UI)
6. Scriba file-first flow (upload UI + parse-document edge function + scriba-chat update)

## Files to Create/Modify
- **Create**: `supabase/functions/review-task/index.ts`, `supabase/functions/generate-flashcards/index.ts`, `supabase/functions/parse-document/index.ts`
- **Modify**: `src/components/AppSidebar.tsx` (full redesign), `src/pages/StudyPlanPage.tsx` (review dialog + flashcards), `src/pages/ScribaPage.tsx` (file upload flow), `supabase/functions/scriba-chat/index.ts` (accept file content), `supabase/config.toml` (new functions)

