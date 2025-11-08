'use client';

import { FormEvent, useMemo, useState } from 'react';
import type { Flashcard } from './upload_docs';

interface UploadSummary {
  filename: string;
  chunkCount: number;
  preview: string[];
}

interface ApiResponse {
  message: string;
  provider: string;
  chunkCount: number;
  summaries: UploadSummary[];
  flashcards: Flashcard[];
  error?: string;
  courseId?: string;
}

const PROGRESS_STEPS: Array<{ label: string; value: number }> = [
  { label: 'Preparing upload', value: 10 },
  { label: 'Uploading files', value: 30 },
  { label: 'Splitting chunks', value: 60 },
  { label: 'Generating flashcards', value: 90 },
  { label: 'Complete', value: 100 },
];

export default function DocumentParserPage() {
  const [progressIndex, setProgressIndex] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<UploadSummary[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [provider, setProvider] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>('course-intro-ai');
  const [courseId, setCourseId] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const progress = useMemo(() => PROGRESS_STEPS[Math.min(progressIndex, PROGRESS_STEPS.length - 1)], [progressIndex]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setProgressIndex(0);
    setStatus('Preparing upload');
    setSummaries([]);
    setFlashcards([]);
    setProvider(null);

    const formData = new FormData(event.currentTarget);
    if (selectedCourse) {
      formData.append('courseId', selectedCourse);
    }

    try {
      setProgressIndex(1);
      setStatus('Uploading files…');

      const response = await fetch('/api/document-parser', {
        method: 'POST',
        body: formData,
      });

      setProgressIndex(2);
      setStatus('Processing document chunks…');

      const payload: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message ?? payload?.error ?? 'Upload failed');
      }

      setProgressIndex(3);
      setStatus('Generating flashcards…');

      setSummaries(payload.summaries ?? []);
      setFlashcards(payload.flashcards ?? []);
      setProvider(payload.provider ?? null);
      setCourseId(payload.courseId ?? null);

      setProgressIndex(4);
      setStatus(payload.message ?? 'Flashcards ready');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      setStatus(`Error: ${message}`);
      setProgressIndex(0);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Document Parser & Quiz Generator</h1>
        <p className="mt-2 text-sm text-slate-600">
          Upload plain text, CSV, JSON, PDF, or DOCX files. The server will split them with LangChain and generate
          flashcards with your configured LLM provider.
        </p>

        <form className="mt-4 flex flex-col gap-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Documents
              <input
                className="mt-1 block w-full cursor-pointer rounded-md border border-slate-300 bg-slate-50 p-2 text-sm"
                type="file"
                name="files"
                accept=".txt,.csv,.json,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                multiple
                required
              />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Course
              <select
                className="mt-1 block w-full cursor-pointer rounded-md border border-slate-300 bg-slate-50 p-2 text-sm"
                name="courseId"
                value={selectedCourse}
                onChange={(event) => setSelectedCourse(event.target.value)}
              >
                <option value="course-intro-ai">Introduction to AI</option>
                <option value="course-data-structures">Data Structures</option>
                <option value="course-organic-chem">Organic Chemistry</option>
                <option value="course-world-history">World History Survey</option>
              </select>
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Select the course where these flashcards should be stored. Future versions will load this list from
              Firestore.
            </p>
          </div>
          <button
            className="inline-flex w-fit items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing…' : 'Upload & Generate'}
          </button>
        </form>

        <div className="mt-6">
          <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-500">
            <span>{progress.label}</span>
            <span>{progress.value}%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-900 transition-all duration-500 ease-out"
              style={{ width: `${progress.value}%` }}
            />
          </div>
          {status && (
            <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{status}</p>
          )}
        </div>

        {provider && (
          <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
            Provider: <span className="font-semibold text-slate-900">{provider}</span>
          </p>
        )}
        {courseId && (
          <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
            Course ID: <span className="font-semibold text-slate-900">{courseId}</span>
          </p>
        )}
      </section>

      {summaries.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">Chunk Preview</h2>
          {summaries.map((result) => (
            <article key={result.filename} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <header className="flex justify-between gap-4 text-sm text-slate-600">
                <span className="font-medium text-slate-800">{result.filename}</span>
                <span>{result.chunkCount} chunks</span>
              </header>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {result.preview.map((chunk, index) => (
                  <li key={index} className="rounded bg-slate-50 p-3 font-mono text-xs leading-relaxed">
                    {chunk}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      )}

      {flashcards.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">Generated Flashcards</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {flashcards.map((card) => (
              <article key={card.id} className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <header>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Front</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{card.front}</p>
                </header>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Back</p>
                  <p className="mt-1 text-sm text-slate-800">{card.back}</p>
                </div>
                {card.tags && card.tags.length > 0 && (
                  <footer className="flex flex-wrap gap-2">
                    {card.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {tag}
                      </span>
                    ))}
                  </footer>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

