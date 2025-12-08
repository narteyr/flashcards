export type DocumentType =
  | 'notes'
  | 'quiz'
  | 'past_paper'
  | 'syllabus'
  | 'assignment'
  | 'review_sheet';

export type DocumentStatus = 'private' | 'pending_review' | 'approved' | 'rejected';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface UploadedDocument {
  id: string;
  title: string;
  type: DocumentType;
  courseCode: string;
  courseName: string;
  programCode: string;
  programName: string;

  // File information
  fileName: string;
  fileType: string; // MIME type
  fileSize: number; // in bytes
  fileUrl: string; // Firebase Storage URL
  storagePath: string; // Firebase Storage path

  // Document content (extracted text)
  content?: string;
  pageCount?: number;

  // Metadata
  uploadedBy: string; // User ID
  uploaderName?: string;
  uploadedAt: Date;
  updatedAt: Date;

  // Visibility and review
  status: DocumentStatus;
  isPublic: boolean;

  // Review information
  reviewedBy?: string; // Admin user ID
  reviewedAt?: Date;
  reviewNotes?: string;
  rejectionReason?: string;

  // AI Review
  aiReviewScore?: number; // 0-100
  aiReviewNotes?: string;
  aiReviewedAt?: Date;

  // Usage stats
  viewCount: number;
  downloadCount: number;
}

export interface DocumentReview {
  id: string;
  documentId: string;
  documentTitle: string;

  // Document preview info
  courseCode: string;
  courseName: string;
  documentType: DocumentType;
  fileUrl: string;
  fileType: string;

  // Submitter info
  uploadedBy: string;
  uploaderName?: string;
  submittedAt: Date;

  // Review status
  status: ReviewStatus;

  // AI pre-review
  aiReviewScore?: number;
  aiReviewNotes?: string;
  aiFlags?: string[]; // e.g., ['possible_copyright', 'low_quality']

  // Manual review
  reviewedBy?: string;
  reviewerName?: string;
  reviewedAt?: Date;
  reviewDecision?: 'approved' | 'rejected' | 'needs_revision';
  reviewNotes?: string;
  rejectionReason?: string;
}

export interface DocumentUploadRequest {
  title: string;
  type: DocumentType;
  courseCode: string;
  courseName: string;
  programCode: string;
  programName: string;
  file: File;
}

// For search and filtering
export interface DocumentFilters {
  courseCode?: string;
  programCode?: string;
  documentType?: DocumentType;
  status?: DocumentStatus;
  searchQuery?: string;
  uploadedBy?: string;
}
