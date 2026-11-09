import { config } from '../config/env';
import { AIProviderFactory } from '../providers/provider.factory';
import { GenerationRequest, GenerationResponse } from '../types/generation';

export class GenerationService {
  async generateWebsite(request: GenerationRequest): Promise<GenerationResponse> {
    const startTime = Date.now();
    const provider = AIProviderFactory.getProvider(config.AI_PROVIDER);

    try {
      const generatedProject = await provider.generate(request);
      const duration = Date.now() - startTime;

      return {
        success: true,
        provider: provider.name,
        data: generatedProject,
        generationTimeMs: duration,
      };
    } catch (error: any) {
      return {
        success: false,
        provider: provider.name,
        error: error.message || 'An unexpected error occurred during generation.',
        generationTimeMs: Date.now() - startTime,
      };
    }
  }

  async checkStatus() {
    try {
      const provider = AIProviderFactory.getProvider(config.AI_PROVIDER);
      const health = await provider.checkHealth();

      return {
        status: 'ok',
        activeProvider: config.AI_PROVIDER,
        providerHealth: health,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        status: 'degraded',
        activeProvider: config.AI_PROVIDER,
        error: err.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export const generationService = new GenerationService();

