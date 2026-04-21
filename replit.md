# HandFont

Convert handwriting into a downloadable .ttf font file using Gemini Vision and browser-based vectorization.

## Stack
- React 19 + TypeScript + Vite 6
- Tailwind CSS v4
- Google Gemini AI (`@google/genai`)

## Dev
- Workflow `Start application` runs `npm run dev` on port 5000 (host 0.0.0.0).
- Vite is configured with `allowedHosts: true` for the Replit proxy iframe.

## Env
- `GEMINI_API_KEY` — required for Gemini API calls (set via Secrets).

## Deployment
- Target: static
- Build: `npm run build`
- Public dir: `dist`
