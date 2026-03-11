AI-Mentor design system, routes, database schema, and edge functions reference.

# AI-Mentor Design System

- **Background**: #EFE9D5 (HSL: 39 38% 91%)
- **Accent**: #C1FF72 (HSL: 88 100% 72%)
- **Text**: #536471 (HSL: 206 22% 33%)
- **Heading font**: Lexend
- **Body font**: Inter (fallback: Roboto)
- **H1**: 48px, H2: 30px, Body: 18px
- **Spacing unit**: 4px (use 1u-12u tokens)
- **Border radius**: 4px (--radius: 0.25rem)
- **Language**: Vietnamese (vi)
- **Curriculum**: MOET 2018, Lớp 1–12

## Sidebar Nav Items
- Tổng quan, Lộ trình, Tài liệu, Scriba AI, Đồng hồ, Ghi chú
- Active: bg-foreground text-primary-foreground pill
- User card with avatar initial + grade badge

## Routes
- `/` Landing, `/dang-nhap` Sign in, `/dang-ky` Sign up, `/onboarding`
- `/dashboard` Overview, `/dashboard/ke-hoach` Study Plan
- `/dashboard/tai-nguyen` Resources, `/dashboard/scriba` Scriba AI
- `/dashboard/ghi-chu` Notes, `/dashboard/pomodoro` Pomodoro

## Database Tables
- `profiles`: user_id, grade, subjects[], goal, onboarding_completed
- `study_plans`: user_id, subject, duration, status
- `study_tasks`: plan_id, user_id, day_number, title, description, completed
- `task_reviews`: task_id, user_id, questions(jsonb), answers(jsonb), score
- `flashcards`: plan_id, user_id, front, back
- `scriba_conversations`: user_id, title, file_name, file_content
- `scriba_messages`: conversation_id, user_id, role, content
- `notes`: user_id, title, subject, content
- `pomodoro_sessions`: user_id, subject, duration_minutes, session_type
- `saved_resources`: user_id, title, description, url, subject

## Storage
- `scriba-files`: private bucket for uploaded documents

## Edge Functions
- `generate-study-plan`: tool-calling, gemini-3-flash-preview
- `scriba-chat`: streaming SSE, gemini-3-flash-preview, accepts fileContent
- `search-resources`: tool-calling, gemini-3-flash-preview
- `ai-notes-tool`: non-streaming, gemini-3-flash-preview
- `review-task`: 2 MCQ questions per task, gemini-3-flash-preview
- `generate-flashcards`: plan flashcards, gemini-3-flash-preview
- `parse-document`: uses gemini-2.5-flash to extract text from uploaded files

## Key Behaviors
- Task completion triggers 2-question AI review dialog (can skip)
- Plan completion unlocks flashcards generation
- Scriba requires file upload before chat begins (1 file per conversation)
