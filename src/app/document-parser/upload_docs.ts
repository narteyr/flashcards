/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-explicit-any */
// we allow user to upload documents which includes pdf, docx, csv, txt, png, jpg

const DEFAULT_ALLOWED_MIME_TYPES = new Set<string>([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'image/png',
  'image/jpeg',
]);

const DEFAULT_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

export type JobStatus = 'queued' | 'parsing' | 'generating' | 'complete' | 'failed';

export interface StatusPayload {
  files?: Array<Pick<UploadedFile, 'id' | 'name' | 'size' | 'mimeType'>>;
  documentCount?: number;
  chunkCount?: number;
  flashcardCount?: number;
  error?: string;
  [key: string]: unknown;
}

export interface JobStatusTracker {
  get?(jobId: string): Promise<JobStatus | undefined>;
  set(jobId: string, status: JobStatus, payload?: StatusPayload): Promise<void>;
}

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export interface UploadedFile {
  id: string;
  userId: string;
  jobId: string;
  name: string;
  size: number;
  mimeType: string;
  uri: string;
  checksum?: string;
  metadata?: Record<string, unknown>;
}

export interface StorageService {
  saveFile(file: File, context: { userId: string; jobId: string }): Promise<UploadedFile>;
}

export interface Document {
  id: string;
  pageContent: string;
  metadata: Record<string, unknown>;
}

export interface DocumentChunk extends Document {
  chunkIndex: number;
  chunkId: string;
}

export interface DocumentLoader {
  load(file: UploadedFile): Promise<Document[]>;
}

export type DocumentLoaderFactory = (file: UploadedFile) => DocumentLoader | undefined;

export interface TextSplitter {
  splitDocuments(documents: Document[]): Promise<DocumentChunk[]>;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  tags?: string[];
  sourceChunkIds?: string[];
}

export interface FlashcardOptions {
  topic?: string;
  tone?: 'concise' | 'detailed' | 'beginner' | 'advanced';
  maxCards?: number;
  temperature?: number;
}

export interface GenerationMetadata {
  jobId: string;
  files: Array<Pick<UploadedFile, 'id' | 'name' | 'uri'>>;
  options: FlashcardOptions;
  createdAt: string;
}

export interface FlashcardRepository {
  saveFlashcards(input: {
    userId: string;
    flashcards: Flashcard[];
    metadata: GenerationMetadata;
  }): Promise<void>;
}

export interface ClaudeClient {
  generateFlashcards(prompt: string, options: { temperature: number }): Promise<string>;
}

export interface UploadDependencies {
  storage: StorageService;
  loaderFactory: DocumentLoaderFactory;
  splitter: TextSplitter;
  claude: ClaudeClient;
  repository: FlashcardRepository;
  statusTracker: JobStatusTracker;
  logger?: Logger;
  allowedMimeTypes?: Set<string>;
  maxFileSizeBytes?: number;
  idGenerator?: () => string;
  flashcardOptions?: FlashcardOptions;
}

export async function handleUpload(request: Request, deps: UploadDependencies): Promise<Response> {
  if (request.method?.toUpperCase() !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  if (typeof (request as any).formData !== 'function') {
    return jsonResponse({ error: 'Invalid request payload' }, 400);
  }

  const formData = await (request as any).formData();
  const rawFiles = formData.getAll('files');
  if (!rawFiles.length) {
    return jsonResponse({ error: 'No files provided' }, 400);
  }

  const userId = String(formData.get('userId') ?? 'anonymous');
  const topic = formData.get('topic') ? String(formData.get('topic')) : undefined;
  const allowedTypes = deps.allowedMimeTypes ?? DEFAULT_ALLOWED_MIME_TYPES;
  const maxSize = deps.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES;

  const files: File[] = [];
  const errors: string[] = [];

  for (const entry of rawFiles) {
    if (!(entry instanceof File)) {
      errors.push('Encountered non-file value in files payload');
      continue;
    }
    if (!allowedTypes.has(entry.type)) {
      errors.push(`${entry.name} has unsupported type ${entry.type}`);
      continue;
    }
    if (entry.size > maxSize) {
      errors.push(`${entry.name} exceeds size limit`);
      continue;
    }
    files.push(entry);
  }

  if (!files.length) {
    return jsonResponse({ error: 'No valid files found', details: errors }, 400);
  }

  const jobId = (typeof deps.idGenerator === 'function'
    ? deps.idGenerator()
    : generateFallbackId());

  await updateJobStatus(jobId, 'queued', { files: files.map(toFileSummary) }, deps.statusTracker);

  deps.logger?.info('Upload received', { jobId, fileCount: files.length, userId });

  try {
    const uploadedFiles = await Promise.all(
      files.map((file) => deps.storage.saveFile(file, { userId, jobId })),
    );

    await updateJobStatus(jobId, 'parsing', { files: uploadedFiles.map(toFileSummary) }, deps.statusTracker);

    const documents = await loadDocuments(uploadedFiles, deps.loaderFactory);
    await updateJobStatus(jobId, 'generating', { documentCount: documents.length }, deps.statusTracker);

    const chunks = await deps.splitter.splitDocuments(documents);
    const flashcardOptions: FlashcardOptions = {
      ...deps.flashcardOptions,
      topic,
    };

    const flashcards = await generateFlashcards(chunks, flashcardOptions, deps.claude);
    await persistFlashcards(
      userId,
      flashcards,
      {
        jobId,
        files: uploadedFiles.map(({ id, name, uri }) => ({ id, name, uri })),
        options: flashcardOptions,
        createdAt: new Date().toISOString(),
      },
      deps.repository,
    );

    await updateJobStatus(jobId, 'complete', { flashcardCount: flashcards.length }, deps.statusTracker);

    deps.logger?.info('Flashcard generation completed', {
      jobId,
      flashcardCount: flashcards.length,
      userId,
    });

    return jsonResponse({
      jobId,
      flashcardCount: flashcards.length,
      message: 'Flashcards generated successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    deps.logger?.error('Flashcard generation failed', { jobId, error: message });
    await updateJobStatus(jobId, 'failed', { error: message }, deps.statusTracker);
    return jsonResponse({ error: 'Failed to process documents', details: message, jobId }, 500);
  }
}

export async function loadDocuments(
  files: UploadedFile[],
  loaderFactory: DocumentLoaderFactory,
): Promise<Document[]> {
  const documents: Document[] = [];
  for (const file of files) {
    const loader = loaderFactory(file);
    if (!loader) {
      throw new Error(`No document loader registered for ${file.mimeType}`);
    }
    const loaded = await loader.load(file);
    loaded.forEach((doc, index) => {
      documents.push({
        id: doc.id ?? `${file.id}:${index}`,
        pageContent: doc.pageContent,
        metadata: {
          ...doc.metadata,
          sourceFileId: file.id,
          sourceFileName: file.name,
          mediaType: file.mimeType,
        },
      });
    });
  }
  return documents;
}

export async function generateFlashcards(
  chunks: DocumentChunk[],
  options: FlashcardOptions,
  claude: ClaudeClient,
): Promise<Flashcard[]> {
  if (!chunks.length) {
    return [];
  }

  const maxCards = options.maxCards ?? 20;
  const temperature = options.temperature ?? 0.2;
  const topic = options.topic ?? 'Study Material';
  const tone = options.tone ?? 'concise';

  const chunkPrompts = chunks
    .slice(0, 25)
    .map((chunk) => `Chunk ${chunk.chunkIndex}: ${truncate(chunk.pageContent, 1200)}`);

  const prompt = [
    `You are an assistant that creates flashcards for learners.`,
    `Topic: ${topic}`,
    `Tone: ${tone}`,
    `Create up to ${maxCards} flashcards.`,
    `Respond with JSON using the shape [{ "front": "...", "back": "...", "tags": ["..."] }].`,
    `Use the supplied document chunks as source material.`,
    '',
    ...chunkPrompts,
  ].join('\n');

  const raw = await claude.generateFlashcards(prompt, { temperature });
  return parseFlashcardsResponse(raw, chunks, maxCards);
}

export async function persistFlashcards(
  userId: string,
  flashcards: Flashcard[],
  metadata: GenerationMetadata,
  repository: FlashcardRepository,
): Promise<void> {
  if (!flashcards.length) {
    return;
  }
  await repository.saveFlashcards({
    userId,
    flashcards,
    metadata,
  });
}

export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  payload: StatusPayload | undefined,
  tracker: JobStatusTracker,
): Promise<void> {
  const previous = tracker.get ? await tracker.get(jobId) : undefined;
  if (!previous && status !== 'queued') {
    throw new Error(`Job ${jobId} must start in queued state`);
  }
  if (previous) {
    const allowed = ALLOWED_STATUS_TRANSITIONS[previous] ?? [];
    if (!allowed.includes(status)) {
      throw new Error(`Invalid status transition from ${previous} to ${status}`);
    }
  }
  await tracker.set(jobId, status, payload);
}

const ALLOWED_STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  queued: ['parsing', 'failed'],
  parsing: ['generating', 'failed'],
  generating: ['complete', 'failed'],
  complete: [],
  failed: [],
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function toFileSummary(file: File | UploadedFile) {
  if (file instanceof File) {
    return {
      id: 'inline',
      name: file.name,
      size: file.size,
      mimeType: file.type,
    };
  }
  return {
    id: file.id,
    name: file.name,
    size: file.size,
    mimeType: file.mimeType,
  };
}

function generateFallbackId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `job_${Math.random().toString(36).slice(2, 10)}`;
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 3)}...`;
}

export function parseFlashcardsResponse(
  raw: string,
  chunks: DocumentChunk[],
  maxCards: number,
): Flashcard[] {
  const trimmed = raw.trim();
  const start = trimmed.indexOf('[');
  const end = trimmed.lastIndexOf(']');
  if (start === -1 || end === -1) {
    throw new Error('Claude response did not include JSON array');
  }
  const json = trimmed.slice(start, end + 1);
  let parsed: any[];
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new Error('Claude response JSON parse failed');
  }
  if (!Array.isArray(parsed)) {
    throw new Error('Claude response malformed: expected array');
  }
  const allowed = parsed.slice(0, maxCards);
  return allowed.map((entry, index) => ({
    id: `card_${index}`,
    front: String(entry.front ?? entry.question ?? ''),
    back: String(entry.back ?? entry.answer ?? ''),
    tags: Array.isArray(entry.tags) ? entry.tags.map(String) : undefined,
    sourceChunkIds: Array.isArray(entry.sourceChunkIds)
      ? entry.sourceChunkIds.map(String)
      : chunks.slice(index, index + 1).map((chunk) => chunk.chunkId),
  }));
}

