<div align="center">

# 🖋️ InkTwin

### **AI-Powered Handwriting-to-Font Digitization & Document Studio**

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-yellow.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0+-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4+-38B2AC.svg)](https://tailwindcss.com/)
[![Privacy: Client--Side BYOK](https://img.shields.io/badge/Privacy-100%25%20Client--Side%20BYOK-success.svg)](#-privacy--security)

**[🌐 Live Demo: inktwin.primuez.in](https://inktwin.primuez.in)**

</div>

---

## 📖 Overview

**InkTwin** is an end-to-end mobile-first handwriting digitization studio and document synthesis suite. It transforms real handwriting photos into functional TrueType (`.ttf`) font files, simulates natural multi-page handwritten documents on ruled paper substrates, solves homework assignments with AI, and humanizes machine text into authentic student handwriting.

All font vectorization and `.ttf` compilation run **100% client-side in the browser** with zero desktop friction.

---

## ✨ Key Capabilities

### 1. ✏️ 6-Step Font Creation Studio
* **Guided Mobile Flow**: Download printable A4 grid templates, snap samples with a smartphone camera, or upload photos/PDFs.
* **Touchscreen Drawing Pad**: Built-in full-screen touch canvas to draw or refine individual missing glyphs with finger or stylus.
* **AI Glyph Detection**: Automated bounding-box segmentation and character recognition powered by Gemini Multimodal AI.
* **Client-Side Vectorization**: Bezier path extraction via `imagetracerjs` and instant TrueType font assembly via `opentype.js`.

### 2. 📝 Realistic Document Studio Writer
* **20+ Authentic Paper Substrates**: Black-lined, blue-lined, legal pad, kraft, old parchment, grid, notebook, blackboard, and floral stationery.
* **Authentic Paper Preservation**: Document sheets maintain their physical paper color (`#FFFFFF` / `#FAF9F6`) in dark mode, while the software chrome switches to dark carbon.
* **Natural Handwriting Realism**: Customizable ink colors (royal blue, deep black, gel pen, pencil), line jitter, baseline wobble, letter spacing, and line height.
* **Multi-Page Export**: Download single pages or multi-page documents as high-resolution PDFs or zipped PNGs.

### 3. 🎓 Multimodal AI Homework Solver
* **Instant Question Ingestion**: Upload assignment photos, PDFs, DOCX, or paste questions directly.
* **Step-by-Step Solutions**: Formatted mathematical proofs, essays, and equations.
* **1-Tap Transfer**: Send answers directly into Studio Writer to render them in your own handwriting font.

### 4. 🔍 Find My Font (Style Matcher)
* Upload any handwriting sample to analyze stroke width, slant, and letterform characteristics.
* Matches samples with the closest free Google Web Font alternatives for instant use in the writer.

### 5. ✨ AI Text Humanizer
* Converts robotic AI drafts into natural student phrasing (Casual Student, High Schooler, University Researcher).
* Interactive split-view editor with notebook-ruled preview before sending to Studio Writer.

---

## 🏗️ Architecture & Tech Stack

```
                     ┌──────────────────────────────────────────────┐
                     │          InkTwin Mobile Browser App           │
                     └───────┬──────────────────────────────┬───────┘
                             │                              │
             ┌───────────────▼──────────────┐ ┌──────────────▼──────────────┐
             │    Client-Side Engine         │ │    Multimodal AI (BYOK)     │
             │                              │ │                              │
             │ • opentype.js (.TTF builder) │ │ • Gemini 2.5 Flash           │
             │ • imagetracerjs (Vectors)    │ │ • Character Extraction       │
             │ • Canvas 2D Rendering Engine │ │ • Homework Solver Engine     │
             │ • pdf-lib & mammoth.js       │ │ • Text Humanization Engine   │
             └──────────────────────────────┘ └──────────────────────────────┘
```

* **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Motion (`framer-motion`).
* **Font Generation**: `opentype.js`, `imagetracerjs`.
* **Document Processing**: `pdfjs-dist`, `pdf-lib`, `mammoth.js`, `xlsx`.
* **AI Integration**: Google Gemini API via official `@google/genai` SDK (Client-Side Bring-Your-Own-Key model).

---

## 🚀 Quickstart & Local Setup

### Prerequisites
* **Node.js** `v18.0.0` or higher
* **npm** `v9.0.0` or higher
* (Optional) A free **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Installation
```bash
# 1. Clone the repository
git clone https://github.com/Primmius/Ink-Twin.git
cd Ink-Twin

# 2. Install dependencies
npm install

# 3. Configure environment variables (optional)
cp .env.example .env.local

# 4. Start local development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build & Validate
```bash
# Type check and production build
npm run lint
npm run build
```

---

## 🔒 Privacy & Security

* **100% Client-Side Font Compilation**: Handwriting images and generated TrueType `.ttf` files are processed locally in your browser and never uploaded to an external font generation server.
* **Bring-Your-Own-Key (BYOK)**: Users provide their own Gemini API key for AI features. Keys are stored strictly in local browser storage (`localStorage`) and communicated directly with Google's API endpoints.
* See [`SECURITY.md`](./SECURITY.md) for vulnerability disclosure procedures.

---

## 📜 Intellectual Property, Licensing & Trademarks

* **Source Code**: Licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](./LICENSE).
* **Trademark & Brand Protection**: The **"InkTwin"** name, logo, favicon, and brand styling are protected trademarks of Rahul Kasturiya. Reusing or distributing forks requires complete rebranding. See [`TRADEMARKS.md`](./TRADEMARKS.md).
* **Asset Exclusions**: Demo handwriting datasets, evaluation samples, and model prompt configurations are excluded from the open-source grant. See [`NOTICE.md`](./NOTICE.md).
* **Commercial Inquiries**: For proprietary dual-licensing or commercial inquiries, contact [contact@primuez.in](mailto:contact@primuez.in).

---

## 🤝 Contributing

We welcome contributions! Please review our [Contributing Guidelines and Contributor License Agreement](./CONTRIBUTING.md) before submitting a Pull Request.

---

## 👤 Author

**Rahul Kasturiya**  
* Website: [primuez.in](https://primuez.in)  
* Project: [inktwin.primuez.in](https://inktwin.primuez.in)  
* GitHub: [@Primmius](https://github.com/Primmius)
