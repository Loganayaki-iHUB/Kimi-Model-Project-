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

export interface GenerationResponse {
  success: boolean;
  provider: string;
  data?: GeneratedProject;
  error?: string;
  generationTimeMs?: number;
}

export interface BackendHealthResponse {
  status: string;
  activeProvider: string;
  providerHealth?: {
    isHealthy: boolean;
    message: string;
  };
  timestamp: string;
  error?: string;
}

