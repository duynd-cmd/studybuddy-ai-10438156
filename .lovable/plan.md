

# Animation & Motion Enhancement Plan

## Overview
Add polished animations across the entire app using framer-motion (already installed) and CSS transforms/opacity only. No business logic changes.

## 1. Page Transitions (Dashboard routes)

Wrap the `<Outlet />` in `Dashboard.tsx` with `AnimatePresence` + a `motion.div` keyed by `location.pathname`. This gives every dashboard sub-page a smooth fade+slide transition.

- **`Dashboard.tsx`**: Import `useLocation`, `AnimatePresence`, `motion`. Wrap `<Outlet />` with keyed motion wrapper using `opacity + translateY(12px)` enter/exit with spring physics.

## 2. Auth/Landing Page Entrance Animations

- **`SignIn.tsx` / `SignUp.tsx`**: Wrap the Card in `motion.div` with `initial={{ opacity: 0, scale: 0.96 }}` → `animate={{ opacity: 1, scale: 1 }}` using a spring transition (`stiffness: 300, damping: 30`).

## 3. Sidebar Micro-interactions

- **`AppSidebar.tsx`**: Wrap each `SidebarMenuItem` in `motion.div` with staggered entrance (`delay: index * 0.04`). Add `whileHover={{ x: 4 }}` and `whileTap={{ scale: 0.97 }}` to nav links. Add layout animation to the active indicator.

## 4. Button & Card Micro-interactions (Global)

- **`button.tsx`**: Add CSS `transition: transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1)` and `active:scale-[0.97]` to the base CVA class.
- **`card.tsx`**: Add `transition: transform 200ms cubic-bezier(0.33, 1, 0.68, 1), box-shadow 200ms` to the Card base class for smooth hover lift everywhere cards are hovered.

## 5. Input Focus Micro-interactions

- **`input.tsx` / `textarea.tsx`**: Add `transition-shadow duration-200` with a subtle `focus:shadow-[0_0_0_3px_hsl(var(--accent)/0.15)]` for a smooth glow-in on focus.

## 6. Testimonial Carousel (Landing)

- **`Index.tsx`**: Wrap testimonial content in `AnimatePresence mode="wait"` keyed by `currentTestimonial`. Entry: `opacity: 0, x: 30` → `1, 0`. Exit: `opacity: 0, x: -30`. Spring easing.

## 7. Dialog/Modal Entrance

- Already handled by Radix's built-in animations, but enhance by adding to `dialog.tsx`'s `DialogContent`: `data-[state=open]:animate-in data-[state=open]:zoom-in-[0.96]` with a custom spring-feel duration.

## 8. Pomodoro Timer Ring

- **`PomodoroPage.tsx`**: Change the SVG circle `transition-all duration-1000` to a spring-based CSS transition: `transition: stroke-dashoffset 1s cubic-bezier(0.33, 1, 0.68, 1)`.

## 9. Flashcard Flip (StudyPlanPage)

- Replace the basic card swap with a CSS 3D flip using `transform: rotateY(180deg)` with `perspective(600px)` and `backface-visibility: hidden`. Pure `transform` + `opacity` — no layout shifts.

## 10. Chat Messages (Scriba)

- **`ScribaPage.tsx`**: Wrap each message bubble in `motion.div` with `initial={{ opacity: 0, y: 8, scale: 0.98 }}` → `animate={{ opacity: 1, y: 0, scale: 1 }}` using spring physics.

## 11. Stagger Lists

- Notes grid, resources grid, study tasks, and pomodoro history items get stagger animations via `motion.div` with `transition={{ delay: index * 0.03 }}`.

## Performance Guarantees
- Only `transform` and `opacity` are animated (GPU-composited)
- All spring configs use `type: "spring", stiffness: 400, damping: 28` (snappy, no bounce)
- `will-change: transform` applied via Tailwind where needed
- No `width`, `height`, or `margin` animations

## Files Modified
- `src/pages/Dashboard.tsx` — page transitions
- `src/pages/SignIn.tsx`, `SignUp.tsx` — entrance animation
- `src/pages/Index.tsx` — testimonial AnimatePresence
- `src/pages/ScribaPage.tsx` — message bubbles
- `src/pages/StudyPlanPage.tsx` — flashcard 3D flip
- `src/pages/PomodoroPage.tsx` — timer ring easing
- `src/pages/NotesPage.tsx`, `ResourcesPage.tsx` — stagger lists  
- `src/components/AppSidebar.tsx` — nav micro-interactions
- `src/components/ui/button.tsx` — global tap scale
- `src/components/ui/card.tsx` — hover transition base
- `src/components/ui/input.tsx` — focus glow transition

