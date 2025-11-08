import Anthropic from '@anthropic-ai/sdk';
import * as cheerio from 'cheerio';

interface Program {
  name: string;
  code: string;
}

interface Course {
  name: string;
  code: string;
}

export class CourseService {
  private anthropic: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    this.anthropic = new Anthropic({ apiKey });
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
   * @param programCode - The program code (e.g., "AAAS", "ANTH")
   * @param programName - The program name (e.g., "African and African American Studies", "Anthropology")
   * @returns Array of courses with name and code
   */
  async getCourses(programCode: string, programName: string): Promise<Course[]> {
    try {
      // Convert program name to URL-friendly format (lowercase, spaces to hyphens)
      const urlFriendlyName = programName.toLowerCase().replace(/\s+/g, '-');
      const urlFriendlyCode = programCode.toLowerCase();
      
      // Build the URL
      const url = `https://dartmouth.smartcatalogiq.com/en/current/orc/departments-programs-undergraduate/${urlFriendlyName}/${urlFriendlyCode}-${urlFriendlyName}`;
      
      // Fetch the webpage
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch page for ${programCode}: ${response.statusText}`);
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
   * Uses Claude to parse the text and extract program names and codes
   */
  private async parseWithClaude(text: string): Promise<Program[]> {
    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: `You are analyzing text extracted from anchor tags on the Dartmouth academic programs page. 
            
Your task is to identify all academic programs and extract their names and codes.

Each program typically has a code (like "ANTH", "BIOL", "CHEM", etc.) followed by or near its full name.

Please return a JSON array of objects, where each object has:
- "name": the full program name (e.g., "Anthropology")
- "code": the program code (e.g., "ANTH")

Only include actual academic department/program entries. Filter out navigation links, general text, or non-program entries.

Here is the text to parse:

${text}

Return ONLY the JSON array, no additional text or explanation.`
          }
        ]
      });

      // Extract the text content from Claude's response
      const content = message.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Parse the JSON response
      const programs: Program[] = JSON.parse(content.text);
      
      return programs;
    } catch (error) {
      console.error('Error parsing with Claude:', error);
      throw error;
    }
  }

  /**
   * Uses Claude to parse the text and extract course names and codes
   */
  private async parseCoursesWithClaude(text: string, programCode: string): Promise<Course[]> {
    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: `You are analyzing text extracted from anchor tags on a Dartmouth academic program's course listing page for the ${programCode} program.
            
Your task is to identify all courses and extract their names and codes.

Each course has a code (like "${programCode} 1", "${programCode} 10", "${programCode} 25", etc.) and a course title.

Please return a JSON array of objects, where each object has:
- "name": the full course name/title
- "code": the complete course code (e.g., "${programCode} 1", "${programCode} 25")

Only include actual course entries. Filter out navigation links, general text, or non-course entries.
A course code typically follows the pattern: ${programCode} followed by a number.

Here is the text to parse:

${text}

Return ONLY the JSON array, no additional text or explanation.`
          }
        ]
      });

      // Extract the text content from Claude's response
      const content = message.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Parse the JSON response
      const courses: Course[] = JSON.parse(content.text);
      
      return courses;
    } catch (error) {
      console.error('Error parsing courses with Claude:', error);
      throw error;
    }
  }
}
