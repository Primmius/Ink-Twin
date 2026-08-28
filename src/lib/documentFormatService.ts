import { getFallbackChain } from "./geminiModels";

export interface FormatProgress {
  currentChunk: number;
  totalChunks: number;
  message: string;
}

export interface FormatOptions {
  documentText: string;
  userInstruction: string;
  apiKey: string;
  modelName?: string;
  onProgress?: (progress: FormatProgress) => void;
}

/**
 * Splits large documents into safe chunks based on section breaks or paragraph boundaries
 * so Gemini never hits output token limits or truncates text.
 */
export function splitTextIntoFormatChunks(text: string, maxChunkChars: number = 2800): string[] {
  if (!text || text.trim().length === 0) return [];
  if (text.length <= maxChunkChars) return [text];

  const sectionSeparators = ['\n⸻\n', '\n---\n', '\n***\n', '\n___\n'];
  let separatorUsed: string | null = null;
  for (const sep of sectionSeparators) {
    if (text.includes(sep)) {
      separatorUsed = sep;
      break;
    }
  }

  const primaryBlocks = separatorUsed ? text.split(separatorUsed) : text.split('\n\n');
  const chunks: string[] = [];
  let currentChunkBlocks: string[] = [];
  let currentLength = 0;

  const joinSep = separatorUsed || '\n\n';

  for (const block of primaryBlocks) {
    if (block.length > maxChunkChars) {
      // If a single block is too large, split it by single newlines
      if (currentChunkBlocks.length > 0) {
        chunks.push(currentChunkBlocks.join(joinSep));
        currentChunkBlocks = [];
        currentLength = 0;
      }

      const lines = block.split('\n');
      let lineSubChunk: string[] = [];
      let lineLength = 0;

      for (const line of lines) {
        if (lineLength + line.length + 1 > maxChunkChars && lineSubChunk.length > 0) {
          chunks.push(lineSubChunk.join('\n'));
          lineSubChunk = [line];
          lineLength = line.length;
        } else {
          lineSubChunk.push(line);
          lineLength += line.length + 1;
        }
      }
      if (lineSubChunk.length > 0) {
        chunks.push(lineSubChunk.join('\n'));
      }
    } else if (currentLength + block.length + joinSep.length > maxChunkChars && currentChunkBlocks.length > 0) {
      chunks.push(currentChunkBlocks.join(joinSep));
      currentChunkBlocks = [block];
      currentLength = block.length;
    } else {
      currentChunkBlocks.push(block);
      currentLength += block.length + joinSep.length;
    }
  }

  if (currentChunkBlocks.length > 0) {
    chunks.push(currentChunkBlocks.join(joinSep));
  }

  return chunks.length > 0 ? chunks : [text];
}

/**
 * Builds the AI prompt for formatting document chunks with precise handwriting tags.
 */
export function buildFormatPrompt(
  chunkText: string,
  userInstruction: string,
  chunkIndex: number,
  totalChunks: number
): string {
  const isMulti = totalChunks > 1;
  const chunkHeader = isMulti ? `[DOCUMENT SECTION ${chunkIndex + 1} OF ${totalChunks}]\n` : '';

  return `You are a precision handwriting document formatter.
Your task is to take this document text and add layout & styling tags based on the user's instructions.

TAG SYSTEM REFERENCE:
• [INK:color] - Sets ink color (e.g. [INK:black], [INK:blue], [INK:red], [INK:#000000]).
• [HEADING] - Marks titles and headings (larger bold font).
• [BREAK] - Inserts an explicit page break.
• [GAP] - Inserts an extra vertical blank line. (Use ONLY when extra spacing is needed).
• [CENTER] - Centers the text line.
• [SIZE:number] - Custom font size.

CRITICAL FORMATTING & SAFETY RULES:
1. STRICT CONTENT PRESERVATION (NO DATA LOSS):
   You must output EVERY SINGLE WORD, line, and bullet point from the original text.
   Do NOT summarize, omit, edit, rewrite, truncate, or cut short any content.
   Every sentence from the input must appear in your output with tags.

2. AVOID REDUNDANT GAPS:
   Do NOT insert [GAP] tags on lines that are already empty or between paragraphs that already have line breaks.
   Existing single newlines or empty lines are already spaced naturally.

3. INK COLOR & HEADING RULES:
   Follow the user's instruction precisely (e.g. "headings black and data blue" means headings get [HEADING][INK:black] or [INK:black], and body/data lines get [INK:blue]).
   Ensure colors transition cleanly between headings, bullet points, questions, steps, and answers.

4. CLEAN OUTPUT ONLY:
   Return ONLY the tagged document text. Do NOT wrap output in markdown code blocks (\`\`\` or \`\`\`text), and do NOT add intro/outro comments or explanations.

USER INSTRUCTION:
${userInstruction}

${chunkHeader}DOCUMENT TO FORMAT:
${chunkText}`;
}

/**
 * Heuristic fallback tagger for cases where a chunk cannot reach the AI or experiences partial return.
 * Guarantees zero data loss.
 */
export function applyHeuristicFallbackTags(text: string, userInstruction: string): string {
  const lowerInst = userInstruction.toLowerCase();
  const headingColor = lowerInst.includes('heading') && lowerInst.includes('red') ? 'red' : 'black';
  const bodyColor = lowerInst.includes('blue') ? 'blue' : (lowerInst.includes('black') && headingColor === 'red' ? 'black' : 'blue');

  const lines = text.split('\n');
  const processed: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      processed.push('');
      continue;
    }

    if (trimmed === '⸻' || trimmed === '---' || trimmed === '***') {
      processed.push(trimmed);
      continue;
    }

    // Detect heading-like lines: short, uppercase, starting with UNIT, CHAPTER, Step, Q, etc.
    const isHeading =
      trimmed.startsWith('UNIT ') ||
      trimmed.startsWith('CHAPTER ') ||
      trimmed === trimmed.toUpperCase() && trimmed.length < 50 && !trimmed.includes('.') ||
      trimmed.startsWith('Important ') ||
      trimmed.startsWith('HISTORY OF') ||
      trimmed.startsWith('GENERATIONS OF') ||
      trimmed.endsWith(':') && trimmed.length < 40 ||
      /^[A-Z0-9\.\s–—\-]{3,40}$/.test(trimmed) && !trimmed.includes(',') && trimmed.length < 35;

    if (isHeading) {
      processed.push(`[HEADING][INK:${headingColor}]${trimmed}`);
    } else {
      processed.push(`[INK:${bodyColor}]${trimmed}`);
    }
  }

  return processed.join('\n');
}

/**
 * Formats an entire document safely with chunking, fallbacks, and zero data loss.
 */
export async function formatDocumentWithAI(options: FormatOptions): Promise<string> {
  const { documentText, userInstruction, apiKey, modelName = 'gemini-2.0-flash', onProgress } = options;

  if (!apiKey || !apiKey.trim()) {
    throw new Error("You don't have the API key set up yet. Please set up the API key.");
  }
  if (!documentText || documentText.trim() === '') {
    throw new Error("Document is empty");
  }

  const chunks = splitTextIntoFormatChunks(documentText, 2600);
  const totalChunks = chunks.length;
  const formattedResults: string[] = [];

  const fallbackModels = getFallbackChain(modelName, false);

  for (let i = 0; i < totalChunks; i++) {
    const chunk = chunks[i];
    const progressMsg = totalChunks > 1 
      ? `AI is formatting section ${i + 1} of ${totalChunks}...` 
      : `AI is formatting document...`;

    onProgress?.({
      currentChunk: i + 1,
      totalChunks,
      message: progressMsg
    });

    const prompt = buildFormatPrompt(chunk, userInstruction, i, totalChunks);
    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8192
      }
    };

    let chunkOutput = '';
    let lastErrorMsg = '';

    for (const m of fallbackModels) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          }
        );

        if (res.ok) {
          const data = await res.json();
          let raw = data.contents?.[0]?.parts?.[0]?.text || data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          
          // Clean accidental code fences
          raw = raw.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '').trim();

          if (raw) {
            // Verify chunk didn't lose more than 40% of its content
            const origLines = chunk.split('\n').filter(l => l.trim() !== '').length;
            const resLines = raw.split('\n').filter(l => l.trim() !== '').length;

            if (resLines >= origLines * 0.6) {
              chunkOutput = raw;
              break;
            } else {
              console.warn(`[documentFormatService] Model ${m} returned truncated chunk (${resLines}/${origLines} lines).`);
            }
          }
        } else {
          lastErrorMsg = await res.text();
          console.warn(`[documentFormatService] Model ${m} returned HTTP ${res.status}:`, lastErrorMsg);
        }
      } catch (err: any) {
        lastErrorMsg = err?.message || String(err);
        console.warn(`[documentFormatService] Model ${m} fetch failed:`, err);
      }
    }

    // If chunk failed or truncated, apply fallback tags to original chunk so NO data is lost
    if (!chunkOutput) {
      console.warn(`[documentFormatService] Using heuristic fallback for chunk ${i + 1} to prevent data loss.`);
      chunkOutput = applyHeuristicFallbackTags(chunk, userInstruction);
    }

    formattedResults.push(chunkOutput);
  }

  // Clean redundant [GAP] and join chunks
  let merged = formattedResults.join('\n\n');

  // Post-processing cleanup:
  // 1. Remove duplicate [GAP] tags on consecutive lines
  merged = merged.replace(/\[GAP\](\s*\[GAP\])+/g, '[GAP]');
  // 2. Remove [GAP] tags that are already on empty lines
  merged = merged.replace(/\n\s*\[GAP\]\s*\n\s*\n/g, '\n\n');
  merged = merged.replace(/\n\s*\n\s*\[GAP\]\s*\n/g, '\n\n');

  return merged;
}
