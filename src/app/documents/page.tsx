'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase-client';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Download, Eye, Loader2, Search, Filter } from 'lucide-react';
import type { UploadedDocument, DocumentType } from '@/types/document';

const DOCUMENT_TYPES: { value: DocumentType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'notes', label: 'Notes' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'past_paper', label: 'Past Paper' },
  { value: 'syllabus', label: 'Syllabus' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'review_sheet', label: 'Review Sheet' },
];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<DocumentType | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    async function fetchDocuments() {
      setLoading(true);
      try {
        const documentsRef = collection(db, 'documents');
        let q = query(
          documentsRef,
          where('status', '==', 'approved'),
          where('isPublic', '==', true),
          orderBy('uploadedAt', 'desc'),
          limit(50)
        );

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

        setDocuments(docs);
      } catch (error) {
        console.error('Error fetching documents:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDocuments();
  }, []);

  // Filter documents based on search and type
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      !searchQuery ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.courseName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = selectedType === 'all' || doc.type === selectedType;

    return matchesSearch && matchesType;
  });

  // Group documents by course
  const documentsByCourse = filteredDocuments.reduce((acc, doc) => {
    const key = `${doc.programCode} ${doc.courseCode}`;
    if (!acc[key]) {
      acc[key] = {
        courseCode: doc.courseCode,
        courseName: doc.courseName,
        programCode: doc.programCode,
        programName: doc.programName,
        documents: [],
      };
    }
    acc[key].documents.push(doc);
    return acc;
  }, {} as Record<string, { courseCode: string; courseName: string; programCode: string; programName: string; documents: UploadedDocument[] }>);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getDocumentTypeLabel = (type: DocumentType) => {
    return DOCUMENT_TYPES.find((t) => t.value === type)?.label || type;
  };

  return (
    <main className="mx-auto max-w-7xl p-6 min-h-screen">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-[var(--foreground)]">Document Library</h1>
        <p className="text-[var(--muted)]">
          Browse and access study materials shared by students
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            {/* Search */}
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Search by title, course code, or course name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filter Toggle Button */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 border-t border-[var(--border)] pt-4">
              <div className="space-y-2">
                <Label htmlFor="documentType">Document Type</Label>
                <select
                  id="documentType"
                  className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-4 py-2 text-sm text-[var(--foreground)] shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] md:w-64"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as DocumentType | 'all')}
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        </div>
      ) : filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-[var(--muted)]" />
            <p className="text-[var(--muted)]">
              {searchQuery || selectedType !== 'all'
                ? 'No documents match your search criteria.'
                : 'No public documents available yet. Be the first to upload!'}
            </p>
            <Link href="/documents/upload" className="mt-4 inline-block">
              <Button>Upload Document</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(documentsByCourse).map(([key, group]) => (
            <div key={key}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-[var(--foreground)]">
                    {group.courseCode} - {group.courseName}
                  </h2>
                  <p className="text-sm text-[var(--muted)]">
                    {group.programCode} - {group.programName}
                  </p>
                </div>
                <Link href={`/courses/${group.courseCode}`}>
                  <Button variant="outline" size="sm">
                    View Course Page
                  </Button>
                </Link>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {group.documents.map((doc) => (
                  <Card key={doc.id} className="group">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base">{doc.title}</CardTitle>
                        <span className="rounded-full bg-[var(--secondary)] px-3 py-1 text-xs font-medium text-[var(--foreground)] border border-[var(--border)]">
                          {getDocumentTypeLabel(doc.type)}
                        </span>
                      </div>
                      <CardDescription>
                        By {doc.uploaderName || 'Anonymous'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4 space-y-1 text-sm text-[var(--muted)]">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="truncate">{doc.fileName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{formatFileSize(doc.fileSize)}</span>
                          <span>•</span>
                          <span>{doc.uploadedAt.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {doc.viewCount || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <Download className="h-3 w-3" />
                            {doc.downloadCount || 0}
                          </span>
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
          ))}
        </div>
      )}
    </main>
  );
}
