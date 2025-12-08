'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase-client';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, CheckCircle, XCircle, Eye } from 'lucide-react';
import type { DocumentReview } from '@/types/document';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState<DocumentReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  // Check if user is admin (Dartmouth email)
  const isAdmin = user?.email?.endsWith('@dartmouth.edu');

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/');
    }
  }, [user, isAdmin, authLoading, router]);

  useEffect(() => {
    if (!isAdmin) return;

    async function fetchPendingReviews() {
      setLoading(true);
      try {
        const reviewsRef = collection(db, 'document_reviews');
        const q = query(reviewsRef, where('status', '==', 'pending'));
        const snapshot = await getDocs(q);

        const reviewsData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            submittedAt: data.submittedAt?.toDate() || new Date(),
            reviewedAt: data.reviewedAt?.toDate(),
          } as DocumentReview;
        });

        // Sort by submitted date (newest first)
        reviewsData.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());

        setReviews(reviewsData);
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPendingReviews();
  }, [isAdmin]);

  async function handleApprove(review: DocumentReview) {
    if (!user) return;

    setProcessing(review.id);
    try {
      // Update document status to approved
      const docRef = doc(db, 'documents', review.documentId);
      await updateDoc(docRef, {
        status: 'approved',
        isPublic: true,
        reviewedBy: user.uid,
        reviewedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Update review status
      const reviewRef = doc(db, 'document_reviews', review.id);
      await updateDoc(reviewRef, {
        status: 'approved',
        reviewedBy: user.uid,
        reviewerName: user.displayName || 'Admin',
        reviewedAt: Timestamp.now(),
        reviewDecision: 'approved',
      });

      // Remove from local state
      setReviews(reviews.filter((r) => r.id !== review.id));
    } catch (error) {
      console.error('Error approving document:', error);
      alert('Failed to approve document');
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(review: DocumentReview) {
    if (!user) return;

    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    setProcessing(review.id);
    try {
      // Update document status to rejected
      const docRef = doc(db, 'documents', review.documentId);
      await updateDoc(docRef, {
        status: 'rejected',
        isPublic: false,
        reviewedBy: user.uid,
        reviewedAt: Timestamp.now(),
        rejectionReason: reason,
        updatedAt: Timestamp.now(),
      });

      // Update review status
      const reviewRef = doc(db, 'document_reviews', review.id);
      await updateDoc(reviewRef, {
        status: 'rejected',
        reviewedBy: user.uid,
        reviewerName: user.displayName || 'Admin',
        reviewedAt: Timestamp.now(),
        reviewDecision: 'rejected',
        rejectionReason: reason,
      });

      // Remove from local state
      setReviews(reviews.filter((r) => r.id !== review.id));
    } catch (error) {
      console.error('Error rejecting document:', error);
      alert('Failed to reject document');
    } finally {
      setProcessing(null);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-600">
          Review and moderate documents submitted for public visibility
        </p>
      </div>

      {/* Stats Card */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Pending Reviews</CardDescription>
            <CardTitle className="text-3xl">{reviews.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
            <p className="text-lg font-medium text-slate-900">All caught up!</p>
            <p className="mt-1 text-slate-600">
              There are no pending documents to review.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{review.documentTitle}</CardTitle>
                    <CardDescription className="mt-1">
                      {review.courseCode} - {review.courseName}
                    </CardDescription>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 capitalize">
                    {review.documentType.replace('_', ' ')}
                  </span>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  {/* Document Info */}
                  <div className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Uploaded By</p>
                      <p className="text-sm text-slate-600">{review.uploaderName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Submitted On</p>
                      <p className="text-sm text-slate-600">
                        {review.submittedAt.toLocaleDateString()}
                      </p>
                    </div>
                    {review.aiReviewScore !== undefined && (
                      <>
                        <div>
                          <p className="text-sm font-medium text-slate-700">AI Review Score</p>
                          <p className="text-sm text-slate-600">{review.aiReviewScore}/100</p>
                        </div>
                        {review.aiFlags && review.aiFlags.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-slate-700">AI Flags</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {review.aiFlags.map((flag) => (
                                <span
                                  key={flag}
                                  className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                                >
                                  {flag.replace('_', ' ')}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {review.aiReviewNotes && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <p className="text-sm font-medium text-blue-900">AI Review Notes</p>
                      <p className="mt-1 text-sm text-blue-800">{review.aiReviewNotes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={review.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 md:flex-none"
                    >
                      <Button variant="outline" className="w-full">
                        <Eye className="h-4 w-4" />
                        View Document
                      </Button>
                    </a>

                    <Button
                      onClick={() => handleApprove(review)}
                      disabled={processing === review.id}
                      className="flex-1 bg-green-600 hover:bg-green-700 md:flex-none"
                    >
                      {processing === review.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </>
                      )}
                    </Button>

                    <Button
                      variant="destructive"
                      onClick={() => handleReject(review)}
                      disabled={processing === review.id}
                      className="flex-1 md:flex-none"
                    >
                      {processing === review.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="h-4 w-4" />
                          Reject
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
