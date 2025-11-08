# Scripts

This directory contains utility scripts for the Dartmouth Flashcard Builder project.

## 📋 Overview

All course population functionality has been moved to the web UI for better usability and real-time monitoring.

## 🌐 Course Population (Web UI - Recommended)

Instead of running command-line scripts, use the **admin web interface**:

### How to Use:

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to the admin page:
   ```
   http://localhost:3000/admin/populate
   ```

3. Click **"Start Population"** to scrape and store all Dartmouth courses

### Benefits of Web UI:

- ✅ **Real-time progress tracking** - See exactly what's happening
- ✅ **Visual logs** - Color-coded terminal output
- ✅ **Statistics dashboard** - Live stats on programs processed, courses added
- ✅ **Error visibility** - Immediately see which programs failed
- ✅ **No command-line setup** - Just click a button!

### What it Does:

1. Reads program URLs from `public/docs/programs.json`
2. Scrapes each Dartmouth program's course listing
3. Stores data in Firestore with this structure:
   ```typescript
   // Collection: programs
   // Document ID: Program code (e.g., "COSC")
   {
     programCode: "COSC",
     programName: "Computer Science",
     programUrl: "https://...",
     courses: [
       {
         code: "COSC 50",
         name: "Software Design and Implementation"
       }
       // ... more courses
     ],
     totalCourses: 45,
     createdAt: Date,
     updatedAt: Date
   }
   ```

### Expected Runtime:

- **Programs**: ~49 programs
- **Time per program**: 2-3 seconds
- **Total time**: 10-15 minutes
- **Rate limiting**: 1 second delay between programs

## 📝 Historical Note

Previous command-line scripts (`populate-courses.ts`, `split_document.mjs`) have been deprecated and removed in favor of:
- The web-based admin interface (for course population)
- The main document-parser API (for document processing)

These provide better usability, visibility, and integration with the rest of the application.
