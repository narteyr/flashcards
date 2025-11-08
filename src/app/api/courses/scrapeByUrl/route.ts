import { NextRequest, NextResponse } from 'next/server';
import { CourseService } from '@/features/scraping/services/course.service';

/**
 * POST /api/courses/scrapeByUrl
 * Scrapes courses from a specific program URL
 * This runs server-side to avoid CORS issues
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    const courseService = new CourseService();
    const courses = await courseService.getCoursesByUrl(url);

    return NextResponse.json({ courses });
  } catch (error) {
    console.error('Error scraping courses:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to scrape courses',
        details: error 
      },
      { status: 500 }
    );
  }
}
