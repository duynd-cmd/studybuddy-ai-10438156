

## Goal
Rebuild the UI with a 2026 high-end aesthetic — **Glass-Bento layouts** + **Cinematic Motion** — while keeping the existing color palette (warm cream `#EFE9D5`, slate `#536471`, electric lime `#C1FF72`).

## Color Direction (preserved)
Keep current tokens. Adapt "mesh gradient" idea to brand: animated blobs blending **cream → muted slate → lime accent glow** (no navy/violet — those clash with current brand).

## What to Build

### 1. Foundation — Design Primitives
**New file: `src/components/ui/glass-card.tsx`**
- Frosted-glass card: `bg-card/40 backdrop-blur-xl` + 1px gradient border-glow (`border-white/20` + inner ring using `shadow-[inset_0_1px_0_0_hsl(var(--accent)/0.2)]`)
- Variants: `default`, `elevated`, `interactive` (with tilt)

**New file: `src/components/ui/mesh-gradient.tsx`**
- Fixed full-viewport background. 3 animated SVG/CSS blobs (cream, slate-tint, accent-lime glow) with `@keyframes blob-drift` (60–90s loops)
- Mounted once in `Dashboard.tsx` behind content

**Extend `tailwind.config.ts`**
- Add keyframes: `blob-drift`, `liquid-wave`, `particle-burst`, `stagger-reveal`
- Add utilities: `.glass`, `.border-glow`, `.magnetic` (hook-driven)

### 2. Motion Components
**New: `src/components/motion/MagneticButton.tsx`**
- Wraps `Button`. Uses `useMotionValue` + `useSpring` (Framer). On `mousemove` within radius, button translates ~8px toward cursor, snaps back on leave. Spring stiffness 150, damping 15.

**New: `src/components/motion/TiltCard.tsx`**
- 3D tilt using `rotateX/rotateY` based on cursor position (max ±8°)
- Glare overlay: radial gradient that follows cursor (`mix-blend-overlay`)
- Wraps any child (used for lesson/dashboard cards)

**New: `src/components/motion/StaggerReveal.tsx`**
- `motion.div` parent with `variants` + `staggerChildren: 0.08`
- Children fade + slide up (y: 24 → 0) on `whileInView`
- Drop-in replacement for `AnimatedSection`

**New: `src/components/motion/ParticleBurst.tsx`**
- Imperative trigger: `<ParticleBurst trigger={count} />` or `useParticleBurst()` hook
- 20–30 particles using Framer Motion, lime/cream colored, physics-based spread + fade
- Used on quiz complete + streak milestones

**New: `src/components/motion/LiquidProgress.tsx`**
- Circular SVG (e.g., 120×120) with animated wave clip-path filling from bottom
- Wave SVG path animates horizontally (`<animate>` or Framer keyframes)
- Center shows `%` text. Replaces `Progress` in dashboard hero stats.

**New: `src/components/motion/FlipCard.tsx`**
- Front (concept) / Back (quick-check) using `rotateY` 180° on click or hover
- `transformStyle: preserve-3d`, backface hidden
- Used for lesson cards on `StudyPlanPage` / `DashboardOverview`

### 3. Layout Morphing (Page Transitions)
- Update `Dashboard.tsx`: keep `AnimatePresence`, switch to `mode="wait"` + add `layoutId` support
- Lesson cards get `layoutId={`lesson-${id}`}` — clicking morphs the card into the detail view (uses Framer's shared layout)
- Detail page wraps content in matching `motion.div layoutId=...`

### 4. Bento Dashboard Refactor
**Modify: `src/pages/DashboardOverview.tsx`**
- Replace current grid with **Bento layout**:
  ```text
  ┌──────────────┬─────────┐
  │  Hero Stats  │ Streak  │  (col-span-2 | col-span-1)
  │  (Liquid %)  │ (burst) │
  ├──────┬───────┴─────────┤
  │ Plan │  Recent Notes   │
  │ Card │  (FlipCards)    │
  ├──────┴────────┬────────┤
  │ Quick Actions │ Pomod. │
  └───────────────┴────────┘
  ```
- All cards use `GlassCard` + `TiltCard` wrapper
- Stats use `LiquidProgress`
- Quick actions use `MagneticButton`
- Whole grid wrapped in `StaggerReveal`

### 5. Apply Across App (lighter touch)
- `AppSidebar.tsx`: glass background (`bg-sidebar/60 backdrop-blur-xl`), border-glow on active item, subtle magnetic hover on nav items
- `StudyPlanPage.tsx`: lesson list → `FlipCard` grid + `TiltCard`; on task complete → `ParticleBurst`
- `ScribaPage.tsx` / `StudyHubPage.tsx`: chat panels become glass cards over mesh background
- `PomodoroPage.tsx`: replace timer ring with `LiquidProgress`; on cycle complete → `ParticleBurst`
- `NotesPage.tsx`: note cards glassified + tilt
- Page transitions in `Dashboard.tsx`: spring-based (stiffness 280, damping 30) for "snappy" feel

### 6. Performance Guards
- Mesh gradient: CSS-only (no JS animation loop), `will-change: transform`
- Tilt + magnetic: `prefers-reduced-motion` respected → disable transforms
- Particle bursts capped at 30 particles, auto-cleanup after 1.2s
- All blur layers use `backdrop-filter` (GPU); fallback `bg-card/80` for unsupported browsers

## Files Created/Modified
**New (10):**
- `src/components/ui/glass-card.tsx`
- `src/components/ui/mesh-gradient.tsx`
- `src/components/motion/MagneticButton.tsx`
- `src/components/motion/TiltCard.tsx`
- `src/components/motion/StaggerReveal.tsx`
- `src/components/motion/ParticleBurst.tsx`
- `src/components/motion/LiquidProgress.tsx`
- `src/components/motion/FlipCard.tsx`
- `src/hooks/useMagnetic.tsx`
- `src/hooks/useReducedMotion.tsx`

**Modified (8):**
- `tailwind.config.ts` (keyframes, utilities)
- `src/index.css` (glass utility classes, mesh anims)
- `src/pages/Dashboard.tsx` (mesh bg, layout morphing setup)
- `src/pages/DashboardOverview.tsx` (Bento refactor)
- `src/pages/StudyPlanPage.tsx` (flip cards + bursts)
- `src/pages/PomodoroPage.tsx` (liquid loader + bursts)
- `src/components/AppSidebar.tsx` (glass styling)
- `src/components/AnimatedSection.tsx` (extend with stagger variant)

## Out of Scope
- No color palette change (per your instruction — keep cream/slate/lime)
- No navy/violet mesh (replaced with brand-aligned mesh)
- Existing chat/AI logic untouched — only visual shell changes
- No new dependencies (Framer Motion already installed; pure CSS for gradients/blur)

