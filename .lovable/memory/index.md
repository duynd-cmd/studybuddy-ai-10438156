# Memory: index.md
Updated: now

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

## Routes
- `/` Landing page
- `/dang-nhap` Sign in
- `/dang-ky` Sign up
- `/onboarding` 3-step mandatory onboarding
- `/dashboard` Protected dashboard with sidebar
- `/dashboard/ke-hoach` Study Plan (AI generation)
- `/dashboard/tai-nguyen` Resources (AI search)
- `/dashboard/scriba` Scriba Chat (streaming)
- `/dashboard/ghi-chu` Notes (AI tools)
- `/dashboard/pomodoro` Pomodoro timer

## Database Tables
- `profiles`: user_id, grade, subjects[], goal, onboarding_completed
- `study_plans`: user_id, subject, duration, status
- `study_tasks`: plan_id, user_id, day_number, title, description, completed
- `scriba_conversations`: user_id, title
- `scriba_messages`: conversation_id, user_id, role, content
- `notes`: user_id, title, subject, content
- `pomodoro_sessions`: user_id, subject, duration_minutes, session_type
- `saved_resources`: user_id, title, description, url, subject

## Edge Functions
- `generate-study-plan`: tool-calling, gemini-3-flash-preview
- `scriba-chat`: streaming SSE, gemini-3-flash-preview
- `search-resources`: tool-calling, gemini-3-flash-preview
- `ai-notes-tool`: non-streaming, gemini-3-flash-preview
