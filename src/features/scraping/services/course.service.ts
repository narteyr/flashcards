import OpenAI from 'openai';
import * as cheerio from 'cheerio';
import { Course, Program } from '../types';


export class CourseService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Scrapes the Dartmouth programs page and extracts all academic programs
   * @returns Array of programs with name and code
   */
  async getPrograms(): Promise<Program[]> {
    try {
      // Fetch the webpage
      const response = await fetch(
        'https://dartmouth.smartcatalogiq.com/en/current/orc/departments-programs-undergraduate'
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch page: ${response.statusText}`);
      }

      const html = await response.text();
      
      // Parse HTML and extract text from anchor tags
      const $ = cheerio.load(html);
      
      // Remove the head tag
      $('head').remove();
      
      // Extract all text from <a> tags
      const linkTexts: string[] = [];
      $('a').each((_, element) => {
        const text = $(element).text().trim();
        if (text) {
          linkTexts.push(text);
        }
      });

      // Join all link texts for context
      const linkTextsString = linkTexts.join('\n');
      
      // Use Claude to parse and extract program names and codes
      const programs = await this.parseWithClaude(linkTextsString);
      
      return programs;
    } catch (error) {
      console.error('Error fetching programs:', error);
      throw error;
    }
  }

  /**
   * Scrapes a specific program page and extracts all courses
   * @param url - The full URL to the program page
   * @returns Array of courses with name and code
   */
  async getCoursesByUrl(url: string): Promise<Course[]> {
    try {
      console.log(`🔗 Fetching URL: ${url}`);
      
      // Extract program code from URL (e.g., "aaas" from the URL)
      const urlParts = url.split('/');
      const lastPart = urlParts[urlParts.length - 1];
      const programCode = lastPart.split('-')[0].toUpperCase();
      
      console.log(`📝 Detected program code: ${programCode}`);
      
      // Fetch the webpage
      const response = await fetch(url);
      
      console.log(`📡 Response status for ${programCode}: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch page for ${programCode}: ${response.statusText} (URL: ${url})`);
      }

      const html = await response.text();
      
      // Parse HTML and extract text from anchor tags
      const $ = cheerio.load(html);
      
      // Remove the head tag
      $('head').remove();
      
      // Extract all text from <a> tags
      const linkTexts: string[] = [];
      $('a').each((_, element) => {
        const text = $(element).text().trim();
        if (text) {
          linkTexts.push(text);
        }
      });

      // Join all link texts for context
      const linkTextsString = linkTexts.join('\n');

      // Use OpenAI to parse and extract course names and codes
      const courses = await this.parseCoursesWithClaude(linkTextsString, programCode);
      
      return courses;
    } catch (error) {
      console.error(`Error fetching courses from URL ${url}:`, error);
      throw error;
    }
  }

  /**
   * Scrapes a specific program page and extracts all courses
   * @param programCode - The program code (e.g., "AAAS", "ANTH")
   * @param programName - The program name (e.g., "African and African American Studies", "Anthropology")
   * @returns Array of courses with name and code
   * @deprecated Use getCoursesByUrl instead
   */
  async getCourses(programCode: string, programName: string): Promise<Course[]> {
    try {
      // Convert program name to URL-friendly format (lowercase, spaces to hyphens, remove apostrophes and commas)
      const urlFriendlyName = programName
        .toLowerCase()
        .replace(/[',]/g, '') // Remove apostrophes and commas
        .replace(/\s+/g, '-'); // Replace spaces with hyphens
      const urlFriendlyCode = programCode.toLowerCase();
      
      // Build the URL
      const url = `https://dartmouth.smartcatalogiq.com/en/current/orc/departments-programs-undergraduate/${urlFriendlyName}/${urlFriendlyCode}-${urlFriendlyName}`;
      
      console.log(`🔗 Fetching URL: ${url}`);
      
      // Fetch the webpage
      const response = await fetch(url);
      
      console.log(`📡 Response status for ${programCode}: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch page for ${programCode}: ${response.statusText} (URL: ${url})`);
      }

      const html = await response.text();
      
      // Parse HTML and extract text from anchor tags
      const $ = cheerio.load(html);
      
      // Remove the head tag
      $('head').remove();
      
      // Extract all text from <a> tags
      const linkTexts: string[] = [];
      $('a').each((_, element) => {
        const text = $(element).text().trim();
        if (text) {
          linkTexts.push(text);
        }
      });

      // Join all link texts for context
      const linkTextsString = linkTexts.join('\n');

      // Use Claude to parse and extract course names and codes
      const courses = await this.parseCoursesWithClaude(linkTextsString, programCode);
      
      return courses;
    } catch (error) {
      console.error(`Error fetching courses for ${programCode}:`, error);
      throw error;
    }
  }

  /**
   * Uses OpenAI to parse the text and extract program names and codes
   */
  private async parseWithClaude(text: string): Promise<Program[]> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that extracts structured data from text and returns it in valid JSON format.'
          },
          {
            role: 'user',
            content: `You are analyzing text extracted from anchor tags on the Dartmouth academic programs page. 
            
Your task is to identify all academic programs and extract their names and codes.

Each program typically has a code (like "ANTH", "BIOL", "CHEM", etc.) followed by or near its full name.

Please return a JSON object with a "programs" key containing an array of objects, where each object has:
- "name": the full program name (e.g., "Anthropology")
- "code": the program code (e.g., "ANTH")

Only include actual academic department/program entries. Filter out navigation links, general text, or non-program entries.

Here is the text to parse:

${text}

Return ONLY valid JSON in this exact format:
{
  "programs": [
    {"name": "Program Name", "code": "CODE"},
    ...
  ]
}`
          }
        ],
        response_format: { type: 'json_object' }
      });

      // Extract the text content from OpenAI's response
      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Parse the JSON response
      const parsed = JSON.parse(content);
      const programs: Program[] = parsed.programs || [];
      
      return programs;
    } catch (error) {
      console.error('Error parsing with OpenAI:', error);
      throw error;
    }
  }

  /**
   * Uses OpenAI to parse the text and extract course names and codes
   */
  private async parseCoursesWithClaude(text: string, programCode: string): Promise<Course[]> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that extracts structured data from text and returns it in valid JSON format.'
          },
          {
            role: 'user',
            content: `You are analyzing text extracted from anchor tags on a Dartmouth academic program's course listing page for the ${programCode} program.
            
Your task is to identify all courses and extract their names and codes.

Each course has a code (like "${programCode} 1", "${programCode} 10", "${programCode} 25", etc.) and a course title.

Please return a JSON object with a "courses" key containing an array of objects, where each object has:
- "name": the full course name/title
- "code": the complete course code (e.g., "${programCode} 1", "${programCode} 25")

Only include actual course entries. Filter out navigation links, general text, or non-course entries.
A course code typically follows the pattern: ${programCode} followed by a number.

Here is the text to parse:

${text}

Return ONLY valid JSON in this exact format:
{
  "courses": [
    {"name": "Course Title", "code": "${programCode} 1"},
    ...
  ]
}`
          }
        ],
        response_format: { type: 'json_object' }
      });

      // Extract the text content from OpenAI's response
      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Parse the JSON response
      const parsed = JSON.parse(content);
      const courses: Course[] = parsed.courses || [];
      
      return courses;
    } catch (error) {
      console.error('Error parsing courses with OpenAI:', error);
      throw error;
    }
  }
}
