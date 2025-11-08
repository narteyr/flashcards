import { NextRequest } from 'next/server';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Buffer } from 'node:buffer';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { generateQuizFromChunks } from '../../document-parser/llm_client';
import type { DocumentChunk } from '../../document-parser/upload_docs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 100;

export async function POST(request: NextRequest): Promise<Response> {
  const contentType = request.headers.get('content-type');
  if (!contentType?.includes('multipart/form-data')) {
    return response({ error: 'Request must be multipart/form-data' }, 400);
  }

  const formData = await request.formData();

  const rawFiles = formData.getAll('files');
  const courseId = formData.get('courseId');

  if (!rawFiles.length) {
    return response({ error: 'No files uploaded' }, 400);
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: DEFAULT_CHUNK_SIZE,
    chunkOverlap: DEFAULT_CHUNK_OVERLAP,
  });

  const summaries: Array<{
    filename: string;
    chunkCount: number;
    preview: string[];
  }> = [];
  const allChunks: DocumentChunk[] = [];

  for (const entry of rawFiles) {
    if (!(entry instanceof File)) {
      continue;
    }

    const text = await toText(entry);
  if (!text) {
      console.warn(`Skipping ${entry.name}: unsupported MIME type "${entry.type}"`);
      continue;
    }

    const documents = await splitter.createDocuments(
      [text],
      undefined,
      {
        chunkHeader: `File: ${entry.name}\n---\n`,
      },
    );

    const chunks = documents.map((doc, index) => {
      const chunk: DocumentChunk = {
        id: doc.metadata?.id ? String(doc.metadata.id) : `${entry.name}-doc-${index}`,
        chunkId: doc.metadata?.chunkId ? String(doc.metadata.chunkId) : `${entry.name}-chunk-${index}`,
        chunkIndex: index,
        pageContent: doc.pageContent,
        metadata: {
          ...doc.metadata,
          sourceFileName: entry.name,
          sourceMimeType: entry.type,
        },
      };
      return chunk;
    });

    chunks.forEach((chunk, index) => {
      console.log(`[${entry.name}] Chunk ${index + 1}/${chunks.length}\n${chunk.pageContent}\n`);
    });

    allChunks.push(...chunks);

    summaries.push({
      filename: entry.name,
      chunkCount: chunks.length,
      preview: chunks.slice(0, 3).map((chunk) => chunk.pageContent),
    });
  }

  if (!summaries.length) {
    return response({ error: 'No supported files processed' }, 415);
  }

  try {
    const quiz = await generateQuizFromChunks(allChunks);

    return response({
      message: 'Flashcards generated successfully',
      provider: quiz.providerKey,
      chunkCount: allChunks.length,
      courseId: courseId ? String(courseId) : undefined,
      summaries,
      flashcards: quiz.flashcards,
    });
  } catch (error) {
    console.error('Flashcard generation failed', error);
    return response(
      {
        error: 'Failed to generate flashcards',
        details: error instanceof Error ? error.message : 'Unknown error',
        summaries,
      },
      500,
    );
  }
}

function response(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function toText(file: File): Promise<string | null> {
  if (file.type === 'text/plain' || file.type === 'text/csv') {
    return file.text();
  }

  if (file.type === 'application/pdf') {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const parsed = await pdf(buffer);
      return parsed.text;
    } catch (error) {
      console.error(`Failed to parse PDF ${file.name}`, error);
      return null;
    }
  }

  if (
    file.type ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      console.error(`Failed to parse DOCX ${file.name}`, error);
      return null;
    }
  }

  if (file.type === 'application/json') {
    const text = await file.text();
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch (error) {
      console.warn(`Failed to parse JSON from ${file.name}`, error);
      return text;
    }
  }

  return null;
}

