# Security Policy

## 🔒 Supported Versions
We actively release security patches and updates for the latest version on the `main` branch.

| Version | Supported          |
| ------- | ------------------ |
| Main (v1.x) | :white_check_mark: |
| < 1.0   | :x:                |

---

## 🛡️ Reporting a Vulnerability

We take the security of InkTwin and our users' privacy very seriously. If you discover a security vulnerability or sensitive data issue:

1. **Do NOT open a public GitHub issue.**
2. Please send a detailed report via email to: **[contact@primuez.in](mailto:contact@primuez.in)** with the subject line `[SECURITY VULNERABILITY] InkTwin`.
3. Include in your report:
   * A detailed description of the vulnerability.
   * Steps or a script to reproduce the issue.
   * Potential impact of the vulnerability.
   * Any suggested remediations or mitigations.

### Our Commitment
* We will acknowledge receipt of your report within 48 hours.
* We will keep you updated on progress towards resolving the issue.
* Once resolved, we will publish a patch and credit you in release notes (if desired).

---

## 🔐 Client-Side Privacy Policy
* InkTwin is architected to perform vectorization and TrueType font compilation **entirely client-side in the browser**.
* When using Gemini AI features (character detection, homework solving, humanizing), API calls are made directly from the user's browser using their personal Bring-Your-Own-Key (BYOK). Keys are stored strictly in local browser storage (`localStorage`) and are never sent to any intermediary server.
