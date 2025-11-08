'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Deck } from '@/types/deck';

export default function DeckPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.deckId as string;

  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Flashcard practice state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [practiceMode, setPracticeMode] = useState(false);

  useEffect(() => {
    async function loadDeck() {
      try {
        setLoading(true);
        // Convert deck ID back to course code
        const courseCode = deckId.replace(/_/g, ' ');
        const response = await fetch(`/api/decks?courseCode=${encodeURIComponent(courseCode)}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load deck');
        }

        if (!data.exists || !data.deck) {
          throw new Error('Deck not found');
        }

        setDeck(data.deck);
        
        // Update last practiced time
        await fetch('/api/decks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseCode }),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load deck');
      } finally {
        setLoading(false);
      }
    }

    if (deckId) {
      loadDeck();
    }
  }, [deckId]);

  const currentCard = deck?.flashcards[currentIndex];

  const handleNext = () => {
    if (deck && currentIndex < deck.flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowAnswer(false);
    }
  };

  const handleFlip = () => {
    setShowAnswer(!showAnswer);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900"></div>
          <p className="text-lg font-medium text-slate-900">Loading deck...</p>
          <p className="text-sm text-slate-600">Preparing your flashcards</p>
        </div>
      </div>
    );
  }

  if (error || !deck) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="max-w-md rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-slate-900">Deck Not Found</h2>
          <p className="mb-6 text-slate-600">{error || 'The requested deck could not be loaded.'}</p>
          <button
            onClick={() => router.push('/document-parser')}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Create New Deck
          </button>
        </div>
      </div>
    );
  }

  if (!practiceMode) {
    return (
      <main className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-6">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/document-parser')}
              className="mb-4 flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Document Parser
            </button>
            <h1 className="text-3xl font-bold text-slate-900">{deck.courseName}</h1>
            <p className="mt-1 text-slate-600">
              {deck.courseCode} • {deck.programName}
            </p>
          </div>

          {/* Stats Card */}
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-slate-600">Total Cards</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{deck.totalCards}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-slate-600">Contributors</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{deck.contributors.length}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-slate-600">Last Practiced</p>
              <p className="mt-1 text-sm text-slate-700">
                {deck.lastPracticed ? new Date(deck.lastPracticed).toLocaleDateString() : 'Never'}
              </p>
            </div>
          </div>

          {/* Practice Button */}
          <div className="mb-8 rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="mb-2 text-2xl font-semibold text-slate-900">Ready to Practice?</h2>
            <p className="mb-6 text-slate-600">
              Study {deck.totalCards} flashcard{deck.totalCards !== 1 ? 's' : ''} to master this course
            </p>
            <button
              onClick={() => setPracticeMode(true)}
              className="rounded-md bg-slate-900 px-8 py-3 text-lg font-medium text-white transition hover:bg-slate-700"
            >
              Start Practice Session
            </button>
          </div>

          {/* All Flashcards Preview */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-xl font-semibold text-slate-900">All Flashcards</h3>
            <div className="space-y-3">
              {deck.flashcards.map((card, index) => (
                <div
                  key={card.id}
                  className="rounded-md border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Card {index + 1}</span>
                    {card.tags && card.tags.length > 0 && (
                      <div className="flex gap-1">
                        {card.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="mb-2 font-medium text-slate-900">{card.front}</p>
                  <p className="text-sm text-slate-600">{card.back}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Practice Mode
  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-900 to-slate-800 p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between text-white">
          <button
            onClick={() => setPracticeMode(false)}
            className="flex items-center gap-2 text-sm hover:text-slate-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Exit Practice
          </button>
          <span className="text-sm">
            Card {currentIndex + 1} of {deck.flashcards.length}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 h-2 w-full overflow-hidden rounded-full bg-slate-700">
          <div
            className="h-full bg-white transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / deck.flashcards.length) * 100}%` }}
          />
        </div>

        {/* Flashcard */}
        <div className="flashcard-container mb-8 h-96 cursor-pointer" onClick={handleFlip}>
          <div className={`flashcard h-full ${showAnswer ? 'flipped' : ''}`}>
            {/* Front */}
            <div className="flashcard-front flex items-center justify-center rounded-xl bg-white p-8 shadow-2xl">
              <div className="text-center">
                <p className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-500">Question</p>
                <p className="text-2xl font-semibold text-slate-900">{currentCard?.front}</p>
                <p className="mt-6 text-sm text-slate-400">Click to reveal answer</p>
              </div>
            </div>

            {/* Back */}
            <div className="flashcard-back flex items-center justify-center rounded-xl bg-slate-900 p-8 shadow-2xl">
              <div className="text-center">
                <p className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-400">Answer</p>
                <p className="text-xl text-white">{currentCard?.back}</p>
                {currentCard?.tags && currentCard.tags.length > 0 && (
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {currentCard.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 rounded-md bg-white/10 px-6 py-3 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>

          <button
            onClick={handleFlip}
            className="rounded-md bg-white px-6 py-3 font-medium text-slate-900 transition hover:bg-slate-100"
          >
            {showAnswer ? 'Show Question' : 'Show Answer'}
          </button>

          <button
            onClick={handleNext}
            disabled={currentIndex === deck.flashcards.length - 1}
            className="flex items-center gap-2 rounded-md bg-white/10 px-6 py-3 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Completion Message */}
        {currentIndex === deck.flashcards.length - 1 && showAnswer && (
          <div className="mt-6 rounded-lg border border-green-400/20 bg-green-400/10 p-4 text-center">
            <p className="font-medium text-green-400">🎉 You&apos;ve reached the last card!</p>
            <button
              onClick={() => {
                setCurrentIndex(0);
                setShowAnswer(false);
              }}
              className="mt-2 text-sm text-green-300 hover:text-green-200"
            >
              Start Over
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
