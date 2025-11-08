'use client';

import { useState } from 'react';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function PopulateCoursesPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [stats, setStats] = useState({
    totalPrograms: 0,
    processedPrograms: 0,
    failedPrograms: 0,
    totalCourses: 0,
  });

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const populateCourses = async () => {
    setIsRunning(true);
    setLogs([]);
    setStats({
      totalPrograms: 0,
      processedPrograms: 0,
      failedPrograms: 0,
      totalCourses: 0,
    });

    addLog('🚀 Starting course population...');

    try {
      // Fetch program URLs from the JSON file
      const response = await fetch('/docs/programs.json');
      const programUrls: string[] = await response.json();
      
      // Filter out empty strings and invalid URLs
      const validUrls = programUrls.filter(url => url && url.trim().length > 0);
      
      addLog(`✅ Loaded ${validUrls.length} program URLs from programs.json`);
      setStats((prev) => ({ ...prev, totalPrograms: validUrls.length }));

      let totalCourses = 0;
      let successfulPrograms = 0;
      let failedPrograms = 0;

      // Process each program URL
      for (let i = 0; i < validUrls.length; i++) {
        const url = validUrls[i];
        
        // Extract program name from URL for display
        const urlParts = url.split('/');
        const programSlug = urlParts[urlParts.length - 1];
        const programCode = programSlug.split('-')[0].toUpperCase();
        
        addLog(`\n[${i + 1}/${validUrls.length}] Processing: ${programCode} (${url})`);

        try {
          // Call the server-side API to scrape courses (avoids CORS issues)
          const apiResponse = await fetch('/api/courses/scrapeByUrl', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
          });

          if (!apiResponse.ok) {
            const errorData = await apiResponse.json();
            throw new Error(errorData.error || `API returned ${apiResponse.status}`);
          }

          const { courses }: { courses: { code: string; name: string }[] } = await apiResponse.json();
          addLog(`  📚 Found ${courses.length} courses for ${programCode}`);

          if (courses.length === 0) {
            addLog(`  ⚠️  No courses found for ${programCode}, skipping...`);
            continue;
          }

          // Store all courses for this program in a single document
          const batch = writeBatch(db);
          const programRef = doc(db, 'programs', programCode);

          batch.set(
            programRef,
            {
              programCode: programCode,
              programUrl: url,
              programName: programSlug.split('-').slice(1).join(' ').replace(/\b\w/g, (l) => l.toUpperCase()),
              courses: courses.map(course => ({
                code: course.code,
                name: course.name,
              })),
              totalCourses: courses.length,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            { merge: true }
          );

          await batch.commit();
          addLog(`  💾 Stored ${courses.length} courses in program document ${programCode}`);

          totalCourses += courses.length;
          successfulPrograms++;
          addLog(`  ✅ Successfully processed ${programCode}`);

          // Update stats
          setStats({
            totalPrograms: validUrls.length,
            processedPrograms: successfulPrograms,
            failedPrograms: failedPrograms,
            totalCourses: totalCourses,
          });

          // Add a small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          addLog(`  ❌ Error processing ${programCode}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          failedPrograms++;
          setStats((prev) => ({
            ...prev,
            failedPrograms: prev.failedPrograms + 1,
          }));
        }
      }

      addLog('\n' + '='.repeat(60));
      addLog('📊 Final Summary:');
      addLog('='.repeat(60));
      addLog(`✅ Successfully processed: ${successfulPrograms} programs`);
      addLog(`❌ Failed: ${failedPrograms} programs`);
      addLog(`📚 Total courses stored: ${totalCourses}`);
      addLog(`📁 Program documents created: ${successfulPrograms}`);
      addLog('='.repeat(60));
      addLog('\n✨ Population completed!');
    } catch (error) {
      addLog(`❌ Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Course Population Admin
          </h1>
          <p className="text-gray-600 mb-6">
            Populate Firestore with courses from all Dartmouth programs
          </p>

          <button
            onClick={populateCourses}
            disabled={isRunning}
            className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
              isRunning
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isRunning ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Running...
              </span>
            ) : (
              '▶️ Start Population'
            )}
          </button>
        </div>

        {/* Stats Panel */}
        {stats.totalPrograms > 0 && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Total Programs</div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.totalPrograms}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Processed</div>
              <div className="text-2xl font-bold text-green-600">
                {stats.processedPrograms}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Failed</div>
              <div className="text-2xl font-bold text-red-600">
                {stats.failedPrograms}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Total Courses</div>
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalCourses}
              </div>
            </div>
          </div>
        )}

        {/* Logs Panel */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Execution Logs
          </h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-auto max-h-[600px]">
            {logs.length === 0 ? (
              <div className="text-gray-500">
                No logs yet. Click &quot;Start Population&quot; to begin.
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="whitespace-pre-wrap">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
