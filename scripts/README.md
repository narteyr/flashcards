# Course Population Script

This directory contains utility scripts for managing course data.

## populate-courses.ts

Populates Firestore with all courses from Dartmouth's course catalog.

### What it does:

1. Reads all programs from `public/docs/courses.json`
2. For each program, scrapes the Dartmouth course catalog to get all courses
3. Stores each course in Firestore with the following structure:
   ```typescript
   {
     code: string,        // e.g., "COSC 50"
     name: string,        // e.g., "Software Design and Implementation"
     programCode: string, // e.g., "COSC"
     programName: string, // e.g., "Computer Science"
     createdAt: Date,
     updatedAt: Date
   }
   ```
4. Uses the course code (with spaces replaced by underscores) as the document ID

### Prerequisites:

1. **Environment Variables**: Make sure your `.env.local` file contains:
   ```bash
   OPENAI_API_KEY=sk-...
   FIREBASE_API_KEY=...
   FIREBASE_AUTH_DOMAIN=...
   FIREBASE_PROJECT_ID=...
   FIREBASE_STORAGE_BUCKET=...
   FIREBASE_MESSAGING_SENDER_ID=...
   FIREBASE_APP_ID=...
   ```

2. **Dependencies**: Install required packages:
   ```bash
   npm install
   ```

### Usage:

Run the script with:
```bash
npm run populate-courses
```

### Features:

- ✅ **Batch writes** - Uses Firestore batching for efficient writes (500 docs per batch)
- ✅ **Rate limiting** - 1 second delay between programs to avoid overwhelming the API
- ✅ **Error handling** - Continues processing even if individual programs fail
- ✅ **Progress tracking** - Shows detailed progress for each program
- ✅ **Summary report** - Displays final statistics when complete

### Example Output:

```
🚀 Starting course population script...

✅ Loaded 49 programs from courses.json

[1/49] Processing: African and African American Studies (AAAS)
  📚 Found 25 courses
  💾 Committed 25 courses to Firestore
  ✅ Successfully processed AAAS

[2/49] Processing: Anthropology (ANTH)
  📚 Found 42 courses
  💾 Committed 42 courses to Firestore
  ✅ Successfully processed ANTH

...

============================================================
📊 Final Summary:
============================================================
✅ Successfully processed: 47 programs
❌ Failed: 2 programs
📚 Total courses added: 1,234
============================================================

✨ Script completed!
```

### Notes:

- The script uses the OpenAI API for parsing course data, so make sure you have sufficient API credits
- Each program takes approximately 2-3 seconds to process (1 second for scraping + API time + 1 second delay)
- Total runtime for all programs: ~3-5 minutes
- Courses are stored with merge enabled, so running the script multiple times won't create duplicates
