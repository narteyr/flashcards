import { NextRequest, NextResponse } from 'next/server';
import { CourseService } from '@/features/scraping/services/course.service';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const programCode = searchParams.get('code');
    const programName = searchParams.get('name');

    // Validate required parameters
    if (!programCode || !programName) {
      return NextResponse.json(
        { 
          status: 'error',
          error: 'Missing required parameters: code and name are required'
        },
        { status: 400 }
      );
    }

    const courseService = new CourseService();
    const courses = await courseService.getCourses(programCode, programName);
    
    return NextResponse.json({ 
      status: 'ok',
      courses,
      count: courses.length,
      program: {
        code: programCode,
        name: programName
      }
    });
  } catch (error) {
    console.error('Error in getCourses API:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}