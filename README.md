# 🎓 Dartmouth Flashcard Builder

An AI-powered flashcard generation tool specifically designed for Dartmouth courses. Upload your course materials (PDFs, DOCX, TXT, CSV, JSON) and automatically generate study flashcards using advanced LLM technology.

## 🌟 Features

### 📚 Course-Based Organization
- **Full Dartmouth Course Catalog**: Access all Dartmouth programs and courses stored in Firestore
- **Smart Course Selection**: 
  - Browse by department/program (COSC, MATH, ENGL, etc.)
  - Search courses by number or title
  - Real-time course filtering
- **Deck Management**: One flashcard deck per course for organized studying

### 🤖 AI-Powered Flashcard Generation
- **Multi-LLM Support**: Compatible with OpenAI, Anthropic Claude, and Google Gemini
- **Smart Document Processing**:
  - Automatic text extraction from multiple file formats
  - Intelligent chunking with LangChain
  - Context-aware flashcard generation
- **Supported File Formats**:
  - PDF (`.pdf`)
  - Word Documents (`.docx`)
  - Plain Text (`.txt`)
  - CSV (`.csv`)
  - JSON (`.json`)

### 📊 Document Chunking & Preview
- Documents are split into manageable chunks (configurable size: 1000 characters, overlap: 100 characters)
- Preview chunks before flashcard generation
- See exactly what content is being processed

### 🎯 Admin Tools
- **Bulk Course Population**: Admin interface to populate Firestore with all Dartmouth courses
- **Progress Tracking**: Real-time logs and statistics during course data import
- **Automated Scraping**: Fetch course data directly from Dartmouth's course catalog

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (Node.js runtime)
- **Database**: Firebase Firestore
- **AI/ML**: 
  - LangChain for document processing
  - OpenAI GPT / Anthropic Claude / Google Gemini for flashcard generation
- **Document Parsing**: pdf-parse, mammoth (DOCX), native text parsing

### Project Structure
```
flashcards/
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   └── populate/          # Admin page for populating courses
│   │   ├── api/
│   │   │   ├── document-parser/   # Document upload & flashcard generation
│   │   │   ├── programs/          # Firestore program/course APIs
│   │   │   │   └── courses/       # Get courses for a program
│   │   │   └── courses/
│   │   │       └── scrapeByUrl/   # Web scraping for course data
│   │   ├── document-parser/       # Main flashcard builder UI
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── features/
│   │   ├── llm/                   # LLM integration & flashcard generation
│   │   └── scraping/              # Web scraping services for courses
│   └── lib/
│       └── firebase.ts            # Firebase configuration
├── public/
│   └── docs/
│       └── programs.json          # List of Dartmouth program URLs
└── scripts/
    └── README.md                  # Scripts documentation
```

### Database Schema (Firestore)

**Collection: `programs`**
```typescript
{
  // Document ID: Program code (e.g., "COSC", "MATH", "ENGL")
  programCode: string;           // e.g., "COSC"
  programName: string;           // e.g., "Computer Science"
  programUrl: string;            // Source URL from Dartmouth catalog
  totalCourses: number;          // Count of courses
  courses: [
    {
      code: string;              // e.g., "COSC 50"
      name: string;              // e.g., "Software Design and Implementation"
    }
  ],
  createdAt: Date;
  updatedAt: Date;
}
```

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ 
- npm/yarn/pnpm/bun
- Firebase project with Firestore enabled
- API key for at least one LLM provider (OpenAI, Anthropic, or Google)

### Installation

1. **Clone the repository**
   ```bash
   cd flashcards
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

   # LLM API Keys (at least one required)
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   GOOGLE_API_KEY=AI...
   ```

4. **Populate Firestore with Dartmouth courses** (one-time setup)
   
   Navigate to: `http://localhost:3000/admin/populate`
   
   Click "Start Population" to scrape and store all Dartmouth courses in Firestore. This may take 10-15 minutes.

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open the app**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 How to Use

### Creating Flashcards

1. **Select a Program/Department**
   - Choose from the dropdown (e.g., "COSC - Computer Science")
   - Programs are loaded from Firestore

2. **Search & Select a Course**
   - Type in the search box to filter by course number or title
   - Select a specific course (e.g., "COSC 50 - Software Design and Implementation")

3. **Upload Documents**
   - Click "Choose Files" and select your course materials
   - Multiple files supported
   - Accepted formats: PDF, DOCX, TXT, CSV, JSON

4. **Generate Flashcards**
   - Click "Upload & Generate"
   - Watch the progress bar as your documents are:
     - Uploaded
     - Split into chunks
     - Processed by AI
     - Converted into flashcards

5. **Review Results**
   - Preview document chunks
   - See generated flashcards with front/back content
   - View tags and metadata

### Admin: Populating Course Data

Navigate to `/admin/populate` to:
- Scrape all Dartmouth programs and courses
- See real-time logs and progress
- View statistics (total programs, courses, failures)

## 🎯 API Endpoints

### `POST /api/document-parser`
Upload documents and generate flashcards.

**Request:**
- `Content-Type`: multipart/form-data
- `files`: File[] (required)
- `courseId`: string (optional) - Course code

**Response:**
```json
{
  "message": "Flashcards generated successfully",
  "provider": "openai",
  "chunkCount": 15,
  "courseId": "COSC 50",
  "summaries": [...],
  "flashcards": [
    {
      "id": "...",
      "front": "What is...",
      "back": "...",
      "tags": ["concept", "definition"]
    }
  ]
}
```

### `GET /api/programs`
Get all Dartmouth programs from Firestore.

**Response:**
```json
{
  "status": "ok",
  "programs": [
    {
      "code": "COSC",
      "name": "Computer Science",
      "totalCourses": 45
    }
  ],
  "count": 100
}
```

### `GET /api/programs/courses?programCode=COSC`
Get all courses for a specific program.

**Response:**
```json
{
  "status": "ok",
  "programCode": "COSC",
  "programName": "Computer Science",
  "courses": [
    {
      "code": "COSC 50",
      "name": "Software Design and Implementation"
    }
  ],
  "count": 45
}
```

### `POST /api/courses/scrapeByUrl`
Scrape courses from a Dartmouth program URL (admin use).

**Request:**
```json
{
  "url": "https://dartmouth.smartcatalogiq.com/..."
}
```

## 🧪 LLM Configuration

The app supports multiple LLM providers. Configure your preferred provider in `src/features/llm/`:

- **OpenAI GPT**: Uses `gpt-4o` or `gpt-5`
- **Anthropic Claude**: Uses `claude-3-5-sonnet-20241022`
- **Google Gemini**: Uses `gemini-1.5-flash`

The system automatically selects the first available provider based on configured API keys.

## 🔧 Configuration

### Document Chunking
Edit in `src/app/api/document-parser/route.ts`:
```typescript
const DEFAULT_CHUNK_SIZE = 1000;      // Characters per chunk
const DEFAULT_CHUNK_OVERLAP = 100;    // Overlap between chunks
```

### Flashcard Generation Prompt
Customize in `src/app/document-parser/llm_client.ts` to adjust:
- Number of flashcards per chunk
- Flashcard format and style
- Tag generation logic

## 📦 Scripts

### Development
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 🤝 Contributing

This project was built for a hackathon to help Dartmouth students study more effectively!

## 📝 License

MIT License - feel free to use and modify for your own educational purposes.

## 🙏 Acknowledgments

- Dartmouth College for the course catalog data
- LangChain for document processing capabilities
- OpenAI, Anthropic, and Google for their amazing LLM APIs
- Firebase for easy-to-use backend infrastructure

---

**Built with ❤️ for Dartmouth students**
