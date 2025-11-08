# Document Parser Module

## User Requirements
- Allow authenticated users to upload study materials in `pdf`, `docx`, `txt`, `csv`, `png`, and `jpg` formats.
- Persist original files alongside derived text so users can revisit and reprocess them.
- Provide clear feedback on upload progress, parsing status, and flashcard generation outcomes.
- Support batching multiple documents per session and merge content into a single study set when requested.
- Ensure data privacy by isolating user uploads and removing temporary artifacts after processing.

## Data Workflow
- **Upload:** Client sends one or more files to `upload_docs.ts`; validate MIME type, file size limits, and associate each file with the current user/session.
- **Storage:** Save raw binaries to object storage (e.g., S3, GCS, or local bucket) and register metadata in the app datastore (filename, size, checksum, status).
- **Parsing:** Invoke LangChain loaders that map file types to extractors (`PyPDFLoader`, `Docx2txtLoader`, `CSVLoader`, `UnstructuredImageLoader`, etc.) and normalize outputs to `Document` objects.
- **Chunking:** Apply a text splitter (e.g., `RecursiveCharacterTextSplitter` with sensible `chunk_size`/`chunk_overlap`) to produce manageable context windows for downstream LLM calls.
- **LLM Prompting:** Aggregate chunks or summaries and call the Claude API (via `@anthropic-ai/sdk`) with a flashcard prompt template, optionally streaming results for responsiveness.
- **Post-processing:** Parse Claude responses into structured flashcard entries (`front`, `back`, optional `tags`) and persist them to the study set collection.
- **Feedback Loop:** Update job status (queued ➝ parsing ➝ generating ➝ complete/failed) and notify the UI through polling or websockets.

## Core Functions
- `handleUpload(request: NextRequest): Promise<Response>` – validates request, extracts files, and enqueues parsing jobs.
- `loadDocuments(fileRefs: UploadedFile[]): Promise<Document[]>` – selects LangChain document loaders/splitters per file type and returns normalized documents.
- `generateFlashcards(chunks: DocumentChunk[], options: FlashcardOptions): Promise<Flashcard[]>` – crafts Claude prompts, handles retries, and returns typed flashcards.
- `persistFlashcards(userId: string, flashcards: Flashcard[], metadata: GenerationMetadata): Promise<void>` – stores generated cards and audit details.
- `updateJobStatus(jobId: string, status: JobStatus, payload?: StatusPayload): Promise<void>` – central status tracker for UI updates and alerting.

## Implementation Notes
- Configure LangChain loaders in a factory to simplify adding new file types; wrap in try/catch to recover gracefully from partial failures.
- Use streaming uploads (`formidable`, `busboy`, or native Next.js App Router `formData()`) to avoid buffering large files in memory.
- Limit chunk size passed to Claude to respect token usage; consider summarizing oversized chunks before prompting.
- Implement request deduplication by hashing file contents to skip regenerating flashcards for identical uploads.
- Store Claude API keys in environment variables (`ANTHROPIC_API_KEY`) and gate server actions with role checks to prevent misuse.
- Configure other LLM providers via `llm_options.yml`; populate the corresponding environment variables (e.g., `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`) in `.env` or shell profiles before invoking quiz generation.
- Use `llm_config.ts` and `llm_client.ts` helpers to load provider metadata, route chunk batches to the chosen LLM, and ensure outputs follow the schema defined in `llm_schema.json`.
- The UI at `/document-parser` now surfaces a progress bar through upload → chunking → generation and renders the generated flashcards returned by the API.
- Users can associate generated flashcards with a course via the dropdown selector (hard-coded options today; planned Firestore integration will hydrate this list dynamically).
- PDF support leverages `pdf-parse`, while DOCX files are converted via `mammoth` before chunking.
- Capture telemetry (processing time, token counts, errors) to monitor costs and reliability.
- Write integration tests that mock LangChain loaders and Claude responses to verify end-to-end workflow without hitting external services.

