# Contributing to InkTwin

Thank you for your interest in contributing to InkTwin! We welcome contributions that improve features, fix bugs, optimize performance, or enhance mobile accessibility.

---

## 🛠️ Local Development Setup

### Prerequisites
* **Node.js**: `v18.0.0` or higher
* **npm**: `v9.0.0` or higher
* A free **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Getting Started
1. **Fork and clone** the repository:
   ```bash
   git clone https://github.com/<your-username>/tth.git
   cd tth
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure environment**:
   ```bash
   cp .env.example .env.local
   ```
   Add your optional default `GEMINI_API_KEY` (you can also enter it dynamically via the in-app BYOK modal).
4. **Start the development server**:
   ```bash
   npm run dev
   ```
5. **Run type checks & build validation**:
   ```bash
   npm run lint
   npm run build
   ```

---

## 📋 Pull Request (PR) Workflow

1. Create a descriptive branch: `git checkout -b feat/my-new-feature` or `fix/issue-description`.
2. Ensure your code conforms to the project's mobile-first design doctrine:
   * 48px minimum touch targets on mobile.
   * Authentic physical paper colors preserved in both dark and light modes.
   * Brand lemon/golden yellow accents (`#FFD700`).
   * Zero horizontal scroll overflow on mobile viewports.
3. Commit with clean, conventional commit messages (`feat: ...`, `fix: ...`, `docs: ...`).
4. Ensure `npm run lint && npm run build` completes with 0 errors before submitting your PR.

---

## ⚖️ Contributor License Agreement (CLA)

By submitting a Pull Request, issue, patch, or code contribution to the InkTwin repository, you agree to the following terms:

1. **License Grant**: You grant Rahul Kasturiya a perpetual, worldwide, non-exclusive, royalty-free, transferable, and sublicensable license to use, reproduce, modify, display, perform, distribute, and commercialize your contributions.
2. **Right to Dual-License & Relicense**: You acknowledge and agree that Rahul Kasturiya retains the sole right to license, dual-license, or re-license the software (including your contribution) under open-source, source-available, or commercial proprietary licenses without needing prior approval.
3. **Original Work**: You represent and warrant that your contribution is your original creation, and that you have the legal right to submit it under these terms without infringing on any third-party copyrights, patents, or trade secrets.

---

## 💬 Community & Support
* Issues & Feature Requests: [GitHub Issues](https://github.com/Primmius/tth/issues)
* Security Reports: Please refer to [`SECURITY.md`](./SECURITY.md)
