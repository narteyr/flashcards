#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

async function main() {
  const [, , inputPath] = process.argv;

  if (!inputPath) {
    console.error('Usage: node scripts/split_document.mjs <path-to-text-file>');
    process.exitCode = 1;
    return;
  }

  try {
    const content = await readFile(inputPath, 'utf8');
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 150,
    });

    const documents = await splitter.createDocuments([content]);

    console.log(`Split "${inputPath}" into ${documents.length} chunk(s):\n`);
    documents.forEach((doc, index) => {
      console.log(`Chunk ${index + 1}`);
      console.log('='.repeat(40));
      console.log(doc.pageContent);
      console.log('');
    });
  } catch (error) {
    console.error(`Failed to split "${inputPath}":`, error);
    process.exitCode = 1;
  }
}

main();

