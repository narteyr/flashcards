You are an expect Fullstack and AI engineer, you are to build a better version of coursehero for my platform. You are to implement these features.

i want you to first build the frontend ui, like coursehero layout with untitled UI componenents.


📘 PHASE 1 — AI/Developer Instructions for Building Core Features

1. User Document Upload System

Goal: Allow students to upload academic documents and associate them with courses.

Requirements
	•	The system must allow users to upload files including:
	•	PDFs
	•	Images (JPG/PNG)
	•	Word documents
	•	After upload, the user must be able to:
	•	Select or create the course associated with the document
	•	Tag the document type:
	•	Notes
	•	Quiz
	•	Past paper
	•	Syllabus
	•	Assignment
	•	Review sheet
	•	Document metadata should include:
	•	Course ID
	•	Document type
	•	Title
	•	Timestamp
	•	Visibility status (default: private)

Automatic Rules
	•	All uploaded documents are private by default.
	•	Users must manually toggle “make public”.
	•	When a user requests to make a document public, the document enters a Review Queue.

⸻

2. Document Review and Moderation System

Goal: Ensure only high-quality, rule-compliant documents become public.

Requirements
	•	Build an Admin Dashboard with:
	•	List of documents awaiting approval
	•	Document preview panel
	•	Buttons: Approve, Reject, Request Revision
	•	Filtering by:
	•	Course
	•	Document type
	•	User
	•	Submission date

Review Process
	1.	User requests to make a document public.
	2.	Document is added to a Pending Review list.
	3.	Review can be performed by:
	•	AI (automated quality check)
	•	Human admin
	4.	If approved → document becomes publicly visible.
	5.	If rejected → user receives rejection reason.

AI Review Criteria
	•	Detect copyrighted or sensitive material.
	•	Check for quality: clarity, relevance, accuracy.
	•	Verify tags (course, type) are correct.
	•	Confirm no harmful or prohibited content.

⸻

3. Public Document Library

Goal: Allow students to browse, read, and use public documents.

Requirements
	•	Users can browse documents by:
	•	Course
	•	University
	•	Document type
	•	Popularity
	•	Recency
	•	Preview documents in-app (PDF viewer, image viewer, or text extraction viewer).
	•	Search should index:
	•	Text content (using OCR for images)
	•	Document title and tags

⸻

4. Flashcard Generation System

Goal: Automatically convert notes into study flashcards.

User Actions
	•	Choose a document (private or public)
	•	Click “Generate Flashcards”
	•	AI automatically:
	•	Extracts key concepts
	•	Creates Q&A flashcards
	•	Groups flashcards by topic
	•	Allows user to edit each flashcard

Flashcard Features
	•	Save sets privately
	•	Make flashcards public for the course (optional)
	•	Spaced repetition engine (Phase 2, optional)

⸻

5. Question Paper Builder

Goal: Allow users to generate practice question papers from past papers.

Inputs
	•	Selected documents (public or private past papers)
	•	Selected topics
	•	Difficulty level
	•	Number of questions

AI Tasks
	•	Extract past questions
	•	Organize questions by type:
	•	Multiple choice
	•	Short answer
	•	Long question
	•	Allow the user to:
	•	Generate a new mixed question paper
	•	Save it
	•	Download as PDF
	•	Share it (optional)

⸻

6. Course-Based Organization

Goal: Every piece of content belongs to a course for easy navigation.

Requirements
	•	A “Course Page” for each course, containing:
	•	All public documents
	•	All public flashcards
	•	Publicly shared question papers
	•	Discussion or comments section (Phase 2 optional)

Course Creation Rules
	•	Users can create new courses, but system must prevent duplicates by matching:
	•	School
	•	Course code
	•	Course name

⸻

7. User Permissions and Visibility

Private Documents
	•	Only visible to the uploader
	•	Can be used to generate flashcards or question papers privately

Public Documents
	•	Visible to all users
	•	Must be approved through review system

⸻

8. Missing Features to Include Automatically

To ensure completeness, also include:

Document Extraction
	•	AI must extract text from:
	•	PDF
	•	Images (OCR)
	•	Word documents

Automatic Tag Suggestions

AI should suggest:
	•	Course name based on document content
	•	Document type (e.g., “This looks like a quiz”)

User Profile
	•	Shows:
	•	Uploaded documents
	•	Flashcard sets
	•	Saved question papers
	•	Public contributions

⸻

🎯 If you want, I can convert this into:
	•	a technical requirements document (PRD)
	•	a task breakdown for developers
	•	a system architecture diagram
	•	a database schema
	•	a roadmap with milestones

Just tell me what format you want next!