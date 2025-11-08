#!/usr/bin/env tsx

/**
 * Script to populate Firestore with courses from all programs
 * 
 * This script:
 * 1. Reads the programs from public/docs/courses.json
 * 2. For each program, fetches all courses using the CourseService
 * 3. Stores each course in Firestore with the course code as the document ID
 * 
 * Usage: npm run populate-courses
 */

import { doc, writeBatch } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { CourseService } from '../src/features/scraping/services/course.service';
import { db } from '../src/lib/firebase';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

interface Program {
  name: string;
  code: string;
}

async function populateCourses() {
  console.log('🚀 Starting course population script...\n');

  // Read programs from JSON file
  const programsPath = path.join(__dirname, '../public/docs/courses.json');
  let programs: Program[];

  try {
    const programsData = fs.readFileSync(programsPath, 'utf8');
    programs = JSON.parse(programsData);
    console.log(`✅ Loaded ${programs.length} programs from courses.json\n`);
  } catch (error) {
    console.error('❌ Error reading programs file:', error);
    process.exit(1);
  }

  const courseService = new CourseService();
  let totalCourses = 0;
  let successfulPrograms = 0;
  let failedPrograms = 0;

  // Process each program
  for (let i = 0; i < programs.length; i++) {
    const program = programs[i];
    console.log(`\n[${i + 1}/${programs.length}] Processing: ${program.name} (${program.code})`);

    try {
      // Fetch courses for this program
      const courses = await courseService.getCourses(program.code, program.name);
      console.log(`  📚 Found ${courses.length} courses`);

      if (courses.length === 0) {
        console.log(`  ⚠️  No courses found, skipping...`);
        continue;
      }

      // Store each course in Firestore
      const batch = writeBatch(db);
      let batchCount = 0;

      for (const course of courses) {
        // Use course code as document ID (replace spaces with underscores for Firestore compatibility)
        const docId = course.code.replace(/\s+/g, '_');
        const courseRef = doc(db, 'courses', docId);

        batch.set(courseRef, {
          code: course.code,
          name: course.name,
          programCode: program.code,
          programName: program.name,
          createdAt: new Date(),
          updatedAt: new Date()
        }, { merge: true });

        batchCount++;

        // Firestore batch limit is 500, commit and start new batch if needed
        if (batchCount >= 500) {
          await batch.commit();
          console.log(`  💾 Committed batch of ${batchCount} courses`);
          batchCount = 0;
        }
      }

      // Commit remaining courses
      if (batchCount > 0) {
        await batch.commit();
        console.log(`  💾 Committed ${batchCount} courses to Firestore`);
      }

      totalCourses += courses.length;
      successfulPrograms++;
      console.log(`  ✅ Successfully processed ${program.code}`);

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`  ❌ Error processing ${program.code}:`, error);
      failedPrograms++;
      // Continue with next program
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Final Summary:');
  console.log('='.repeat(60));
  console.log(`✅ Successfully processed: ${successfulPrograms} programs`);
  console.log(`❌ Failed: ${failedPrograms} programs`);
  console.log(`📚 Total courses added: ${totalCourses}`);
  console.log('='.repeat(60));
  console.log('\n✨ Script completed!');
}

// Run the script
populateCourses()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
