export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export interface GeneratedProject {
  title: string;
  description: string;
  framework: 'html-tailwind' | 'react';
  entrypoint: string;
  files: GeneratedFile[];
}

export interface GenerationRequest {
  prompt: string;
  framework?: 'html-tailwind' | 'react';
  options?: {
    theme?: 'light' | 'dark' | 'auto';
  };
}

export interface GenerationResponse {
  success: boolean;
  provider: string;
  data?: GeneratedProject;
  error?: string;
  generationTimeMs?: number;
}

export interface AIProvider {
  readonly name: string;
  generate(request: GenerationRequest): Promise<GeneratedProject>;
  checkHealth(): Promise<{ isHealthy: boolean; message: string }>;
}

