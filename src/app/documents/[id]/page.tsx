'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase-client';
import { doc, getDoc, updateDoc, increment, addDoc, collection, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Eye, FileText, ArrowLeft, Globe, Lock } from 'lucide-react';
import type { UploadedDocument } from '@/types/document';

export default function DocumentViewPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [document, setDocument] = useState<UploadedDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingReview, setSubmittingReview] = useState(false);

  const documentId = params.id as string;

  useEffect(() => {
    async function fetchDocument() {
      try {
        const docRef = doc(db, 'documents', documentId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          router.push('/documents');
          return;
        }

        const data = docSnap.data();
        const uploadedDoc: UploadedDocument = {
          id: docSnap.id,
          ...data,
          uploadedAt: data.uploadedAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          reviewedAt: data.reviewedAt?.toDate(),
          aiReviewedAt: data.aiReviewedAt?.toDate(),
        } as UploadedDocument;

        setDocument(uploadedDoc);

        // Increment view count
        await updateDoc(docRef, {
          viewCount: increment(1),
        });
      } catch (error) {
        console.error('Error fetching document:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDocument();
  }, [documentId, router]);

  async function handleRequestPublic() {
    if (!document || !user) return;

    setSubmittingReview(true);
    try {
      // Update document status to pending_review
      const docRef = doc(db, 'documents', document.id);
      await updateDoc(docRef, {
        status: 'pending_review',
        updatedAt: Timestamp.now(),
      });

      // Create review request
      await addDoc(collection(db, 'document_reviews'), {
        documentId: document.id,
        documentTitle: document.title,
        courseCode: document.courseCode,
        courseName: document.courseName,
        documentType: document.type,
        fileUrl: document.fileUrl,
        fileType: document.fileType,
        uploadedBy: document.uploadedBy,
        uploaderName: document.uploaderName || 'Anonymous',
        submittedAt: Timestamp.now(),
        status: 'pending',
      });

      // Update local state
      setDocument({
        ...document,
        status: 'pending_review',
      });

      alert('Your document has been submitted for review!');
    } catch (error) {
      console.error('Error submitting for review:', error);
      alert('Failed to submit for review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handleDownload() {
    if (!document) return;

    try {
      // Increment download count
      const docRef = doc(db, 'documents', document.id);
      await updateDoc(docRef, {
        downloadCount: increment(1),
      });

      // Open file in new tab
      window.open(document.fileUrl, '_blank');
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      private: 'bg-[var(--secondary)] text-[var(--muted)] border border-[var(--border)]',
      pending_review: 'bg-[var(--warning)]/10 text-[var(--warning)] border border-[var(--warning)]/30',
      approved: 'bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30',
      rejected: 'bg-[var(--error)]/10 text-[var(--error)] border border-[var(--error)]/30',
    };

    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${styles[status as keyof typeof styles] || styles.private}`}>
        {status === 'private' && <Lock className="h-3 w-3" />}
        {status === 'approved' && <Globe className="h-3 w-3" />}
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Document Not Found</CardTitle>
            <CardDescription>
              The document you're looking for doesn't exist or has been removed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/documents">
              <Button>Back to Documents</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwner = user && user.uid === document.uploadedBy;
  const canViewPrivate = isOwner || (document.isPublic && document.status === 'approved');

  if (!canViewPrivate) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              This document is private. Only the owner can view it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/documents">
              <Button>Back to Documents</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-6 min-h-screen">
      <Link href="/documents">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Documents
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-2xl">{document.title}</CardTitle>
              <CardDescription className="mt-2">
                <Link href={`/courses/${document.courseCode}`} className="hover:underline">
                  {document.courseCode} - {document.courseName}
                </Link>
              </CardDescription>
            </div>
            {getStatusBadge(document.status)}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Document Info */}
          <div className="grid gap-4 rounded-lg border border-[var(--border)] bg-[var(--secondary)] p-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">Document Type</p>
              <p className="text-sm text-[var(--muted)] capitalize">{document.type.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">Program</p>
              <p className="text-sm text-[var(--muted)]">{document.programCode} - {document.programName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">Uploaded By</p>
              <p className="text-sm text-[var(--muted)]">{document.uploaderName || 'Anonymous'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">Uploaded On</p>
              <p className="text-sm text-[var(--muted)]">{document.uploadedAt.toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">File Name</p>
              <p className="text-sm text-[var(--muted)] truncate">{document.fileName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">File Size</p>
              <p className="text-sm text-[var(--muted)]">{formatFileSize(document.fileSize)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">Views</p>
              <p className="text-sm text-[var(--muted)] flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {document.viewCount || 0}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">Downloads</p>
              <p className="text-sm text-[var(--muted)] flex items-center gap-1">
                <Download className="h-4 w-4" />
                {document.downloadCount || 0}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-4">
            <Button onClick={handleDownload} className="flex-1 md:flex-none">
              <Download className="h-4 w-4" />
              Download / View File
            </Button>

            {isOwner && document.status === 'private' && (
              <Button
                variant="outline"
                onClick={handleRequestPublic}
                disabled={submittingReview}
                className="flex-1 md:flex-none"
              >
                {submittingReview ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4" />
                    Make Public
                  </>
                )}
              </Button>
            )}

            {isOwner && document.status === 'pending_review' && (
              <div className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-3 text-sm text-[var(--warning)] flex-1">
                Your document is pending review by administrators.
              </div>
            )}

            {isOwner && document.status === 'rejected' && document.rejectionReason && (
              <div className="rounded-lg border border-[var(--error)]/30 bg-[var(--error)]/10 p-3 text-sm text-[var(--error)] flex-1">
                <p className="font-medium">Document Rejected</p>
                <p className="mt-1">{document.rejectionReason}</p>
              </div>
            )}
          </div>

          {/* Document Preview */}
          {document.fileType === 'application/pdf' && (
            <div>
              <h3 className="mb-3 text-lg font-semibold text-[var(--foreground)]">Preview</h3>
              <iframe
                src={document.fileUrl}
                className="h-[600px] w-full rounded-lg border border-[var(--border)]"
                title="Document Preview"
              />
            </div>
          )}

          {(document.fileType === 'image/jpeg' || document.fileType === 'image/png') && (
            <div>
              <h3 className="mb-3 text-lg font-semibold text-[var(--foreground)]">Preview</h3>
              <img
                src={document.fileUrl}
                alt={document.title}
                className="rounded-lg border border-[var(--border)]"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
