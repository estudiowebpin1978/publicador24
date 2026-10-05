import type {
  AIProvider,
  AITextInput,
  AITextResult,
  AIAnalysisInput,
  AIAnalysisResult,
  HashtagInput,
  HashtagResult,
  TrendInput,
  TrendResult,
  VariantInput,
  VariantResult,
  ScoreInput,
  ScoreResult,
} from './types';

export class HuggingFaceProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.HF_API_KEY || '';
    this.model = process.env.HF_MODEL || 'Qwen/Qwen2.5-7B-Instruct';
  }

  async generateText(input: AITextInput): Promise<AITextResult> {
    if (!this.apiKey) {
      throw new Error('HF_API_KEY not configured');
    }

    const messages: { role: string; content: string }[] = [];
    if (input.system_prompt) {
      messages.push({ role: 'system', content: input.system_prompt });
    }
    messages.push({ role: 'user', content: input.prompt });

    const response = await fetch('https://api-inference.huggingface.co/models/' + this.model, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + this.apiKey,
      },
      body: JSON.stringify({
        inputs: messages.map((m) => m.content).join('\n'),
        parameters: {
          max_new_tokens: input.max_tokens || 800,
          temperature: 0.7,
          return_full_text: false,
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error('Hugging Face API error ' + response.status + ': ' + body);
    }

    const data = await response.json();
    const text = Array.isArray(data) ? data[0]?.generated_text || data[0] || '' : (data.generated_text || data.response || JSON.stringify(data));

    return {
      text: String(text),
      tokens_used: 0,
      model: this.model,
    };
  }

  async analyzeContent(input: AIAnalysisInput): Promise<AIAnalysisResult> {
    throw new Error('Not implemented');
  }

  async generateHashtags(input: HashtagInput): Promise<HashtagResult> {
    throw new Error('Not implemented');
  }

  async analyzeTrend(input: TrendInput): Promise<TrendResult> {
    throw new Error('Not implemented');
  }

  async generateVariants(input: VariantInput): Promise<VariantResult> {
    throw new Error('Not implemented');
  }

  async scoreContent(input: ScoreInput): Promise<ScoreResult> {
    throw new Error('Not implemented');
  }
}
