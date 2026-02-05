'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Upload, BookOpen, FileText, Sparkles, ArrowRight, Zap, Users, TrendingUp } from 'lucide-react';

export default function Home() {
  return (
    <main className="animate-fade-in">
      {/* Hero Section - Apple inspired */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[var(--background)] to-[var(--secondary)] px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-[var(--muted)] shadow-sm">
            <Sparkles className="h-4 w-4 text-[var(--primary)]" />
            AI-Powered Study Platform
          </div>

          <h1 className="mb-6 text-5xl font-bold tracking-tight text-[var(--foreground)] sm:text-6xl lg:text-7xl">
            Your Academic
            <span className="bg-gradient-to-r from-[var(--primary)] to-blue-600 bg-clip-text text-transparent"> Success Hub</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-[var(--muted)] sm:text-xl">
            Share course materials, generate AI flashcards, and collaborate with students.
            Everything you need to excel academically, in one place.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/documents/upload">
              <Button
                size="lg"
                className="gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-lg hover:shadow-xl"
              >
                <Upload className="h-5 w-5" />
                Upload Document
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/documents">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 border-2"
              >
                <BookOpen className="h-5 w-5" />
                Browse Library
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section - Spotify inspired */}
      <section className="border-y border-[var(--border)] bg-[var(--card-bg)] px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="mb-2 text-4xl font-bold text-[var(--foreground)]">10K+</div>
              <div className="text-sm text-[var(--muted)]">Documents Shared</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-4xl font-bold text-[var(--foreground)]">5K+</div>
              <div className="text-sm text-[var(--muted)]">Active Students</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-4xl font-bold text-[var(--foreground)]">50+</div>
              <div className="text-sm text-[var(--muted)]">Courses Covered</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - CourseHero inspired */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-[var(--foreground)] sm:text-4xl">
              Everything you need to succeed
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-[var(--muted)]">
              Powerful tools designed to help you study smarter, not harder
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="card-hover group rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-[var(--shadow-sm)]">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/20">
                <Upload className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-[var(--foreground)]">
                Upload & Share
              </h3>
              <p className="text-[var(--muted)]">
                Upload notes, past papers, and study materials. All documents are private by default.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card-hover group rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-[var(--shadow-sm)]">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/20">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-[var(--foreground)]">
                AI Flashcards
              </h3>
              <p className="text-[var(--muted)]">
                Transform your documents into study flashcards automatically using advanced AI.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card-hover group rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-[var(--shadow-sm)]">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-600 dark:bg-green-900/20">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-[var(--foreground)]">
                Course Library
              </h3>
              <p className="text-[var(--muted)]">
                Access thousands of documents organized by course and program.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="card-hover group rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-[var(--shadow-sm)]">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/20">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-[var(--foreground)]">
                Smart Search
              </h3>
              <p className="text-[var(--muted)]">
                Find exactly what you need with powerful search and filtering tools.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="card-hover group rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-[var(--shadow-sm)]">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-pink-100 text-pink-600 dark:bg-pink-900/20">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-[var(--foreground)]">
                Collaborate
              </h3>
              <p className="text-[var(--muted)]">
                Share knowledge and study together with your classmates.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="card-hover group rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-[var(--shadow-sm)]">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600 dark:bg-cyan-900/20">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-[var(--foreground)]">
                Track Progress
              </h3>
              <p className="text-[var(--muted)]">
                Monitor your contributions and study progress over time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--primary)] to-blue-600 p-12 text-center shadow-2xl">
            <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
              Ready to start studying smarter?
            </h2>
            <p className="mb-8 text-lg text-blue-100">
              Join thousands of students already using StudyHub
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/documents/upload">
                <Button
                  size="lg"
                  className="gap-2 bg-white text-[var(--primary)] hover:bg-blue-50"
                >
                  <Upload className="h-5 w-5" />
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/documents">
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 border-2 border-white bg-transparent text-white hover:bg-white/10"
                >
                  <FileText className="h-5 w-5" />
                  Explore Library
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
