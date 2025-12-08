import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { DocumentChunk, Flashcard } from './upload_docs';
import { parseFlashcardsResponse } from './upload_docs';
import flashcardSchema from './llm_schema.json';
import { resolveProvider } from './llm_config';

interface PromptOptions {
  topic?: string;
  tone?: 'concise' | 'detailed' | 'beginner' | 'advanced';
  maxCards?: number;
}

export interface QuizGenerationOptions extends PromptOptions {
  providerKey?: string;
  temperature?: number;
}

export interface QuizGenerationResult {
  providerKey: string;
  rawResponse: string;
  flashcards: Flashcard[];
}

export async function generateQuizFromChunks(
  chunks: DocumentChunk[],
  options: QuizGenerationOptions = {},
): Promise<QuizGenerationResult> {
  if (!chunks.length) {
    return { providerKey: options.providerKey ?? 'anthropic_claude', rawResponse: '[]', flashcards: [] };
  }

  const { key: providerKey, config } = await resolveProvider(options.providerKey);
  const apiKey = process.env[config.env_var];
  if (!apiKey) {
    throw new Error(`Missing API key for provider "${providerKey}". Expected env var ${config.env_var}.`);
  }

  const temperature = options.temperature ?? config.temperature ?? 0.2;
  const maxCards = options.maxCards ?? 20;
  const topic = options.topic ?? 'Study Material';
  const tone = options.tone ?? 'concise';

  const prompt = buildPrompt(chunks, { topic, tone, maxCards });
  const rawResponse = await invokeProvider({
    providerKey,
    config,
    apiKey,
    prompt,
    temperature,
  });

  const flashcards = parseFlashcardsResponse(rawResponse, chunks, maxCards);
  return { providerKey, rawResponse, flashcards };
}

interface InvokeInput {
  providerKey: string;
  config: Awaited<ReturnType<typeof resolveProvider>>['config'];
  apiKey: string;
  prompt: string;
  temperature: number;
}

async function invokeProvider({
  providerKey,
  config,
  apiKey,
  prompt,
  temperature,
}: InvokeInput): Promise<string> {
  if (config.provider === 'anthropic') {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: config.model,
      temperature,
      max_tokens: config.max_output_tokens ?? 4096,
      system: buildSystemInstructions(),
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });
    return extractText(response.content as AnthropicContentBlock[]);
  }

  if (config.provider === 'google') {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: config.model,
      systemInstruction: buildSystemInstructions(),
    });
    const result = await model.generateContent({
      generationConfig: {
        temperature,
        maxOutputTokens: config.max_output_tokens ?? 2048,
        responseMimeType: 'application/json',
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    });
    return result.response.text();
  }

  if (config.provider === 'openai') {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: config.model,
      temperature,
      max_tokens: config.max_output_tokens ?? 4096,
      messages: [
        {
          role: 'system',
          content: buildSystemInstructions(),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
    });
    return completion.choices[0]?.message?.content ?? '';
  }

  throw new Error(`Unsupported provider "${providerKey}" (${config.provider})`);
}

function buildPrompt(chunks: DocumentChunk[], options: PromptOptions): string {
  const schema = JSON.stringify(flashcardSchema, null, 2);
  const chunkPrompts = chunks
    .slice(0, 25)
    .map(
      (chunk) =>
        `Chunk ${chunk.chunkIndex} (ID: ${chunk.chunkId})\n${truncate(chunk.pageContent, 1600)}\n`,
    )
    .join('\n');

  return [
    `Generate high-quality flashcards from the supplied study material.`,
    `Topic: ${options.topic ?? 'Study Material'}`,
    `Tone: ${options.tone ?? 'concise'}`,
    `Return up to ${options.maxCards ?? 20} flashcards in JSON.`,
    `The JSON response MUST conform to this schema:\n${schema}`,
    '',
    'Source Chunks:',
    chunkPrompts,
  ].join('\n');
}

function buildSystemInstructions(): string {
  return [
    'You are a tutor that creates accurate study flashcards.',
    'Always respond with valid JSON that matches the provided schema.',
    'Do not include explanations outside the JSON structure.',
  ].join(' ');
}

type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | { type: string; [key: string]: unknown };

function extractText(content: AnthropicContentBlock[]): string {
  return content
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join('\n')
    .trim();
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 3)}...`;
}

