

## Goal
Build a new **Study Hub** feature — a multi-modal workspace where students upload files/images/plans and the AI processes them into actionable learning steps following the "Study Hub Engine" persona.

## Approach
Create a NEW page/route separate from existing Scriba (which stays as single-file mentor). Study Hub = multi-file + image + plan parsing + recursive hint protocol.

## What to Build

### 1. New Route & Page
- Route: `/dashboard/study-hub` → new page `src/pages/StudyHubPage.tsx`
- Sidebar entry: "Study Hub" added to `AppSidebar.tsx`

### 2. New Edge Function: `study-hub-chat`
- Streaming SSE (same pattern as `scriba-chat`)
- Model: `google/gemini-3-flash-preview` (multimodal)
- Accepts: `messages`, `attachments[]` (text files inline + image data URLs)
- System prompt embeds the full **Study Hub Engine** persona:
  - Multi-modal acknowledgement ("File received. Analyzing...")
  - Plan parsing → markdown timeline table
  - Image logic scan
  - **Recursive Hint Protocol** (3-attempt: Conceptual → Structural → Solution + Post-Mortem)
  - Anti-hallucination: only MDN / W3Schools / react.dev / web.dev, else `[Google Search: ...]` fallback
  - Tone: direct, dry, technical; tables/code blocks/bold

### 3. Multi-Modal File Handling (client-side)
- **Text files** (.txt, .md, .js, .ts, .tsx, .py, .html, .css, .json) → read as text inline, included in `attachments`
- **Images** (.png, .jpg, .webp) → base64 data URL, sent to Gemini as `image_url` content part
- **Documents** (.pdf, .docx, .pptx, .xlsx) → reuse existing `parse-document` function → text inline
- File chips above input with type icons + remove button
- Upload toast: "File received. Analyzing..."

### 4. Database
New tables (migration required):
- `study_hub_conversations`: `id, user_id, title, created_at, updated_at`
- `study_hub_messages`: `id, conversation_id, user_id, role, content, attachments(jsonb), created_at`
- `study_hub_files`: `id, conversation_id, user_id, file_name, file_type, content(text), storage_path, created_at`
- RLS: owner-only (`auth.uid() = user_id`)
- Images stored in existing `scriba-files` bucket (rename mentally to "workspace files" — same bucket works)

### 5. UI (`StudyHubPage.tsx`)
- Left: conversation list (like Scriba)
- Right: chat with markdown rendering (`react-markdown` — already in project)
- Bottom: textarea + "Attach" button (multi-select, mixed types) + send
- File chips row above textarea with icons (📄 doc, 🖼 image, 💻 code)
- Streaming token-by-token rendering (reuse Scriba's SSE parsing logic)
- Empty state: "Drop files, paste a plan, or share a screenshot to start."

### 6. Edge Function Config
- Add `[functions.study-hub-chat]` block to `supabase/config.toml` with `verify_jwt = false`

## Files Created/Modified
- **New**: `src/pages/StudyHubPage.tsx`
- **New**: `supabase/functions/study-hub-chat/index.ts`
- **New migration**: `study_hub_conversations`, `study_hub_messages`, `study_hub_files` + RLS
- **Modified**: `src/App.tsx` (route), `src/components/AppSidebar.tsx` (nav entry), `supabase/config.toml`

## Out of Scope (intentionally)
- Not modifying existing Scriba page (stays as single-file mentor for backward compatibility)
- No video/audio support yet
- No persistent "plan tracking" — plans render as markdown timelines in chat (can be added later)

