import { GoogleGenAI, Type } from "@google/genai";

export type HomeworkInput = {
  text?: string;
  imageData?: string; // base64
  pdfText?: string;
  docxText?: string;
  sourceUrl?: string;
};

export type AnswerMode = 'final' | 'step-by-step' | 'both';

export type HomeworkResult = {
  subject: string;
  question: string;
  answer: string;
  difficulty: string;
  timestamp: number;
};

const SYSTEM_PROMPT = `You are an expert homework solver and tutor for students of all levels from primary school to university. You can solve any subject including mathematics, physics, chemistry, biology, history, geography, English literature, essay writing, computer science, coding, economics, and more.

Analyze the provided homework content carefully.
Identify:
1. The subject area
2. The specific question or questions being asked
3. The difficulty level (primary, secondary, university)
4. Whether it requires step by step working or just a final answer

Then solve it completely and accurately.

HANDWRITING FRIENDLY FORMATTING RULES:
- No markdown symbols like ** or ## 
- No bullet point symbols like * or -, use plain text or numbers instead
- Numbers for numbered lists
- Clear paragraph breaks
- Short lines where possible so they fit naturally on a lined page
- Ensure the tone matches the detected difficulty level.

LANGUAGE RULE:
Detect what language the question is written in. You MUST respond entirely in that same language. 
If the question is in Hindi, answer in Hindi. If the question is in French, answer in French. 
If the question is in Arabic, answer in Arabic. Never switch to English unless the question is written in English. 
Match the student's language exactly.
`;

export async function solveHomework(
  input: HomeworkInput, 
  mode: AnswerMode, 
  apiKey: string,
  followUp?: string,
  previousAnswer?: string
): Promise<HomeworkResult> {
  const ai = new GoogleGenAI({ apiKey });

  const modeInstructions = {
    'final': "Provide ONLY the clean final answer, ready to write out. No extra explanations unless necessary.",
    'step-by-step': "Provide full detailed working shown with each step explained. One step per line.",
    'both': "Provide step by step working followed by a clearly marked 'FINAL ANSWER' section."
  };

  let prompt = `${SYSTEM_PROMPT}\n\nMODE: ${modeInstructions[mode]}\n\n`;
  
  if (followUp && previousAnswer) {
    prompt += `PREVIOUS ANSWER: ${previousAnswer}\n\nFOLLOW-UP QUESTION/REQUEST: ${followUp}\n\nRefine the answer based on this request.`;
  } else {
    if (input.text) prompt += `TEXT CONTENT:\n${input.text}\n\n`;
    if (input.pdfText) prompt += `PDF EXTRACTED TEXT:\n${input.pdfText}\n\n`;
    if (input.docxText) prompt += `DOCX EXTRACTED TEXT:\n${input.docxText}\n\n`;
    if (input.sourceUrl) prompt += `SOURCE URL: ${input.sourceUrl}\n\n`;
    prompt += `Analyze and solve the above content.`;
  }

  const parts: any[] = [{ text: prompt }];
  if (input.imageData) {
    const base64Data = input.imageData.split(',')[1];
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: base64Data,
      },
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite", // Use Pro for complex tasks
    contents: { parts },
    config: {
      tools: [
        {
          googleSearch: {},
        },
      ],
    }
  });

  const responseText = response.text || "";

  const metaPrompt = `Based on the answer above, what is the 'subject' and 'difficulty' (Primary/Secondary/University)? Return ONLY JSON: {"subject": "...", "difficulty": "..."}`;
  const metaResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: responseText + "\n\n" + metaPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subject: { type: Type.STRING },
          difficulty: { type: Type.STRING }
        },
        required: ["subject", "difficulty"]
      }
    }
  });
  
  let meta = { subject: "General", difficulty: "Unknown" };
  try {
    const metaJson = JSON.parse(metaResponse.text || '{}');
    meta = metaJson;
  } catch (e) {}

  return {
    subject: meta.subject,
    question: input.text || (input.imageData ? "Image Query" : "Homework Question"),
    answer: responseText,
    difficulty: meta.difficulty,
    timestamp: Date.now()
  };
}
