'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage } from '@/lib/firebase-client';
import { collection, addDoc, Timestamp, getDocs, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import type { DocumentType } from '@/types/document';

interface Program {
  code: string;
  name: string;
  totalCourses: number;
}

interface Course {
  code: string;
  name: string;
}

const DOCUMENT_TYPES: { value: DocumentType; label: string; icon: string }[] = [
  { value: 'notes', label: 'Notes', icon: '📝' },
  { value: 'quiz', label: 'Quiz', icon: '📋' },
  { value: 'past_paper', label: 'Past Paper', icon: '📄' },
  { value: 'syllabus', label: 'Syllabus', icon: '📚' },
  { value: 'assignment', label: 'Assignment', icon: '✏️' },
  { value: 'review_sheet', label: 'Review Sheet', icon: '📑' },
];

export default function DocumentUploadPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedCourseName, setSelectedCourseName] = useState('');
  const [selectedProgramName, setSelectedProgramName] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('notes');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Load programs on mount
  useEffect(() => {
    async function fetchPrograms() {
      setLoadingPrograms(true);
      try {
        const programsRef = collection(db, 'programs');
        const snapshot = await getDocs(programsRef);
        const programsData = snapshot.docs.map((doc) => ({
          code: doc.id,
          name: doc.data().programName || doc.id,
          totalCourses: doc.data().totalCourses || 0,
        }));
        programsData.sort((a, b) => a.code.localeCompare(b.code));
        setPrograms(programsData);
      } catch (error) {
        console.error('Error fetching programs:', error);
        setError('Failed to load programs');
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
        const programRef = doc(db, 'programs', selectedProgram.toUpperCase());
        const programDoc = await getDoc(programRef);

        if (programDoc.exists()) {
          const data = programDoc.data();
          setCourses(data.courses || []);
        } else {
          setCourses([]);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
        setError('Failed to load courses');
      } finally {
        setLoadingCourses(false);
      }
    }
    fetchCourses();
  }, [selectedProgram]);

  // Filter courses based on search query
  const filteredCourses = courses.filter((course) => {
    const query = courseSearchQuery.toLowerCase();
    return (
      course.code.toLowerCase().includes(query) ||
      course.name.toLowerCase().includes(query)
    );
  });

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setError('');
    // Auto-populate title if empty
    if (!title.trim()) {
      const fileNameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, '');
      setTitle(fileNameWithoutExt);
    }
  };

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!user) {
      setError('You must be signed in to upload documents');
      return;
    }

    if (!file || !selectedCourse || !title.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      // Upload file to Firebase Storage
      const storagePath = `documents/${user.uid}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      // Monitor upload progress
      await new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => reject(error),
          () => resolve(uploadTask.snapshot)
        );
      });

      // Get download URL
      const fileUrl = await getDownloadURL(uploadTask.snapshot.ref);

      // Create document record in Firestore
      const documentData = {
        title: title.trim(),
        type: documentType,
        courseCode: selectedCourse,
        courseName: selectedCourseName,
        programCode: selectedProgram,
        programName: selectedProgramName,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileUrl,
        storagePath,
        uploadedBy: user.uid,
        uploaderName: user.displayName || 'Anonymous',
        uploadedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        status: 'private',
        isPublic: false,
        viewCount: 0,
        downloadCount: 0,
      };

      const docRef = await addDoc(collection(db, 'documents'), documentData);

      // Success!
      setSuccess(true);
      setUploadProgress(100);

      // Redirect after a short delay
      setTimeout(() => {
        router.push(`/documents/${docRef.id}`);
      }, 2000);
    } catch (error) {
      console.error('Upload failed:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
      setUploading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--muted)]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8 text-center shadow-[var(--shadow-lg)]">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
            <Upload className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-[var(--foreground)]">Sign In Required</h2>
          <p className="text-[var(--muted)]">
            You must be signed in to upload documents.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-12 animate-fade-in">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-3 text-4xl font-bold text-[var(--foreground)]">
            Upload Document
          </h1>
          <p className="text-lg text-[var(--muted)]">
            Share your study materials with the community
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-6 text-center dark:border-green-900/20 dark:bg-green-900/10">
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-green-600" />
            <h3 className="mb-2 text-lg font-semibold text-green-900 dark:text-green-100">
              Upload Successful!
            </h3>
            <p className="text-sm text-green-700 dark:text-green-200">
              Redirecting to your document...
            </p>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Area */}
          <div
            className={`
              card-hover relative overflow-hidden rounded-2xl border-2 border-dashed p-12 text-center transition-all
              ${dragActive
                ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-900/10'
                : 'border-[var(--border)] bg-[var(--card-bg)]'
              }
              ${file ? 'border-solid border-[var(--primary)]' : ''}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0];
                if (selectedFile) handleFileSelect(selectedFile);
              }}
            />

            {!file ? (
              <>
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                  <Upload className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-[var(--foreground)]">
                  Drop your file here
                </h3>
                <p className="mb-4 text-sm text-[var(--muted)]">
                  or click to browse
                </p>
                <label htmlFor="file-upload">
                  <Button type="button" onClick={() => document.getElementById('file-upload')?.click()}>
                    Choose File
                  </Button>
                </label>
                <p className="mt-4 text-xs text-[var(--muted)]">
                  Supported: PDF, Word (.docx), Images (JPG, PNG)
                </p>
              </>
            ) : (
              <div className="flex items-center justify-between rounded-xl bg-[var(--secondary)] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-[var(--foreground)]">{file.name}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-[var(--shadow-sm)]">
            {/* Document Title */}
            <div className="mb-6">
              <Label htmlFor="title" className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                Document Title *
              </Label>
              <Input
                id="title"
                placeholder="e.g., Week 5 Lecture Notes"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="h-11"
              />
            </div>

            {/* Document Type */}
            <div className="mb-6">
              <Label className="mb-3 block text-sm font-medium text-[var(--foreground)]">
                Document Type *
              </Label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {DOCUMENT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setDocumentType(type.value)}
                    className={`
                      flex items-center gap-2 rounded-xl border-2 p-3 text-left transition-all
                      ${documentType === type.value
                        ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-900/10'
                        : 'border-[var(--border)] bg-[var(--card-bg)] hover:border-[var(--muted)]'
                      }
                    `}
                  >
                    <span className="text-2xl">{type.icon}</span>
                    <span className="text-sm font-medium text-[var(--foreground)]">
                      {type.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Program Selection */}
            <div className="mb-6">
              <Label htmlFor="program" className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                Program / Department *
              </Label>
              <select
                id="program"
                className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                value={selectedProgram}
                onChange={(e) => {
                  setSelectedProgram(e.target.value);
                  setSelectedCourse('');
                  setCourseSearchQuery('');
                  const program = programs.find((p) => p.code === e.target.value);
                  setSelectedProgramName(program?.name || '');
                }}
                disabled={loadingPrograms}
                required
              >
                <option value="">
                  {loadingPrograms ? 'Loading programs...' : 'Select a program'}
                </option>
                {programs.map((program) => (
                  <option key={program.code} value={program.code}>
                    {program.code} - {program.name} ({program.totalCourses} courses)
                  </option>
                ))}
              </select>
            </div>

            {/* Course Selection */}
            {selectedProgram && (
              <div>
                <Label htmlFor="courseSearch" className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                  Course *
                </Label>
                <Input
                  id="courseSearch"
                  type="text"
                  placeholder="Search by course number or title..."
                  value={courseSearchQuery}
                  onChange={(e) => setCourseSearchQuery(e.target.value)}
                  disabled={loadingCourses}
                  className="mb-3 h-11"
                />

                {loadingCourses ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-[var(--muted)]" />
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto rounded-lg border border-[var(--border)]">
                    {filteredCourses.length === 0 ? (
                      <p className="p-4 text-center text-sm text-[var(--muted)]">
                        {courseSearchQuery ? 'No courses match your search.' : 'No courses available.'}
                      </p>
                    ) : (
                      <div className="divide-y divide-[var(--border)]">
                        {filteredCourses.map((course) => (
                          <label
                            key={course.code}
                            className={`
                              flex cursor-pointer items-start gap-3 p-3 transition-colors
                              ${selectedCourse === course.code
                                ? 'bg-blue-50 dark:bg-blue-900/10'
                                : 'hover:bg-[var(--secondary)]'
                              }
                            `}
                          >
                            <input
                              type="radio"
                              name="course"
                              value={course.code}
                              checked={selectedCourse === course.code}
                              onChange={(e) => {
                                setSelectedCourse(e.target.value);
                                setSelectedCourseName(course.name);
                              }}
                              className="mt-1 h-4 w-4 cursor-pointer text-[var(--primary)]"
                              required
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-[var(--foreground)]">
                                {course.code}
                              </div>
                              <div className="text-xs text-[var(--muted)]">{course.name}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/20 dark:bg-red-900/10">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="font-medium text-[var(--foreground)]">Uploading...</span>
                <span className="text-[var(--muted)]">{uploadProgress.toFixed(0)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--secondary)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-blue-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={uploading || !file || !selectedCourse || !title.trim() || success}
            className="h-12 w-full gap-2 bg-[var(--primary)] text-lg font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Uploading...
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Uploaded!
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                Upload Document
              </>
            )}
          </Button>
        </form>
      </div>
    </main>
  );
}
