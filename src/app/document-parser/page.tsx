'use client';

import { FormEvent, useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

interface Program {
  code: string;
  name: string;
  totalCourses: number;
}

interface Course {
  code: string;
  name: string;
}

const PROGRESS_STEPS: Array<{ label: string; value: number }> = [
  { label: 'Preparing upload', value: 10 },
  { label: 'Uploading files', value: 30 },
  { label: 'Splitting chunks', value: 60 },
  { label: 'Generating flashcards', value: 90 },
  { label: 'Complete', value: 100 },
];

export default function DocumentParserPage() {
  const router = useRouter();
  const [progressIndex, setProgressIndex] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<UploadSummary[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [provider, setProvider] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [courseId, setCourseId] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  // Program and course selection states
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [selectedCourseName, setSelectedCourseName] = useState<string>('');
  const [selectedProgramName, setSelectedProgramName] = useState<string>('');

  const progress = useMemo(() => PROGRESS_STEPS[Math.min(progressIndex, PROGRESS_STEPS.length - 1)], [progressIndex]);

  // Load programs on mount
  useEffect(() => {
    async function fetchPrograms() {
      setLoadingPrograms(true);
      try {
        const response = await fetch('/api/programs');
        const data = await response.json();
        if (data.status === 'ok') {
          setPrograms(data.programs);
        }
      } catch (error) {
        console.error('Error fetching programs:', error);
      } finally {
        setLoadingPrograms(false);
      }
    }
    fetchPrograms();
  }, []);

  // Load courses when program is selected
  useEffect(() => {
    async function fetchCourses() {
      if (!selectedProgram) {
        setCourses([]);
        return;
      }

      setLoadingCourses(true);
      try {
        const response = await fetch(`/api/programs/courses?programCode=${selectedProgram}`);
        const data = await response.json();
        if (data.status === 'ok') {
          setCourses(data.courses);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoadingCourses(false);
      }
    }
    fetchCourses();
  }, [selectedProgram]);

  // Filter courses based on search query
  const filteredCourses = useMemo(() => {
    if (!courseSearchQuery.trim()) {
      return courses;
    }
    const query = courseSearchQuery.toLowerCase();
    return courses.filter(
      (course) =>
        course.code.toLowerCase().includes(query) ||
        course.name.toLowerCase().includes(query)
    );
  }, [courses, courseSearchQuery]);

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
      formData.append('courseName', selectedCourseName);
      formData.append('programCode', selectedProgram);
      formData.append('programName', selectedProgramName);
    }

    try {
      // Step 1: Check if deck already exists
      setProgressIndex(0);
      setStatus('Checking for existing deck...');
      
      const deckCheckResponse = await fetch(`/api/decks?courseCode=${encodeURIComponent(selectedCourse)}`);
      const deckCheckData = await deckCheckResponse.json();
      
      let existingFlashcards: Flashcard[] = [];
      if (deckCheckData.exists && deckCheckData.deck) {
        existingFlashcards = deckCheckData.deck.flashcards || [];
        setStatus(`Found existing deck with ${existingFlashcards.length} flashcards. Enriching...`);
      } else {
        setStatus('Creating new deck...');
      }

      // Step 2: Upload files
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
      setStatus('Generating flashcards with AI…');

      setSummaries(payload.summaries ?? []);
      const newFlashcards = payload.flashcards ?? [];
      setFlashcards(newFlashcards);
      setProvider(payload.provider ?? null);
      setCourseId(payload.courseId ?? null);

      // Step 3: Save to deck
      setProgressIndex(3);
      setStatus('Saving flashcards to deck…');

      const saveDeckResponse = await fetch('/api/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseCode: selectedCourse,
          courseName: selectedCourseName,
          programCode: selectedProgram,
          programName: selectedProgramName,
          flashcards: newFlashcards,
          userId: 'anonymous', // TODO: Add actual user authentication
        }),
      });

      const saveDeckData = await saveDeckResponse.json();
      if (!saveDeckResponse.ok) {
        throw new Error(saveDeckData?.error ?? 'Failed to save deck');
      }

      setProgressIndex(4);
      setStatus(`${saveDeckData.message} - Redirecting to practice...`);

      // Step 4: Navigate to deck practice page
      setTimeout(() => {
        router.push(`/decks/${encodeURIComponent(selectedCourse.replace(/\s+/g, '_'))}`);
      }, 1500);
      
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
        <h1 className="text-2xl font-semibold text-slate-900">Document Parser & Flashcard Generator</h1>
        <p className="mt-2 text-sm text-slate-600">
          Upload plain text, CSV, JSON, PDF, or DOCX files. The server will split them with LangChain and generate
          flashcards with your configured LLM provider. Each group of flashcards is called a deck, and there will be one deck per course.
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
              Program / Department
              <select
                className="mt-1 block w-full cursor-pointer rounded-md border border-slate-300 bg-slate-50 p-2 text-sm"
                name="programCode"
                value={selectedProgram}
                onChange={(event) => {
                  setSelectedProgram(event.target.value);
                  setSelectedCourse('');
                  setCourseSearchQuery('');
                  // Store program name
                  const program = programs.find(p => p.code === event.target.value);
                  setSelectedProgramName(program?.name || '');
                }}
                disabled={loadingPrograms}
                required
              >
                <option value="">
                  {loadingPrograms ? 'Loading programs...' : 'Select a program/department'}
                </option>
                {programs.map((program) => (
                  <option key={program.code} value={program.code}>
                    {program.code} - {program.name} ({program.totalCourses} courses)
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Select the department/program for this deck.
            </p>
          </div>

          {selectedProgram && (
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Course
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-slate-50 p-2 text-sm"
                  placeholder="Search by course number or title..."
                  value={courseSearchQuery}
                  onChange={(e) => setCourseSearchQuery(e.target.value)}
                  disabled={loadingCourses}
                />
              </label>
              
              {loadingCourses ? (
                <p className="mt-2 text-sm text-slate-500">Loading courses...</p>
              ) : (
                <div className="mt-2 max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white">
                  {filteredCourses.length === 0 ? (
                    <p className="p-3 text-sm text-slate-500">
                      {courseSearchQuery ? 'No courses match your search.' : 'No courses available.'}
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {filteredCourses.map((course) => (
                        <label
                          key={course.code}
                          className={`flex cursor-pointer items-start gap-3 p-3 transition hover:bg-slate-50 ${
                            selectedCourse === course.code ? 'bg-slate-100' : ''
                          }`}
                        >
                          <input
                            type="radio"
                            name="courseId"
                            value={course.code}
                            checked={selectedCourse === course.code}
                            onChange={(e) => {
                              setSelectedCourse(e.target.value);
                              setSelectedCourseName(course.name);
                            }}
                            className="mt-1 cursor-pointer"
                            required
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-slate-900">{course.code}</div>
                            <div className="text-xs text-slate-600">{course.name}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              <p className="mt-1 text-xs text-slate-500">
                Search and select a course for these flashcards.
              </p>
            </div>
          )}
          <button
            className="inline-flex w-fit items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            type="submit"
            disabled={isSubmitting || !selectedCourse}
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

