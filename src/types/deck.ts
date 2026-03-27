export interface Flashcard {
  id: string;
  front: string;
  back: string;
  tags?: string[];
  sourceChunkIds?: string[];
  createdAt?: Date;
}

export interface Deck {
  id: string;
  courseCode: string; // e.g., "COSC 50"
  courseName: string;
  programCode: string; // e.g., "COSC"
  programName: string;
  flashcards: Flashcard[];
  totalCards: number;
  userId: string; // Owner of the deck
  contributors: string[]; // User IDs who contributed
  createdAt: Date;
  updatedAt: Date;
  lastPracticed?: Date;
}

export interface DeckMetadata {
  id: string;
  courseCode: string;
  courseName: string;
  programCode: string;
  programName: string;
  totalCards: number;
  contributors: string[];
  createdAt: Date;
  updatedAt: Date;
  lastPracticed?: Date;
}
