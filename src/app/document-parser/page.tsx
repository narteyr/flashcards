'use client';

import { FormEvent, useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, Upload, FileText, Loader2, CheckCircle2, BookOpen, Search, LogIn } from 'lucide-react';
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
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
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

  // Check authentication
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6 min-h-screen items-center justify-center">
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/30">
              <Sparkles className="h-8 w-8 text-[var(--primary)]" />
            </div>
            <CardTitle className="text-2xl">Sign In Required</CardTitle>
            <CardDescription className="mt-2">
              You need to be signed in to generate AI flashcards from your documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--secondary)] p-4">
              <h3 className="font-semibold text-[var(--foreground)] mb-2">What you'll get:</h3>
              <ul className="space-y-2 text-sm text-[var(--muted)]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[var(--success)] mt-0.5 flex-shrink-0" />
                  <span>Upload PDF, DOCX, TXT, CSV, and JSON files</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[var(--success)] mt-0.5 flex-shrink-0" />
                  <span>AI-powered flashcard generation from your documents</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[var(--success)] mt-0.5 flex-shrink-0" />
                  <span>Organize flashcards by course and program</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[var(--success)] mt-0.5 flex-shrink-0" />
                  <span>Practice and track your study progress</span>
                </li>
              </ul>
            </div>
            <Button onClick={signInWithGoogle} size="lg" className="w-full gap-2">
              <LogIn className="h-5 w-5" />
              Sign In with Google
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

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

    if (!user) {
      setStatus('Error: User not authenticated');
      return;
    }

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
          userId: user.uid,
          userName: user.displayName || user.email || 'Anonymous',
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
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6 min-h-screen animate-fade-in">
      {/* Header Section */}
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-[var(--muted)] shadow-sm border border-[var(--border)] mb-4">
          <Sparkles className="h-4 w-4 text-[var(--primary)]" />
          AI-Powered Flashcard Generator
        </div>
        <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
          Transform Documents into Flashcards
        </h1>
        <p className="text-[var(--muted)] max-w-2xl mx-auto">
          Upload your study materials and let AI generate smart flashcards automatically. Supports PDF, DOCX, TXT, CSV, and JSON files.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-[var(--primary)]" />
            Upload & Generate
          </CardTitle>
          <CardDescription>
            Select your documents and course to create an AI-powered flashcard deck
          </CardDescription>
        </CardHeader>
        <CardContent>

        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="files" className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[var(--primary)]" />
              Documents
            </Label>
            <div className="relative">
              <input
                id="files"
                className="block w-full cursor-pointer rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--secondary)] p-4 text-sm text-[var(--foreground)] transition-all file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-[var(--primary)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                type="file"
                name="files"
                accept=".txt,.csv,.json,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                multiple
                required
              />
            </div>
            <p className="text-xs text-[var(--muted)]">
              Supported formats: PDF, DOCX, TXT, CSV, JSON
            </p>
          </div>

          {/* Program Selection */}
          <div className="space-y-2">
            <Label htmlFor="programCode" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[var(--primary)]" />
              Program / Department
            </Label>
            <select
              id="programCode"
              className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-4 py-2 text-sm text-[var(--foreground)] shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
              name="programCode"
              value={selectedProgram}
              onChange={(event) => {
                setSelectedProgram(event.target.value);
                setSelectedCourse('');
                setCourseSearchQuery('');
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
            <p className="text-xs text-[var(--muted)]">
              Choose the department for your flashcard deck
            </p>
          </div>

          {/* Course Selection */}
          {selectedProgram && (
            <div className="space-y-2">
              <Label htmlFor="courseSearch" className="flex items-center gap-2">
                <Search className="h-4 w-4 text-[var(--primary)]" />
                Course
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <Input
                  id="courseSearch"
                  type="text"
                  placeholder="Search by course number or title..."
                  value={courseSearchQuery}
                  onChange={(e) => setCourseSearchQuery(e.target.value)}
                  disabled={loadingCourses}
                  className="pl-10"
                />
              </div>

              {loadingCourses ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card-bg)]">
                  {filteredCourses.length === 0 ? (
                    <p className="p-4 text-center text-sm text-[var(--muted)]">
                      {courseSearchQuery ? 'No courses match your search.' : 'No courses available.'}
                    </p>
                  ) : (
                    <div className="divide-y divide-[var(--border)]">
                      {filteredCourses.map((course) => (
                        <label
                          key={course.code}
                          className={`flex cursor-pointer items-start gap-3 p-3 transition-all hover:bg-[var(--card-hover)] ${
                            selectedCourse === course.code ? 'bg-[var(--secondary)] border-l-2 border-[var(--primary)]' : ''
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
                            className="mt-1 h-4 w-4 cursor-pointer accent-[var(--primary)]"
                            required
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-[var(--foreground)]">{course.code}</div>
                            <div className="text-xs text-[var(--muted)]">{course.name}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-[var(--muted)]">
                Search and select a course for these flashcards
              </p>
            </div>
          )}
          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || !selectedCourse}
            size="lg"
            className="w-full gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Upload & Generate Flashcards
              </>
            )}
          </Button>
        </form>

        {/* Progress Section */}
        {(isSubmitting || status) && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              <span>{progress.label}</span>
              <span>{progress.value}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--secondary)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-blue-600 transition-all duration-500 ease-out"
                style={{ width: `${progress.value}%` }}
              />
            </div>
            {status && (
              <div className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--secondary)] p-4">
                {progress.value === 100 ? (
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-[var(--success)]" />
                ) : (
                  <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin text-[var(--primary)]" />
                )}
                <p className="text-sm text-[var(--foreground)]">{status}</p>
              </div>
            )}
          </div>
        )}

        {/* Metadata */}
        {(provider || courseId) && (
          <div className="mt-4 flex flex-wrap gap-4 text-xs">
            {provider && (
              <div className="flex items-center gap-2 rounded-full bg-[var(--secondary)] px-3 py-1 border border-[var(--border)]">
                <span className="text-[var(--muted)]">Provider:</span>
                <span className="font-semibold text-[var(--foreground)]">{provider}</span>
              </div>
            )}
            {courseId && (
              <div className="flex items-center gap-2 rounded-full bg-[var(--secondary)] px-3 py-1 border border-[var(--border)]">
                <span className="text-[var(--muted)]">Course ID:</span>
                <span className="font-semibold text-[var(--foreground)]">{courseId}</span>
              </div>
            )}
          </div>
        )}
        </CardContent>
      </Card>

      {/* Chunk Preview */}
      {summaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[var(--primary)]" />
              Document Chunks
            </CardTitle>
            <CardDescription>
              Preview of how your documents were split for processing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {summaries.map((result) => (
              <div key={result.filename} className="rounded-lg border border-[var(--border)] bg-[var(--secondary)] p-4">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <span className="font-medium text-[var(--foreground)] text-sm">{result.filename}</span>
                  <span className="rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-medium text-[var(--primary)] border border-[var(--primary)]/30">
                    {result.chunkCount} chunks
                  </span>
                </div>
                <div className="space-y-2">
                  {result.preview.map((chunk, index) => (
                    <div key={index} className="rounded-lg bg-[var(--card-bg)] p-3 border border-[var(--border)]">
                      <p className="font-mono text-xs leading-relaxed text-[var(--muted)]">
                        {chunk}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Generated Flashcards */}
      {flashcards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[var(--primary)]" />
              Generated Flashcards
            </CardTitle>
            <CardDescription>
              {flashcards.length} AI-generated flashcards ready for studying
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {flashcards.map((card) => (
                <div
                  key={card.id}
                  className="group relative overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4 transition-all hover:bg-[var(--card-hover)] hover:shadow-[var(--shadow-lg)]"
                >
                  {/* Front */}
                  <div className="mb-4">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                      Question
                    </p>
                    <p className="text-sm font-semibold text-[var(--foreground)] leading-relaxed">
                      {card.front}
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="my-3 border-t border-[var(--border)]"></div>

                  {/* Back */}
                  <div className="mb-4">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                      Answer
                    </p>
                    <p className="text-sm text-[var(--foreground)] leading-relaxed">
                      {card.back}
                    </p>
                  </div>

                  {/* Tags */}
                  {card.tags && card.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {card.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-[var(--accent)]/10 px-3 py-1 text-xs font-medium text-[var(--accent)] border border-[var(--accent)]/30"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

