
# AI-Mentor Platform — Phase 1 Implementation Plan

## Overview
Build the foundational layer of AI-Mentor: a Vietnamese academic platform with landing page, authentication, onboarding, and dashboard shell using Lovable Cloud.

## Design System Setup
- Custom color tokens: Background `#EFE9D5`, Accent `#C1FF72`, Text `#536471`
- Fonts: Lexend for headings, Inter for body
- 4px spacing unit, 4px border radius
- Micro-interactions: hover scale, lift effects, entrance animations with IntersectionObserver
- Accessibility: 3px focus outlines with accent glow, keyboard navigation, semantic HTML

## 1. Landing Page
- **Hero Section**: Full-width with Vietnamese headline, "Đăng ký" and "Đăng nhập" CTAs, plus "Bắt đầu học ngay" secondary action
- **Feature Grid**: 3-column layout showcasing core platform features (Study Plans, AI Assistant, Pomodoro, etc.)
- **Testimonial Carousel**: Student/educator quotes with names and grades
- **Sticky CTA Bar**: Fixed bar visible on scroll encouraging sign-up

## 2. Authentication (Lovable Cloud)
- **Sign Up**: Email + password registration
- **Sign In**: Email + password with session management
- **Logout**: Clear session, redirect to landing
- **Protected Routes**: Redirect unauthenticated users to sign-in
- **Database**: Profiles table + onboarding data storage (grade, subjects, goal)

## 3. Onboarding Flow (3-Step, Mandatory)
After first login, users with no profile data are redirected here. Cannot be skipped.

- **Step 1 — Grade Level**: 2-column grid of selectable cards (Lớp 1–12 + Đại học), single selection, accent highlight
- **Step 2 — Subjects**: Free-text textarea for comma-separated subjects
- **Step 3 — Study Goal**: Free-text textarea for goals
- Progress bar at top (33% → 66% → 100%), icons per step, Back/Continue navigation
- On completion, store grade/subjects/goal to user profile and redirect to dashboard

## 4. Dashboard Shell
- **Left Sidebar** with navigation: Tổng quan, Kế hoạch học tập, Tài nguyên, Scriba, Ghi chú, Pomodoro
- Active route highlighting, collapsible sidebar with icons
- **Main Content Area**: Card-based layout, placeholder content per section
- Clean, structured layout ready for Phase 2 features

## What's Included in Phase 1
✅ Landing page with full design system  
✅ Auth (signup, login, logout, protected routes)  
✅ 3-step onboarding with data persistence  
✅ Dashboard layout with sidebar navigation  
✅ Micro-interactions & animations  
✅ Responsive design  

## What's Deferred to Phase 2+
- Study Plan generation (AI-powered)
- Scriba (PDF upload & Q&A)
- Notes with AI tools
- Pomodoro timer
- Resources feature
- Adaptive difficulty & performance tracking
