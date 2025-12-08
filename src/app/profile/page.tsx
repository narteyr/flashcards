'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase-client';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Upload, User as UserIcon } from 'lucide-react';
import type { UploadedDocument } from '@/types/document';

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    async function fetchUserDocuments() {
      setLoading(true);
      try {
        const documentsRef = collection(db, 'documents');
        const q = query(documentsRef, where('uploadedBy', '==', user.uid));
        const snapshot = await getDocs(q);

        const docs = snapshot.docs.map((doc) => {
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

        // Sort by upload date (newest first)
        docs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

        setDocuments(docs);
      } catch (error) {
        console.error('Error fetching user documents:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUserDocuments();
  }, [user]);

  // Calculate stats
  const publicDocuments = documents.filter(
    (doc) => doc.status === 'approved' && doc.isPublic
  ).length;
  const pendingDocuments = documents.filter(
    (doc) => doc.status === 'pending_review'
  ).length;
  const privateDocuments = documents.filter((doc) => doc.status === 'private').length;

  const getStatusBadge = (status: string, isPublic: boolean) => {
    if (status === 'approved' && isPublic) {
      return (
        <span className="inline-flex items-center rounded-full bg-[var(--success)]/10 px-3 py-1 text-xs font-medium text-[var(--success)] border border-[var(--success)]/30">
          Public
        </span>
      );
    }
    if (status === 'pending_review') {
      return (
        <span className="inline-flex items-center rounded-full bg-[var(--warning)]/10 px-3 py-1 text-xs font-medium text-[var(--warning)] border border-[var(--warning)]/30">
          Pending Review
        </span>
      );
    }
    if (status === 'rejected') {
      return (
        <span className="inline-flex items-center rounded-full bg-[var(--error)]/10 px-3 py-1 text-xs font-medium text-[var(--error)] border border-[var(--error)]/30">
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-[var(--secondary)] px-3 py-1 text-xs font-medium text-[var(--muted)] border border-[var(--border)]">
        Private
      </span>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="mx-auto max-w-6xl p-6 min-h-screen">
      {/* Profile Header */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-start gap-4">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="h-16 w-16 rounded-full ring-2 ring-[var(--border)]"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--secondary)] ring-2 ring-[var(--border)]">
                <UserIcon className="h-8 w-8 text-[var(--muted)]" />
              </div>
            )}
            <div className="flex-1">
              <CardTitle className="text-2xl">{user.displayName || 'User'}</CardTitle>
              <CardDescription className="mt-1">{user.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Documents</CardDescription>
            <CardTitle className="text-3xl text-[var(--primary)]">{documents.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Public</CardDescription>
            <CardTitle className="text-3xl text-[var(--success)]">{publicDocuments}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-3xl text-[var(--warning)]">{pendingDocuments}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Private</CardDescription>
            <CardTitle className="text-3xl text-[var(--muted)]">{privateDocuments}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Documents List */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[var(--foreground)]">My Documents</h2>
          <Link href="/documents/upload">
            <Button>
              <Upload className="h-4 w-4" />
              Upload New
            </Button>
          </Link>
        </div>

        {documents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-[var(--muted)]" />
              <p className="text-lg font-medium text-[var(--foreground)]">
                No documents uploaded yet
              </p>
              <p className="mt-1 text-[var(--muted)]">
                Upload your first document to get started!
              </p>
              <Link href="/documents/upload" className="mt-4 inline-block">
                <Button>Upload Document</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {documents.map((doc) => (
              <Card key={doc.id} className="group">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{doc.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {doc.courseCode} - {doc.courseName}
                      </CardDescription>
                    </div>
                    {getStatusBadge(doc.status, doc.isPublic)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--muted)]">
                      <span className="capitalize">{doc.type.replace('_', ' ')}</span>
                      <span>•</span>
                      <span className="truncate max-w-[200px]">{doc.fileName}</span>
                      <span>•</span>
                      <span>{doc.uploadedAt.toLocaleDateString()}</span>
                      {doc.isPublic && (
                        <>
                          <span>•</span>
                          <span>{doc.viewCount || 0} views</span>
                        </>
                      )}
                    </div>
                    <Link href={`/documents/${doc.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </div>

                  {doc.status === 'rejected' && doc.rejectionReason && (
                    <div className="mt-3 rounded-lg border border-[var(--error)]/30 bg-[var(--error)]/10 p-3 text-sm text-[var(--error)]">
                      <p className="font-medium">Rejection Reason:</p>
                      <p className="mt-1">{doc.rejectionReason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
