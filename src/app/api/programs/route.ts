import { NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET() {
  try {
    const programsRef = collection(db, 'programs');
    const snapshot = await getDocs(programsRef);
    
    const programs = snapshot.docs.map((doc) => ({
      code: doc.id,
      name: doc.data().programName || doc.id,
      totalCourses: doc.data().totalCourses || 0,
    }));

    // Sort alphabetically by code
    programs.sort((a, b) => a.code.localeCompare(b.code));

    return NextResponse.json({ 
      status: 'ok',
      programs,
      count: programs.length
    });
    
  } catch (error) {
    console.error('Error fetching programs from Firestore:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
