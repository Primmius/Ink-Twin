# AI Development Rules & Project Context: HandFont (InkTwin)

## Tech Stack Overview
- **Core Framework & Language**: React 19 with TypeScript (~5.8), bundled and served using Vite 6.
- **Styling & Design System**: Tailwind CSS v4 (`@tailwindcss/vite`) paired with `clsx` and `tailwind-merge` (`cn` helper) for dynamic utility class composition.
- **UI Icons & Animations**: `lucide-react` for consistent iconography and Motion (`motion/react`) for page transitions, modals, and interactive UI states.
- **Multimodal AI & LLM Engine**: Official Google GenAI SDK (`@google/genai`) powering character recognition, layout detection, homework solving, and text humanization via Gemini models.
- **Font Engineering & Compilation**: `opentype.js` for programmatic OpenType/TrueType font construction, glyph path mapping, and font file compilation (`.ttf`).
- **Image Vectorization**: `imagetracerjs` for client-side raster-to-vector tracing to convert handwritten glyph bitmaps into SVG paths.
- **PDF Creation & Rasterization**: `pdf-lib` for client-side template/handwriting PDF generation, and `pdfjs-dist` (with worker) for reading and rasterizing PDF pages into canvas images.
- **Document & Spreadsheet Ingestion**: `mammoth` for extracting plain text from `.docx` Word documents, and `xlsx` for parsing `.xlsx`, `.xls`, and `.csv` spreadsheet data.
- **Archiving & Export Bundling**: `jszip` for creating and downloading `.zip` bundles containing fonts, templates, and multi-file assets.

---

## Library Usage Rules & Responsibilities

| Domain / Feature | Designated Library | Strict Usage Rules |
|---|---|---|
| **AI & Multimodal Tasks** | `@google/genai` | Use `@google/genai` for all Gemini API interactions (character extraction, bounding-box detection, layout analysis, homework solving, humanizing text). Always use `responseSchema` with `Type.ARRAY` / `Type.OBJECT` for structured JSON data. |
| **Font Generation** | `opentype.js` | Use `opentype.js` for defining `Glyph`, constructing `Path` commands (`moveTo`, `lineTo`, `curveTo`, `quadTo`), setting ascender/descender metrics, and generating `.ttf` binary buffers. |
| **Image Vectorization** | `imagetracerjs` | Use `imagetracerjs` to trace black ink strokes from processed character canvas elements to SVG `path` data (`d` attribute). |
| **PDF Generation & Export** | `pdf-lib` | Use `pdf-lib` for generating printable A4 grid templates and compiling multi-page handwritten export PDFs. |
| **PDF Reading & Rendering** | `pdfjs-dist` | Use `pdfjs-dist` when converting uploaded PDF pages into image data URLs or canvas contexts. Always maintain the CDN/local worker configuration. |
| **Word Document Parsing** | `mammoth` | Use `mammoth.extractRawText({ arrayBuffer })` to parse uploaded `.docx` files for the handwriting writer or homework solver. |
| **Spreadsheet Parsing** | `xlsx` | Use `xlsx` (`XLSX.read`, `XLSX.utils.sheet_to_json`) for parsing tabular data into handwriting lines. |
| **Compression & Downloads** | `jszip` | Use `jszip` for batch exporting generated fonts, presets, and sample packs into `.zip` archives. |
| **UI Animation & Modals** | `motion/react` | Use `motion` components (`motion.div`, `motion.button`, `<AnimatePresence>`) for interactive transitions, dialogs, drawers, and tabs. |
| **Icons** | `lucide-react` | Use `lucide-react` for all UI icons. Do not add auxiliary icon packages or hardcode raw inline SVG icons unless representing custom app brand marks. |
| **Class Merging** | `clsx` + `tailwind-merge` | Always use the standard `cn(...)` utility from `src/lib/utils.ts` to merge dynamic and conditional Tailwind classes. |

---

## Codebase Architecture & File Conventions

### 1. Directory Structure
- `src/components/`: Modular UI views and feature components.
  - `src/components/writer/`: Handwriting canvas renderer, multi-page layout, and writer tools (`CanvasPage.tsx`, `HandwritingWriter.tsx`).
  - `src/components/GlyphEditor.tsx`: Interactive character canvas editor, baseline adjuster, and previewer.
  - `src/components/HomeworkSolver.tsx`: AI homework solving workflow with document upload.
  - `src/components/AIHumanizer.tsx`: Text rewriting and tone-humanizing tool.
  - `src/components/FindFont.tsx`: Preset and saved handwriting font explorer.
- `src/lib/`: Pure utilities, font synthesis, image algorithms, and external service clients:
  - `fontBuilder.ts`: TrueType font synthesis via `opentype.js`.
  - `vectorizer.ts`: SVG path extraction via `imagetracerjs`.
  - `imageProcessing.ts`: Contrast normalization, binarization, padding, and manual drawing processing.
  - `gemini.ts` & `geminiLayout.ts`: AI vision and layout analysis.
  - `homeworkService.ts` & `humanizeService.ts`: AI tutoring and text transformation services.
  - `localLayout.ts`: Client-side fallback text-wrapping and rule-based paper layout engine.
  - `pdf.ts`: PDF generation and PDF-to-image extraction.
  - `utils.ts`: Class name merging helper (`cn`).
- `src/types.ts`: Global TypeScript models (`DetectedCharacter`, `FontConfig`, `SavedFont`, `PageConfig`, `WriterPage`, `AppPhase`, etc.).
- `src/use-cases/`: Landing and deep-dive pages for specific use cases.

### 2. State & Persistence Guidelines
- Store user configuration (such as API keys, custom font presets, active themes) in `localStorage`.
- Safely check for API keys using the fallback chain: `localStorage.getItem('geminiApiKey') || localStorage.getItem('gemini_api_key') || process.env.GEMINI_API_KEY || ''`.
- Revoke object URLs with `URL.revokeObjectURL(url)` when replacing or unmounting generated preview font URLs or images to prevent memory leaks.

### 3. Engineering Best Practices
- **No Mock Placeholders**: Always implement complete, working client-side or AI logic.
- **Fail Gracefully**: Provide rule-based fallbacks (e.g. `localLayout.ts`) when AI services encounter rate limits or missing API keys.
- **Type Safety**: Strictly type all character metrics, bounding boxes, and canvas transformation matrices without relying on untyped `any`.
