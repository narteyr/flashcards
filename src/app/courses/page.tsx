'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase-client';
import { collection, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, BookOpen, Search, GraduationCap } from 'lucide-react';

interface Program {
  code: string;
  name: string;
  totalCourses: number;
}

interface Course {
  code: string;
  name: string;
  programCode: string;
}

export default function CoursesPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<string>('all');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch programs
        const programsSnapshot = await getDocs(collection(db, 'programs'));
        const programsData = programsSnapshot.docs.map((doc) => ({
          code: doc.id,
          ...doc.data(),
        })) as Program[];
        setPrograms(programsData);

        // Fetch all courses from all programs
        const allCourses: Course[] = [];
        for (const program of programsData) {
          const coursesSnapshot = await getDocs(
            collection(db, 'programs', program.code, 'courses')
          );
          const programCourses = coursesSnapshot.docs.map((doc) => ({
            code: doc.id,
            name: doc.data().name,
            programCode: program.code,
          }));
          allCourses.push(...programCourses);
        }
        setCourses(allCourses);
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Filter courses based on search and program
  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      !searchQuery ||
      course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProgram =
      selectedProgram === 'all' || course.programCode === selectedProgram;

    return matchesSearch && matchesProgram;
  });

  // Group courses by program
  const coursesByProgram = filteredCourses.reduce((acc, course) => {
    if (!acc[course.programCode]) {
      acc[course.programCode] = [];
    }
    acc[course.programCode].push(course);
    return acc;
  }, {} as Record<string, Course[]>);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-6 min-h-screen">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-[var(--muted)] shadow-sm border border-[var(--border)] mb-4">
          <GraduationCap className="h-4 w-4 text-[var(--primary)]" />
          Browse All Courses
        </div>
        <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
          Course Library
        </h1>
        <p className="text-[var(--muted)] max-w-2xl mx-auto">
          Explore courses, access study materials, and practice with AI-generated flashcards
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            {/* Search */}
            <div className="flex-1">
              <Label htmlFor="search">Search Courses</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Search by course code or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Program Filter */}
            <div className="w-full md:w-64">
              <Label htmlFor="program">Program</Label>
              <select
                id="program"
                className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-4 py-2 text-sm text-[var(--foreground)] shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
              >
                <option value="all">All Programs</option>
                {programs.map((program) => (
                  <option key={program.code} value={program.code}>
                    {program.code} - {program.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total Programs</CardDescription>
            <CardTitle className="text-3xl text-[var(--primary)]">{programs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Courses</CardDescription>
            <CardTitle className="text-3xl text-[var(--success)]">{courses.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Available Now</CardDescription>
            <CardTitle className="text-3xl text-[var(--accent)]">{filteredCourses.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Courses List */}
      {filteredCourses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-[var(--muted)]" />
            <p className="text-lg font-medium text-[var(--foreground)]">
              No courses found
            </p>
            <p className="mt-1 text-[var(--muted)]">
              Try adjusting your search or filter criteria
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(coursesByProgram).map(([programCode, programCourses]) => {
            const program = programs.find((p) => p.code === programCode);
            if (!program) return null;

            return (
              <div key={programCode}>
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-[var(--foreground)]">
                    {program.code} - {program.name}
                  </h2>
                  <p className="text-sm text-[var(--muted)]">
                    {programCourses.length} {programCourses.length === 1 ? 'course' : 'courses'}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {programCourses.map((course) => (
                    <Link key={course.code} href={`/courses/${course.code}`}>
                      <Card className="group cursor-pointer h-full">
                        <CardHeader>
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/30">
                              <BookOpen className="h-5 w-5 text-[var(--primary)]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base truncate">
                                {course.code}
                              </CardTitle>
                              <CardDescription className="mt-1 line-clamp-2">
                                {course.name}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
