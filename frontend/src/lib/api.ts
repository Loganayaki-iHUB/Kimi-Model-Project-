import { BackendHealthResponse, GenerationResponse } from '../types/generation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function checkBackendHealth(): Promise<BackendHealthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/generation/health`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Health check failed with status: ${res.status}`);
  }
  return res.json();
}

export async function generateProject(prompt: string): Promise<GenerationResponse> {
  const res = await fetch(`${API_BASE_URL}/api/generation/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Generation failed with status ${res.status}`);
  }
  return data;
}

