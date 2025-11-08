import { NextResponse } from 'next/server';
import { CourseService } from '@/features/scraping/services/course.service';

export async function GET() {
  try {
    const courseService = new CourseService();
    const programs = await courseService.getPrograms();
    
    return NextResponse.json({ 
      status: 'ok',
      programs,
      count: programs.length
    });
    
  } catch (error) {
    console.error('Error in getPrograms API:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}