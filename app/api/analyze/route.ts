import { NextRequest, NextResponse } from 'next/server';

import mammoth from 'mammoth';
import natural from 'natural';
import pdfParse from 'pdf-parse';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const jobDesc = formData.get('jobDesc') as string;
    const files = formData.getAll('files') as File[];

    if (!jobDesc || files.length === 0) {
      return NextResponse.json({ error: 'Missing job description or files' }, { status: 400 });
    }

    const resumes: string[] = [];
    const rawTexts: string[] = [];
    const names: string[] = [];
    const fileErrors: { Resume: string, error: string }[] = [];

    for (const file of files) {
      try {
        let text = '';
        if (file.name.endsWith('.pdf')) {
          const buffer = await file.arrayBuffer();
          const pdfData = await pdfParse(Buffer.from(buffer));
          text = pdfData.text;
        } else if (file.name.endsWith('.docx')) {
          const buffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
          text = result.value;
        } else {
          throw new Error('Unsupported file type');
        }

        const cleanText = preprocess(text);
        if (!cleanText.trim()) throw new Error('No readable text found');
        
        rawTexts.push(text);
        resumes.push(cleanText);
        names.push(file.name);
      } catch (err) {
        fileErrors.push({ Resume: file.name, error: err instanceof Error ? err.message : String(err) });
      }
    }

    if (resumes.length === 0) {
      return NextResponse.json({ results: [], errors: fileErrors });
    }

    const jobClean = preprocess(jobDesc);
    const allDocs = [jobClean, ...resumes];
    const vectors = computeTfidfVectors(allDocs);

    const scores = vectors.slice(1).map(vec => cosineSimilarity(vectors[0], vec));

    const results = scores.map((score, i) => ({
      Resume: names[i],
      'Match Score (%)': Math.round(score * 100 * 100) / 100,
      OriginalText: rawTexts[i]
    })).sort((a, b) => b['Match Score (%)'] - a['Match Score (%)']);

    return NextResponse.json({ results, errors: fileErrors });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

function preprocess(text: string): string {
  const tokenizer = new natural.WordTokenizer();
  const stemmer = natural.PorterStemmer;
  const tokens = tokenizer.tokenize(text.toLowerCase()) || [];
  return tokens.filter((token: string) => token.length > 2 && !natural.stopwords.includes(token)).map((token: string) => stemmer.stem(token)).join(' ');
}

function computeTfidfVectors(docs: string[]): number[][] {
  const allTerms = new Set<string>();
  const termFreqMaps: Map<string, number>[] = [];

  docs.forEach(doc => {
    const terms = doc.split(' ');
    const freq: Map<string, number> = new Map();
    terms.forEach(term => {
      if (!term.trim()) return;
      freq.set(term, (freq.get(term) || 0) + 1);
      allTerms.add(term);
    });
    termFreqMaps.push(freq);
  });

  const docFreq: Map<string, number> = new Map();
  allTerms.forEach(term => {
    docFreq.set(term, termFreqMaps.filter(freq => freq.has(term)).length);
  });

  const vectors: number[][] = [];
  termFreqMaps.forEach((freq) => {
    const vec = Array.from(allTerms).map((term) => {
      const tf = freq.get(term) || 0;
      const df = docFreq.get(term) || 1;
      const idf = Math.log(docs.length / df);
      return tf * idf;
    });
    vectors.push(vec);
  });

  return vectors;
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] ** 2;
    normB += vecB[i] ** 2;
  }
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  return normA === 0 || normB === 0 ? 0 : dot / (normA * normB);
}