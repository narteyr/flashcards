import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  type ClaudeClient,
  type Document,
  type DocumentChunk,
  type DocumentLoader,
  type DocumentLoaderFactory,
  type FlashcardRepository,
  type FlashcardOptions,
  type JobStatus,
  type JobStatusTracker,
  type StatusPayload,
  type StorageService,
  type UploadedFile,
  handleUpload,
  loadDocuments,
  generateFlashcards,
  persistFlashcards,
  updateJobStatus,
} from '../upload_docs';

const baseFile: UploadedFile = {
  id: 'file-1',
  jobId: 'job-1',
  userId: 'user-1',
  name: 'notes.txt',
  size: 12,
  mimeType: 'text/plain',
  uri: 'memory://file-1',
};

describe('loadDocuments', () => {
  it('decorates loaded documents with file metadata', async () => {
    const loader: DocumentLoader = {
      load: vi.fn(async (): Promise<Document[]> => [
        {
          id: 'doc-1',
          pageContent: 'Chapter 1 content',
          metadata: { page: 1 },
        },
      ]),
    };
    const factory: DocumentLoaderFactory = vi.fn(() => loader);

    const result = await loadDocuments([baseFile], factory);

    expect(result).toHaveLength(1);
    expect(result[0].metadata.sourceFileId).toBe('file-1');
    expect(factory).toHaveBeenCalledWith(baseFile);
    expect(loader.load).toHaveBeenCalledWith(baseFile);
  });

  it('throws when loader is missing', async () => {
    const factory: DocumentLoaderFactory = () => undefined;
    await expect(loadDocuments([baseFile], factory)).rejects.toThrow(
      /No document loader registered/,
    );
  });
});

describe('generateFlashcards', () => {
  const chunks: DocumentChunk[] = [
    {
      id: 'doc-1',
      chunkId: 'chunk-1',
      chunkIndex: 0,
      pageContent: 'Photosynthesis is the process used by plants to convert light energy.',
      metadata: {},
    },
  ];

  it('returns parsed flashcards from Claude response', async () => {
    const claude: ClaudeClient = {
      generateFlashcards: vi.fn(async () => JSON.stringify([
        {
          front: 'What is photosynthesis?',
          back: 'The process by which plants convert light energy into chemical energy.',
          tags: ['biology'],
        },
      ])),
    };

    const result = await generateFlashcards(chunks, { topic: 'Biology' }, claude);

    expect(result).toHaveLength(1);
    expect(result[0].front).toContain('photosynthesis');
    expect(claude.generateFlashcards).toHaveBeenCalled();
  });

  it('throws when Claude response is malformed', async () => {
    const claude: ClaudeClient = {
      generateFlashcards: vi.fn(async () => 'invalid response'),
    };
    await expect(generateFlashcards(chunks, {}, claude)).rejects.toThrow(/did not include JSON/);
  });
});

describe('persistFlashcards', () => {
  it('persists flashcards via repository', async () => {
    const repository: FlashcardRepository = {
      saveFlashcards: vi.fn(async () => undefined),
    };
    await persistFlashcards(
      'user-1',
      [
        {
          id: 'card-1',
          front: 'Q',
          back: 'A',
          tags: ['tag'],
        },
      ],
      {
        jobId: 'job-1',
        files: [{ id: 'file-1', name: 'notes.txt', uri: 'memory://file-1' }],
        options: {},
        createdAt: new Date().toISOString(),
      },
      repository,
    );

    expect(repository.saveFlashcards).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
      }),
    );
  });
});

describe('updateJobStatus', () => {
  let statusMap: Map<string, JobStatus>;
  let tracker: JobStatusTracker;

  beforeEach(() => {
    statusMap = new Map();
    tracker = {
      get: vi.fn(async (jobId: string) => statusMap.get(jobId)),
      set: vi.fn(async (jobId: string, status: JobStatus, _payload?: StatusPayload) => {
        statusMap.set(jobId, status);
      }),
    };
  });

  it('allows valid status transitions', async () => {
    await updateJobStatus('job-1', 'queued', undefined, tracker);
    await updateJobStatus('job-1', 'parsing', undefined, tracker);
    await updateJobStatus('job-1', 'generating', undefined, tracker);
    await updateJobStatus('job-1', 'complete', undefined, tracker);
    expect(tracker.set).toHaveBeenCalledTimes(4);
  });

  it('rejects invalid transitions', async () => {
    statusMap.set('job-1', 'queued');
    await expect(updateJobStatus('job-1', 'complete', undefined, tracker)).rejects.toThrow(
      /Invalid status transition/,
    );
  });
});

describe('handleUpload', () => {
  const makeFile = (content: string, name: string, type: string): File =>
    new File([content], name, { type });

  const buildDependencies = () => {
    const storage: StorageService = {
      saveFile: vi.fn(async (file: File, context) => ({
        id: `stored-${file.name}`,
        jobId: context.jobId,
        userId: context.userId,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        uri: `memory://${file.name}`,
      })),
    };

    const loader: DocumentLoader = {
      load: vi.fn(async () => [
        {
          id: 'doc-1',
          pageContent: 'Study content',
          metadata: {},
        },
      ]),
    };

    const loaderFactory: DocumentLoaderFactory = vi.fn(() => loader);

    const splitter = {
      splitDocuments: vi.fn(async (documents: Document[]): Promise<DocumentChunk[]> =>
        documents.map((doc, index) => ({
          ...doc,
          chunkId: `chunk-${index}`,
          chunkIndex: index,
        })),
      ),
    };

    const claude: ClaudeClient = {
      generateFlashcards: vi.fn(async () =>
        JSON.stringify([
          { front: 'Front', back: 'Back', tags: ['tag'] },
        ]),
      ),
    };

    const repository: FlashcardRepository = {
      saveFlashcards: vi.fn(async () => undefined),
    };

    const statusTracker: JobStatusTracker = {
      get: vi.fn(async () => undefined),
      set: vi.fn(async () => undefined),
    };

    const flashcardOptions: FlashcardOptions = {
      maxCards: 5,
    };

    return {
      storage,
      loaderFactory,
      splitter,
      claude,
      repository,
      statusTracker,
      flashcardOptions,
    };
  };

  it('processes upload and returns success response', async () => {
    const deps = buildDependencies();
    const file = makeFile('Hello world', 'study.txt', 'text/plain');
    const formData = new FormData();
    formData.append('files', file);
    formData.append('userId', 'user-1');
    formData.append('topic', 'Sample Topic');

    const request = {
      method: 'POST',
      formData: async () => formData,
    } as unknown as Request;

    const response = await handleUpload(request, deps);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.flashcardCount).toBe(1);
    expect(deps.storage.saveFile).toHaveBeenCalled();
    expect(deps.repository.saveFlashcards).toHaveBeenCalled();
  });

  it('rejects unsupported files', async () => {
    const deps = buildDependencies();
    const file = makeFile('bad', 'image.gif', 'image/gif');
    const formData = new FormData();
    formData.append('files', file);
    const request = {
      method: 'POST',
      formData: async () => formData,
    } as unknown as Request;

    const response = await handleUpload(request, deps);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/No valid files/);
  });
});

