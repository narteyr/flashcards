# Admin Page - Course Population

A web-based admin interface for populating Firestore with Dartmouth courses.

## Access

Navigate to: `http://localhost:3000/admin/populate`

## Features

### 📊 Real-time Statistics
- **Total Programs**: Number of programs to process
- **Processed**: Successfully completed programs
- **Failed**: Programs that encountered errors
- **Total Courses**: Number of courses added to Firestore

### 📝 Live Logs
- Terminal-style log viewer with green text on dark background
- Real-time updates as the script runs
- Auto-scrolls to show latest logs
- Shows progress for each program

### 🎯 One-Click Execution
- Single button to start the population process
- Button disables during execution to prevent duplicate runs
- Shows loading spinner while running

## How It Works

1. Click **"▶️ Start Population"**
2. The script will:
   - Load all programs from `/docs/courses.json`
   - For each program:
     - Scrape the Dartmouth course catalog
     - Parse courses using OpenAI
     - Store courses in Firestore with batch writes
   - Display progress in real-time
3. View final summary when complete

## Example Output

```
[10:15:23] 🚀 Starting course population...
[10:15:23] ✅ Loaded 41 programs from courses.json

[10:15:24] [1/41] Processing: African and African American Studies (AAAS)
[10:15:26]   📚 Found 25 courses for AAAS
[10:15:26]   💾 Committed 25 courses to Firestore
[10:15:26]   ✅ Successfully processed AAAS

[10:15:27] [2/41] Processing: Anthropology (ANTH)
[10:15:29]   📚 Found 42 courses for ANTH
[10:15:29]   💾 Committed 42 courses to Firestore
[10:15:29]   ✅ Successfully processed ANTH

...

============================================================
📊 Final Summary:
============================================================
✅ Successfully processed: 39 programs
❌ Failed: 2 programs
📚 Total courses added: 1,234
============================================================

✨ Population completed!
```

## Requirements

Make sure your `.env.local` has:
```bash
OPENAI_API_KEY=sk-...
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...
```

## Notes

- ⏱️ Takes approximately 2-3 minutes to complete all programs
- 🔄 Uses 1-second delays between programs to avoid rate limiting
- 💾 Uses Firestore batch writes (500 docs per batch) for efficiency
- 🔁 Courses are stored with merge enabled, so re-running won't create duplicates
- 🌐 Runs entirely client-side in the browser
