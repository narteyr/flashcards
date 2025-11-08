import { NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const programCode = searchParams.get('programCode');

    if (!programCode) {
      return NextResponse.json(
        { 
          status: 'error',
          error: 'programCode parameter is required'
        },
        { status: 400 }
      );
    }

    const programRef = doc(db, 'programs', programCode.toUpperCase());
    const programDoc = await getDoc(programRef);

    if (!programDoc.exists()) {
      return NextResponse.json(
        { 
          status: 'error',
          error: `Program ${programCode} not found`
        },
        { status: 404 }
      );
    }

    const data = programDoc.data();
    const courses = data.courses || [];

    return NextResponse.json({ 
      status: 'ok',
      programCode: programDoc.id,
      programName: data.programName || programDoc.id,
      courses,
      count: courses.length
    });
    
  } catch (error) {
    console.error('Error fetching courses from Firestore:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
