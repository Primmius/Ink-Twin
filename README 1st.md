# Ink Twin 🖋️

**Live App:** [inktwin.primuez.com](https://inktwin.primuez.com)

## Overview
Ink Twin is a proprietary AI platform designed to perfectly replicate handwriting and automate document generation. It serves as a complete, end-to-end homework and document synthesis pipeline. 

Currently, the platform operates on a BYOK (Bring Your Own Key) model, allowing users to utilize the tool for free by plugging in their own Gemini API key. *(Note: This pricing/usage model is subject to change as the platform scales).*

## The 4-Phase Architecture

**Phase 1: Create My Handwriting**
* Ingests user handwriting samples and converts them into a fully usable, downloadable custom font file.

**Phase 2: Write With My Handwriting (Synthesis)**
* A robust text-to-handwriting engine. 
* Pulls the user's custom font from the Cloudflare-managed Font Library.
* Features an **AI Edit Mode** allowing granular control over output styling, including ink color adjustments, letter spacing, and natural variance to bypass AI/digital detection.

**Phase 3: AI Study Assistant**
* The homework solver engine. Users input assignments or questions, and the Gemini model processes and generates highly accurate answers instantly.

**Phase 4: Find My Font**
* A matching engine for users who prefer not to create a custom font from scratch. It analyzes their natural handwriting and matches it with the closest existing font in the database.

## Tech Stack & Deployment
* **Prototyping & AI Logic:** Built natively in Google AI Studio.
* **Development Environment:** Edited and structured via Replit.
* **Hosting & Infrastructure:** Deployed on Cloudflare for edge-network speed and secure font library storage.
* **AI Model:** Gemini API (BYOK Integration).
* **Automation:** n8n workflows.

## Environment Setup
1. Clone the repository.
2. Create a `.env` file based on `.env.example`. **NEVER COMMIT THE ACTUAL .ENV FILE.**
3. Run standard package installation commands to initialize the local environment.

## Deployment & Security
* Connected to Cloudflare for CI/CD tracking, serving as an immutable deployment timeline.
* **Proprietary Notice:** This codebase is strictly confidential. Unauthorized copying, distribution, or modification is prohibited.
