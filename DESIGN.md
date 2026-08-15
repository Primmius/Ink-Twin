# Design System

<!-- impeccable:design-schema 1 -->

## Visual World & Metaphor

**"Swiss Technical Ink Lab"** — A fusion of clean, high-precision Swiss typographic clarity and tactile, organic ink craft. The digital environment feels like a modern studio tool: crisp micro-borders, tactile card surfaces, high-contrast typography, and vibrant electric-ink accent strokes that celebrate the human quality of handwriting.

## Color Palette

### Primary & Brand
- **Accent Ink Green**: `#00E55B` (Light mode text/accents), `#00FF66` (Dark mode vibrant ink pop)
- **Ink Green Deep**: `#008F37` (Accessible high-contrast text on bright backgrounds)
- **Accent Warning Yellow**: `#FFC700`
- **Accent Coral Red**: `#FF453A`
- **Accent Studio Blue**: `#2563EB`
- **Accent Purple**: `#9333EA`

### Dark Mode (Studio Carbon)
- Background Base: `#0B0C0E`
- Surface Layer 1 (Cards, Bars): `#13151A`
- Surface Layer 2 (Elevated, Sheets): `#1A1D24`
- Surface Layer 3 (Inputs, Chips): `#222630`
- Border Subtle: `#272B35`
- Border Prominent: `#373D4B`
- Text Primary: `#F3F4F6`
- Text Secondary: `#9CA3AF`
- Text Muted: `#6B7280`

### Light Mode (Gallery White / Swiss Substrate)
- Background Base: `#F8F9FA`
- Surface Layer 1: `#FFFFFF`
- Surface Layer 2: `#F3F4F6`
- Surface Layer 3: `#E5E7EB`
- Border Subtle: `#E5E7EB`
- Border Prominent: `#111827`
- Text Primary: `#111827`
- Text Secondary: `#4B5563`
- Text Muted: `#6B7280`

## Typography

- **Display**: `'Space Grotesk'`, system sans-serif (`font-display`) — tight tracking (`-0.03em`), confident weight (600–700).
- **Body**: `'Plus Jakarta Sans'`, system-ui, sans-serif (`font-body`) — legible at small sizes, optimal line-height (1.45–1.6).
- **Code & Metrics**: `'JetBrains Mono'`, monospace (`font-mono`) — used for character counts, dimensions, coordinates, and technical stats.

## Mobile-First UI & Touch Architecture

1. **Bottom Navigation & App Shell**:
   - Fixed, blur-backed bottom navigation dock with clear active indicators, badges, and 48px minimum touch targets.
   - Quick floating action button (FAB) for the primary conversion goal: "Create Font" / "New Document".
   - Safe-area inset support (`pb-safe`, `pt-safe`).

2. **Mobile Bottom Sheets & Floating Toolbars**:
   - Complex formatting tools (paper style, ink color, letter spacing, font picker) slide up in ergonomic thumb-zone bottom sheets instead of crowding mobile viewports.
   - Segmented pill switchers for switching between Document Settings, AI Tools, and Export options.

3. **Handwriting Canvas Scaling**:
   - A4 document canvas fluidly scales to match mobile device width (`viewportWidth - 32px`) while maintaining pristine vector export resolution.
   - Interactive zoom & fit controls (`Fit Screen`, `100%`, `Zoom In/Out`).
   - Touch-friendly page carousel with swipeable thumbnail switcher and page counter.

4. **Character Grid & Drawing Pad**:
   - Responsive character grid for reviewing detected glyphs.
   - Built-in full-screen touch drawing pad so mobile users can draw or correct missing characters with finger or stylus directly on device.

5. **Motion & Feedback**:
   - Snappy spring transitions (`stiffness: 400, damping: 30`) using `motion/react`.
   - Micro-interactions on button tap (scale `0.97`), clear toast notifications, and animated step progress bars.
