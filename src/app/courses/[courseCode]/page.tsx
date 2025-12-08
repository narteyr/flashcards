'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase-client';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, BookOpen, Upload } from 'lucide-react';
import type { UploadedDocument } from '@/types/document';
import type { Deck } from '@/types/deck';

export default function CoursePage() {
  const params = useParams();
  const courseCode = params.courseCode as string;

  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);
  const [courseName, setCourseName] = useState('');
  const [programName, setProgramName] = useState('');

  useEffect(() => {
    async function fetchCourseData() {
      setLoading(true);
      try {
        // Fetch documents for this course
        const documentsRef = collection(db, 'documents');
        const docsQuery = query(
          documentsRef,
          where('courseCode', '==', courseCode),
          where('status', '==', 'approved'),
          where('isPublic', '==', true)
        );

        const docsSnapshot = await getDocs(docsQuery);
        const docs = docsSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            uploadedAt: data.uploadedAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            reviewedAt: data.reviewedAt?.toDate(),
            aiReviewedAt: data.aiReviewedAt?.toDate(),
          } as UploadedDocument;
        });

        setDocuments(docs);

        // Get course name from the first document if available
        if (docs.length > 0) {
          setCourseName(docs[0].courseName);
          setProgramName(docs[0].programName);
        }

        // Fetch flashcard deck for this course
        const deckId = courseCode.replace(/\s+/g, '_');
        const deckRef = doc(db, 'decks', deckId);
        const deckDoc = await getDoc(deckRef);

        if (deckDoc.exists()) {
          const data = deckDoc.data();
          setDeck({
            id: deckDoc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            lastPracticed: data.lastPracticed?.toDate(),
          } as Deck);
        }
      } catch (error) {
        console.error('Error fetching course data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCourseData();
  }, [courseCode]);

  // Group documents by type
  const documentsByType = documents.reduce((acc, doc) => {
    if (!acc[doc.type]) {
      acc[doc.type] = [];
    }
    acc[doc.type].push(doc);
    return acc;
  }, {} as Record<string, UploadedDocument[]>);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      {/* Course Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-slate-900">
          {courseCode} {courseName && `- ${courseName}`}
        </h1>
        {programName && (
          <p className="text-slate-600">{programName}</p>
        )}
      </div>

      {/* Quick Stats */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Documents</CardDescription>
            <CardTitle className="text-3xl">{documents.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Flashcards</CardDescription>
            <CardTitle className="text-3xl">{deck?.totalCards || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Contributors</CardDescription>
            <CardTitle className="text-3xl">
              {deck ? deck.contributors.length : documents.length > 0 ? new Set(documents.map(d => d.uploadedBy)).size : 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Flashcard Deck Section */}
      {deck && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Flashcard Deck
                </CardTitle>
                <CardDescription className="mt-2">
                  {deck.totalCards} flashcards available for practice
                </CardDescription>
              </div>
              <Link href={`/decks/${deck.id}`}>
                <Button>Practice Now</Button>
              </Link>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Documents Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Course Materials</h2>
          <Link href="/documents/upload">
            <Button variant="outline">
              <Upload className="h-4 w-4" />
              Upload Material
            </Button>
          </Link>
        </div>

        {documents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-slate-400" />
              <p className="text-lg font-medium text-slate-900">
                No materials available yet
              </p>
              <p className="mt-1 text-slate-600">
                Be the first to contribute study materials for this course!
              </p>
              <Link href="/documents/upload" className="mt-4 inline-block">
                <Button>Upload Document</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          Object.entries(documentsByType).map(([type, docs]) => (
            <div key={type}>
              <h3 className="mb-4 text-lg font-semibold text-slate-900 capitalize">
                {type.replace('_', ' ')} ({docs.length})
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {docs.map((doc) => (
                  <Card key={doc.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-base">{doc.title}</CardTitle>
                      <CardDescription>
                        By {doc.uploaderName || 'Anonymous'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4 space-y-1 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>{doc.fileName}</span>
                        </div>
                        <div>
                          Uploaded {doc.uploadedAt.toLocaleDateString()}
                        </div>
                      </div>
                      <Link href={`/documents/${doc.id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          View Document
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
