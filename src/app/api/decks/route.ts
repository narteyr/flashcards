import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Deck, Flashcard } from '@/types/deck';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseCode = searchParams.get('courseCode');

    if (!courseCode) {
      return NextResponse.json(
        { 
          status: 'error',
          error: 'courseCode parameter is required'
        },
        { status: 400 }
      );
    }

    // Sanitize courseCode for use as document ID (replace spaces with underscores)
    const deckId = courseCode.replace(/\s+/g, '_');
    const deckRef = doc(db, 'decks', deckId);
    const deckDoc = await getDoc(deckRef);

    if (!deckDoc.exists()) {
      return NextResponse.json(
        { 
          status: 'ok',
          exists: false,
          deck: null
        }
      );
    }

    const data = deckDoc.data();
    const deck: Deck = {
      id: deckDoc.id,
      courseCode: data.courseCode,
      courseName: data.courseName,
      programCode: data.programCode,
      programName: data.programName,
      flashcards: data.flashcards || [],
      totalCards: data.totalCards || 0,
      userId: data.userId || data.contributors?.[0] || 'anonymous',
      contributors: data.contributors || [],
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      lastPracticed: data.lastPracticed?.toDate(),
    };

    return NextResponse.json({ 
      status: 'ok',
      exists: true,
      deck
    });
    
  } catch (error) {
    console.error('Error fetching deck from Firestore:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseCode, courseName, programCode, programName, flashcards, userId } = body;

    if (!courseCode || !courseName || !flashcards) {
      return NextResponse.json(
        { 
          status: 'error',
          error: 'courseCode, courseName, and flashcards are required'
        },
        { status: 400 }
      );
    }

    // Sanitize courseCode for use as document ID
    const deckId = courseCode.replace(/\s+/g, '_');
    const deckRef = doc(db, 'decks', deckId);
    const deckDoc = await getDoc(deckRef);

    const now = Timestamp.now();
    const contributorId = userId || 'anonymous';

    if (deckDoc.exists()) {
      // Deck exists - merge new flashcards with existing ones
      const existingData = deckDoc.data();
      const existingFlashcards: Flashcard[] = existingData.flashcards || [];
      
      // Merge flashcards (new ones get appended)
      const mergedFlashcards = [...existingFlashcards, ...flashcards];
      
      await updateDoc(deckRef, {
        flashcards: mergedFlashcards,
        totalCards: mergedFlashcards.length,
        contributors: arrayUnion(contributorId),
        updatedAt: now,
      });

      return NextResponse.json({
        status: 'ok',
        message: 'Deck updated with new flashcards',
        deckId,
        totalCards: mergedFlashcards.length,
        newCards: flashcards.length,
      });
    } else {
      // Create new deck
      const newDeck = {
        courseCode,
        courseName,
        programCode: programCode || courseCode.split(' ')[0],
        programName: programName || '',
        flashcards,
        totalCards: flashcards.length,
        userId: contributorId,
        contributors: [contributorId],
        createdAt: now,
        updatedAt: now,
      };

      console.log('Creating new deck with data:', {
        ...newDeck,
        flashcards: `${flashcards.length} cards`,
        userId: contributorId,
      });

      await setDoc(deckRef, newDeck);

      return NextResponse.json({
        status: 'ok',
        message: 'Deck created successfully',
        deckId,
        totalCards: flashcards.length,
      });
    }
    
  } catch (error) {
    console.error('Error saving deck to Firestore:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseCode } = body;

    if (!courseCode) {
      return NextResponse.json(
        { 
          status: 'error',
          error: 'courseCode is required'
        },
        { status: 400 }
      );
    }

    const deckId = courseCode.replace(/\s+/g, '_');
    const deckRef = doc(db, 'decks', deckId);

    await updateDoc(deckRef, {
      lastPracticed: Timestamp.now(),
    });

    return NextResponse.json({
      status: 'ok',
      message: 'Deck practice time updated',
    });
    
  } catch (error) {
    console.error('Error updating deck:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
