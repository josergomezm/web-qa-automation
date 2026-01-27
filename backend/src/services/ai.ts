import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIConfig } from '@shared/types';
import { QA_AUTOMATION_PROMPT_TEMPLATE } from './prompt.template'

export class AIService {
  private openai?: OpenAI;
  private anthropic?: Anthropic;
  private google?: GoogleGenerativeAI;
  private config: AIConfig;
  private lastTokenCount: number = 0;

  constructor(config: AIConfig) {
    this.config = config;
    this.initializeClient();
  }

  private initializeClient() {
    console.log('Initializing AI client with config:', {
      provider: this.config.provider,
      hasApiKey: !!this.config.apiKey,
      apiKeyLength: this.config.apiKey?.length
    });

    if (!this.config.apiKey) {
      throw new Error(`API key is required for ${this.config.provider} provider`);
    }

    switch (this.config.provider) {
      case 'openai':
        this.openai = new OpenAI({
          apiKey: this.config.apiKey,
          // Explicitly disable environment variable reading
          dangerouslyAllowBrowser: false
        });
        break;
      case 'anthropic':
        this.anthropic = new Anthropic({ apiKey: this.config.apiKey });
        break;
      case 'google':
        this.google = new GoogleGenerativeAI(this.config.apiKey);
        break;
      default:
        throw new Error(`Unsupported AI provider: ${this.config.provider}. Supported providers: openai, anthropic, google`);
    }
  }

  async generateTestSteps(baseUrl: string, description: string, credentials?: any, formInputs?: any, prerequisiteContext?: string, waitConfig?: any): Promise<string[]> {
    const prompt = this.buildPrompt(baseUrl, description, credentials, formInputs, prerequisiteContext, waitConfig);

    try {
      switch (this.config.provider) {
        case 'openai':
          return await this.generateWithOpenAI(prompt);
        case 'anthropic':
          return await this.generateWithAnthropic(prompt);
        case 'google':
          return await this.generateWithGoogle(prompt);
        default:
          throw new Error(`Unsupported AI provider: ${this.config.provider}. Supported providers: openai, anthropic, google`);
      }
    } catch (error) {
      console.error('AI generation failed:', error);
      throw new Error('Failed to generate test steps');
    }
  }

  async generateRefinedSteps(
    baseUrl: string,
    description: string,
    failedStep: any,
    error: string,
    executedSteps: any[],
    pageSource?: string,
    credentials?: any,
    formInputs?: any
  ): Promise<string[]> {
    const prompt = this.buildRefinementPrompt(baseUrl, description, failedStep, error, executedSteps, pageSource, credentials, formInputs);

    try {
      switch (this.config.provider) {
        case 'openai':
          return await this.generateWithOpenAI(prompt);
        case 'anthropic':
          return await this.generateWithAnthropic(prompt);
        case 'google':
          return await this.generateWithGoogle(prompt);
        default:
          throw new Error(`Unsupported AI provider: ${this.config.provider}`);
      }
    } catch (error) {
      console.error('AI refinement generation failed:', error);
      throw new Error('Failed to generate refined test steps');
    }
  }

  /**
   * Builds a detailed prompt for an LLM to generate browser automation steps.
   * @param baseUrl The base URL for the test.
   * @param description The natural language description of the test case.
   * @param credentials Optional credentials object.
   * @param formInputs Optional form data object.
   * @returns The complete prompt string.
   */
  private buildPrompt(
    baseUrl: string,
    description: string,
    credentials?: Record<string, unknown>,
    formInputs?: Record<string, unknown>,
    prerequisiteContext?: string,
    waitConfig?: { globalWaitTime?: number; waitForElements?: boolean }
  ): string {
    const promptParts: string[] = [];
    promptParts.push(
      `Convert this natural language test description into specific browser automation steps:`,
      `Base URL: ${baseUrl}`,
      `Test Description: "${description}"`
    );

    if (prerequisiteContext) {
      promptParts.push(
        `Important Context: ${prerequisiteContext}`,
        `Note: The prerequisite steps will be executed automatically before your generated steps. Generate steps that continue from where the prerequisites end.`
      );
    }

    if (waitConfig) {
      const waitInstructions = [];
      if (waitConfig.globalWaitTime) {
        waitInstructions.push(`- Add a ${waitConfig.globalWaitTime}ms wait between steps when needed`);
      }
      if (waitConfig.waitForElements) {
        waitInstructions.push(`- Include wait conditions for elements to be visible/clickable before interacting`);
      }
      if (waitInstructions.length > 0) {
        promptParts.push(
          `Wait Configuration:`,
          waitInstructions.join('\n'),
          `Note: You can add "waitBefore" or "waitAfter" properties to steps, or "waitForCondition" for smart waiting.`
        );
      }
    }

    if (credentials) {
      promptParts.push(
        `Available credentials:`,
        JSON.stringify(credentials, null, 2)
      );
    }

    if (formInputs) {
      promptParts.push(
        `Form data to use:`,
        JSON.stringify(formInputs, null, 2)
      );
    }

    promptParts.push(QA_AUTOMATION_PROMPT_TEMPLATE);

    return promptParts.join('\n\n');
  }

  private buildRefinementPrompt(
    baseUrl: string,
    description: string,
    failedStep: any,
    error: string,
    executedSteps: any[],
    pageSource?: string,
    credentials?: Record<string, unknown>,
    formInputs?: Record<string, unknown>
  ): string {
    const promptParts: string[] = [];
    promptParts.push(
      `The previous attempt to execute the test failed. Please analyze the failure and generate a NEW sequence of steps to complete the remaining part of the test.`,
      `Base URL: ${baseUrl}`,
      `Original Test Description: "${description}"`,
      `Failed Step: ${JSON.stringify(failedStep)}`,
      `Error Message: "${error}"`
    );

    if (executedSteps && executedSteps.length > 0) {
      promptParts.push(
        `Previously Executed Steps (Success):`,
        JSON.stringify(executedSteps.map(s => s.action + ': ' + (s.element || s.target)), null, 2),
        `Note: The browser is currently in the state AFTER these steps. Do NOT re-generate these steps. Start from the next logical step to proceed.`
      );
    }

    if (pageSource) {
      // Truncate if too long (simple heuristic)
      const truncatedSource = pageSource.length > 20000 ? pageSource.substring(0, 20000) + '... (truncated)' : pageSource;
      promptParts.push(
        `Current Page HTML Snapshot (use this to find correct selectors):`,
        '```html',
        truncatedSource,
        '```'
      );
    }

    if (credentials) {
      promptParts.push(
        `Available credentials:`,
        JSON.stringify(credentials, null, 2)
      );
    }

    if (formInputs) {
      promptParts.push(
        `Form data to use:`,
        JSON.stringify(formInputs, null, 2)
      );
    }

    promptParts.push(
      `Based on the failure and the current page state, provide a CORRECTED sequence of JSON steps to complete the goal.`,
      `If the error was due to a wrong selector, use the provided HTML to find a better one.`,
      `If the error was a timeout, consider adding a wait step or checking for a different condition.`,
      QA_AUTOMATION_PROMPT_TEMPLATE
    );

    return promptParts.join('\n\n');
  }

  private async generateWithOpenAI(prompt: string): Promise<string[]> {
    if (!this.openai) throw new Error('OpenAI client not initialized');

    const response = await this.openai.chat.completions.create({
      model: this.config.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    });

    // Extract usage for accurate cost calculation
    if (response.usage) {
      console.log('OpenAI usage:', {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens
      });
      this.lastTokenCount = response.usage.total_tokens;
    }

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from OpenAI');

    try {
      const steps = JSON.parse(content);
      return Array.isArray(steps) ? steps : [];
    } catch {
      // Fallback: extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Invalid JSON response from AI');
    }
  }

  private async generateWithAnthropic(prompt: string): Promise<string[]> {
    if (!this.anthropic) throw new Error('Anthropic client not initialized');

    const response = await this.anthropic.messages.create({
      model: this.config.model,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    // Extract usage for accurate cost calculation
    if (response.usage) {
      console.log('Anthropic usage:', {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens
      });
      this.lastTokenCount = response.usage.input_tokens + response.usage.output_tokens;
    }

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Invalid response type from Anthropic');

    try {
      const steps = JSON.parse(content.text);
      return Array.isArray(steps) ? steps : [];
    } catch {
      // Fallback: extract JSON from response
      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Invalid JSON response from AI');
    }
  }

  private async generateWithGoogle(prompt: string): Promise<string[]> {
    if (!this.google) throw new Error('Google client not initialized');

    console.log('Sending prompt to Google AI:', prompt.substring(0, 200) + '...');
    const model = this.google.getGenerativeModel({ model: this.config.model });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract usage metadata for accurate cost calculation
    const usageMetadata = (response as any).usageMetadata;
    if (usageMetadata) {
      console.log('Google AI usage:', {
        promptTokens: usageMetadata.promptTokenCount,
        candidateTokens: usageMetadata.candidatesTokenCount,
        totalTokens: usageMetadata.totalTokenCount
      });

      // Store token count for cost calculation
      this.lastTokenCount = usageMetadata.totalTokenCount || 0;
    }

    console.log('Google AI response:', text.substring(0, 500) + '...');

    try {
      const steps = JSON.parse(text);
      console.log('Parsed steps successfully:', Array.isArray(steps) ? steps.length : 'not array');
      return Array.isArray(steps) ? steps : [];
    } catch (parseError) {
      console.log('Failed to parse JSON, trying fallback...', parseError);
      // Fallback: extract JSON from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        console.log('Found JSON in response, parsing...');
        const fallbackSteps = JSON.parse(jsonMatch[0]);
        return fallbackSteps;
      }
      console.error('No valid JSON found in response:', text);
      throw new Error('Invalid JSON response from Google AI');
    }
  }

  calculateCost(tokensUsed?: number): number {
    // Use actual token count from last API call if available
    const actualTokens = tokensUsed || this.lastTokenCount;

    let costPerToken: number;
    switch (this.config.provider) {
      case 'openai':
        // GPT-4 pricing (varies by model)
        costPerToken = this.config.model.includes('gpt-4') ? 0.00003 : 0.000002;
        break;
      case 'anthropic':
        // Claude pricing (varies by model)
        costPerToken = this.config.model.includes('claude-3-opus') ? 0.000015 : 0.000003;
        break;
      case 'google':
        // Google Gemini pricing (as of current rates)
        if (this.config.model.includes('2.5')) {
          // Gemini 2.5 models
          costPerToken = actualTokens <= 128000 ? 0.00000125 : 0.0000025; // $1.25/$2.50 per 1M tokens
        } else if (this.config.model.includes('2.0')) {
          // Gemini 2.0 models  
          costPerToken = actualTokens <= 128000 ? 0.00000075 : 0.0000015; // $0.75/$1.50 per 1M tokens
        } else {
          // Gemini 1.5 and older models
          costPerToken = actualTokens <= 128000 ? 0.00000075 : 0.0000015; // $0.75/$1.50 per 1M tokens
        }
        break;
      default:
        costPerToken = 0.00001; // Default fallback
    }

    const cost = actualTokens * costPerToken;
    console.log(`Cost calculation: ${actualTokens} tokens × $${costPerToken} = $${cost.toFixed(6)}`);
    return cost;
  }
}