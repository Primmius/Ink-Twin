# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are mobile-first students, educators, creators, and professionals who take handwriting photos on smartphones, draw on mobile touchscreens, or need authentic handwritten homework, study notes, letters, and custom `.ttf` TrueType fonts created directly from their phones without desktop friction.

## Product Purpose

InkTwin (HandFont) is an end-to-end mobile-first handwriting digitization platform and document studio. It allows users to turn natural handwriting photos into functional `.ttf` font files, write and export realistic handwritten documents on lined/custom papers, solve homework problems using AI directly rendered in their handwriting, identify matching handwriting fonts, and humanize AI text into natural student phrasing.

## Positioning

Unlike complex desktop font-editing software or static image generators, InkTwin runs client-side vectorization and TrueType font compilation (`opentype.js` + `imagetracerjs`) directly in the mobile browser, paired with multimodal Gemini AI for character detection and homework synthesis with Bring-Your-Own-Key (BYOK) privacy.

## Operating Context

Smartphone browsers (Safari iOS, Chrome Mobile, Android WebViews, iPadOS/Tablets) with touch & stylus input, portrait screens, mobile camera snaps, touch sliders, bottom sheets, and responsive document rendering with PDF and PNG export.

## Capabilities and Constraints

- **Font Creation**: 6-step guided mobile flow (Template download/view, mobile camera snap/upload, character detection & bounding box crop, vectorization, glyph fine-tuning/drawing pad, TTF build & library save).
- **Text Writer**: Realistic multi-page lined/ruled paper canvas simulator with ink color selection, realistic stroke thickness, natural slant/wobble jitter, bleed variance, drag-and-drop elements, and instant PDF/image export.
- **AI Homework Assistant**: Upload homework question photo, solve with Gemini, format step-by-step, and render in user's handwriting font with one tap.
- **Find My Font**: Upload handwriting sample to detect font characteristics and match with closest free web font alternatives.
- **AI Humanizer**: Transform robotic AI outputs into authentic student voices (Casual Student, High Schooler, University Researcher, Conversational) before sending to handwriting writer.
- **Mobile Touch Controls**: 48px touch targets, mobile bottom navigation bar, swipeable sheets, haptic-feel micro-interactions, responsive canvas zoom/fit.

## Brand Commitments

- Name: **InkTwin** (HandFont)
- Tagline: "Your Handwriting, Digitally Yours"
- Tone: High-craft, Swiss-inspired precision with modern creative energy (vibrant golden/lemon yellow accents `#FFD700` / `#FFE600`, crisp deep blacks `#0A0A0C`, tactile neutral stone/graphite surfaces `#121316` and `#F7F7F8`, smooth typography with Space Grotesk display, Plus Jakarta Sans body, JetBrains Mono data metrics).
- Default Paper: Authentic black lined notebook paper (`black-lined`), maintaining physical white substrate color in both light and dark modes.

## Product Principles

1. **Mobile-First Ergonomics**: Every primary action must be easily reachable with one thumb; zero horizontal layout overflow; no tiny un-tappable controls.
2. **Instant Visual Feedback & Live View**: Every parameter change (ink color, paper style, slant, spacing, randomness) updates the document canvas immediately without backdrop blur or obstruction.
3. **Authentic Physical Paper Fidelity**: Physical document paper (black-lined, blue-lined, kraft, legal pad) preserves its true physical paper background in dark mode, ensuring dark mode styles only the software studio chrome.
4. **Graceful Privacy & Fallbacks**: Full client-side vectorization and font synthesis works offline; clear BYOK setup for Gemini multimodal features with inline fallback tools (manual touch drawing pad for missing characters).
