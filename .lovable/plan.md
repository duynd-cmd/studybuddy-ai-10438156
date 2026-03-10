

# Phase 2 Implementation Plan

Based on the reference screenshots and the spec, Phase 2 builds all five functional features on top of the existing Phase 1 shell.

## Database Migration

New tables with RLS (users access own data only):

- **study_plans**: id, user_id, subject, duration, created_at, status
- **study_tasks**: id, plan_id, user_id, day_number, title, description, completed, completed_at
- **scriba_conversations**: id, user_id, title, created_at, updated_at
- **scriba_messages**: id, conversation_id, user_id, role (user/assistant), content, created_at
- **notes**: id, user_id, title, subject, content, created_at, updated_at
- **pomodoro_sessions**: id, user_id, subject, started_at, completed_at, duration_minutes, session_type (focus/short_break/long_break)
- **saved_resources**: id, user_id, title, description, url, subject, created_at

## Edge Functions (Lovable AI)

1. **generate-study-plan**: Takes subject + duration + user profile context, returns structured weekly plan with daily tasks via tool calling. Model: `google/gemini-3-flash-preview`.

2. **scriba-chat**: Streaming chat function. System prompt includes user's grade/subjects for personalized academic responses.

3. **search-resources**: Takes a search query + user grade/subjects, returns AI-curated educational resource recommendations with titles, descriptions, URLs, and relevance tags.

4. **ai-notes-tool**: Takes note content + action (summarize/explain/flashcards/quiz), returns processed result.

## Feature Pages

### 1. Dashboard Overview (redesign per screenshot)
- **XP badge** top-right showing level + progress bar
- **4 stat cards**: Phut tap trung, Phien Pomodoro, Do chinh xac, Cau hoi da tra loi (pull from pomodoro_sessions and study_tasks)
- **"Lo trinh hien tai"** section: shows active study plan or empty state with "Tao lo trinh AI" button
- **"Chat luong hoc tap"** donut chart: correct vs incorrect ratio from completed tasks

### 2. Study Plan (`/dashboard/ke-hoach`)
- **Create form** (per screenshot): subject/topic input + duration select (1 Tuan, 2 Tuan, 1 Thang)
- Calls `generate-study-plan` edge function
- Displays plan as Week > Day > Task hierarchy with checkboxes
- Tasks stored in `study_tasks`, completion tracked
- "Tiep tuc hoc" link from overview navigates here

### 3. Scriba Chat (`/dashboard/scriba`)
- **Left panel**: conversation list with + button to create new
- **Right panel**: chat interface with streaming messages
- Conversations and messages persisted to DB
- Uses `scriba-chat` edge function with SSE streaming

### 4. Resources (`/dashboard/tai-nguyen`)
- **Tabs**: "Tim kiem moi" and "Da luu (count)"
- Search bar calls `search-resources` edge function
- Results displayed as cards; save button persists to `saved_resources`
- "Da luu" tab shows saved resources

### 5. Notes (`/dashboard/ghi-chu`)
- List/grid of notes with create/edit/delete
- Rich textarea editor per note
- AI toolbar: Summarize, Explain, Flashcards, Quiz buttons calling `ai-notes-tool`
- Organize by subject

### 6. Pomodoro (`/dashboard/pomodoro`)
- Circular timer: 25min focus, 5min short break, 15min long break after 4 sessions
- Subject selector before starting
- Auto-switch between focus/break
- `beforeunload` warning during focus
- Session logging to `pomodoro_sessions`
- Today's session history below timer

## Implementation Order

1. Database migration (all tables at once)
2. Dashboard Overview redesign
3. Pomodoro timer (standalone, no AI dependency)
4. Study Plan with AI generation
5. Scriba Chat with streaming
6. Resources with AI search
7. Notes with AI tools

## Technical Notes

- All edge functions use `LOVABLE_API_KEY` (already available)
- Streaming for Scriba follows the SSE pattern from Lovable AI docs
- Non-streaming `supabase.functions.invoke()` for study plan generation, resources, and notes tools
- RLS on all tables: `auth.uid() = user_id`
- Realtime not needed for Phase 2 features

