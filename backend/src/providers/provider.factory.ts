import { AIProvider } from '../types/generation';
import { MockAIProvider } from './mock.provider';

export class AIProviderFactory {
  private static providers: Map<string, AIProvider> = new Map();

  static getProvider(providerType: string): AIProvider {
    const normalized = providerType.toLowerCase();

    if (this.providers.has(normalized)) {
      return this.providers.get(normalized)!;
    }

    let provider: AIProvider;

    switch (normalized) {
      case 'mock':
        provider = new MockAIProvider();
        break;
      case 'gemini':
        // Will be plugged in Phase 2
        throw new Error('Gemini provider is scheduled for Phase 2 implementation.');
      case 'groq':
        // Will be plugged in Phase 2
        throw new Error('Groq provider is scheduled for Phase 2 implementation.');
      case 'kimi':
        // Will be plugged in Phase 5
        throw new Error('Kimi provider is scheduled for Phase 5 implementation.');
      default:
        console.warn(`Unknown AI provider "${providerType}". Falling back to mock provider.`);
        provider = new MockAIProvider();
    }

    this.providers.set(normalized, provider);
    return provider;
  }
}

