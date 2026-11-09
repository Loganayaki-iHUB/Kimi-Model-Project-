import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env';
import { AIProvider, GeneratedProject, GenerationRequest } from '../types/generation';

export class GeminiAIProvider implements AIProvider {
  readonly name = 'gemini';
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (config.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
    }
  }

  async checkHealth(): Promise<{ isHealthy: boolean; message: string }> {
    if (!config.GEMINI_API_KEY) {
      return {
        isHealthy: false,
        message: 'GEMINI_API_KEY is not configured in backend/.env',
      };
    }
    return {
      isHealthy: true,
      message: 'Gemini AI Provider configured and ready.',
    };
  }

  async generate(request: GenerationRequest): Promise<GeneratedProject> {
    if (!this.ai) {
      if (!config.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is missing. Please set it in backend/.env');
      }
      this.ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
    }

    const systemInstruction = `
You are an expert full-stack UI/UX architect and frontend developer.
The user wants to generate a complete, production-ready, beautiful, modern website or web application based on their prompt.

Return your response strictly as a single valid JSON object with the following schema:
{
  "title": "Short descriptive title of the website",
  "description": "Short explanation of the website features",
  "framework": "html-tailwind",
  "entrypoint": "index.html",
  "files": [
    {
      "path": "index.html",
      "language": "html",
      "content": "<!DOCTYPE html>..."
    }
  ]
}

Guidelines for the generated website code:
1. Must be a self-contained, complete HTML file using Tailwind CSS via <script src="https://cdn.tailwindcss.com"></script>.
2. Include modern FontAwesome or Lucide or SVG icons, inter fonts, responsive layouts, gradients, interactive JavaScript widgets where appropriate.
3. Clean modern dark or light styling matching premium quality.
4. DO NOT wrap the JSON output in markdown fences like \`\`\`json. Return RAW JSON only.
`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [{ text: `Create a website for this prompt:\n${request.prompt}` }],
          },
        ],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text?.trim() || '';

      // Clean any accidental markdown wrap
      const cleanJson = responseText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();

      const parsed: GeneratedProject = JSON.parse(cleanJson);

      // Validate basic structure
      if (!parsed.files || !Array.isArray(parsed.files) || parsed.files.length === 0) {
        throw new Error('Gemini returned an invalid project structure with missing files.');
      }

      return parsed;
    } catch (err: any) {
      console.error('[GeminiAIProvider] Error generating project:', err);
      throw new Error(`Gemini Generation failed: ${err.message}`);
    }
  }
}

