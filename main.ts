// One-Star Review of Something Essential — entry program.
//
// The program assembles one deadpan one-star review of an everyday
// essential and writes it to /output/entry.txt. The review is fixed by
// a deterministic chooser, so every run prints the same bytes.
//
// The review that ships complains about sleep: it takes eight hours
// a night, every night, and still hands the reviewer back each
// morning more tired than the reviewer was. That is the whole joke:
// a real grievance, filed in earnest, against a thing that cannot be
// fixed, with the sting arriving in the last few words.
//
// The program runs with no network, no secrets, and no input files.
// It reads nothing from the environment and nothing from the repo
// it lives in. Its only output is the single text file the gate
// scores, plus two short lines on stdout naming what it wrote.

import * as fs from "node:fs";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Limits from the competition rules.
// ---------------------------------------------------------------------------

const OUTPUT_PATH = "/output/entry.txt";
const MAX_CHARS = 160;
const MIN_CHARS = 1;

// The gate counts characters. A character here is one Unicode code
// point, which is what the scorer counts for plain text of this kind.
const REVIEW_STAR_PREFIX = "One star. ";

// ---------------------------------------------------------------------------
// Review parts.
//
// Each candidate is built from four parts: the essential being
// reviewed, the daily cost it charges, the way it fails to deliver,
// and the turn that lands at the end. Keeping the parts separate
// makes the shape of the joke visible in the code, and it keeps the
// assembly honest: the program composes a review, it never pastes
// a finished line from anywhere.
//
// Punctuation lives inside the parts on purpose: the assembler joins
// parts with a single space and adds nothing of its own, so a part
// that ends a clause carries its own comma, and a part that ends
// the review carries its own full stop.
// ---------------------------------------------------------------------------

interface ReviewParts {
  subject: string;
  cost: string;
  failure: string;
  turn: string;
}

const CANDIDATE_PARTS: ReadonlyArray<ReviewParts> = [
  {
    subject: "Sleep",
    cost: "takes eight hours a night, every night,",
    failure: "and still hands me back each morning",
    turn: "more tired than I was.",
  },
  {
    subject: "Gravity",
    cost: "has dropped everything I have ever owned,",
    failure: "and after all these years",
    turn: "it still will not apologise.",
  },
  {
    subject: "The sun",
    cost: "is too bright to look at and too hot to stand under,",
    failure: "and it leaves every single day",
    turn: "without giving notice.",
  },
  {
    subject: "Water",
    cost: "falls free from the sky,",
    failure: "and the only version I can drink costs money",
    turn: "and tastes like a swimming pool.",
  },
  {
    subject: "Monday",
    cost: "arrives every week without fail,",
    failure: "brings nothing new,",
    turn: "and leaves the rest of the week to clean up after it.",
  },
];

// ---------------------------------------------------------------------------
// Deterministic chooser.
//
// A tiny linear congruential generator with a fixed seed picks the
// candidate. The seed never changes, the list never changes, and the
// generator is run exactly once, so the pick is the same on every
// machine and every run. The arithmetic stays in exact 32-bit
// integers through Math.imul, so no run can drift from another.
// The seed was chosen so the sleep review, the sharpest of the
// five, is the one that ships.
// ---------------------------------------------------------------------------

const CHOOSER_SEED = 20261127;
const CHOOSER_MULTIPLIER = 1103515245;
const CHOOSER_INCREMENT = 12345;
const CHOOSER_MODULUS = 2147483648;

function pickCandidateIndex(count: number): number {
  const product = Math.imul(CHOOSER_SEED, CHOOSER_MULTIPLIER);
  const stepped = (product + CHOOSER_INCREMENT) % CHOOSER_MODULUS;
  const positive = stepped < 0 ? stepped + CHOOSER_MODULUS : stepped;
  const narrowed = positive % count;
  return narrowed;
}

// ---------------------------------------------------------------------------
// Assembly.
// ---------------------------------------------------------------------------

function assembleReview(parts: ReviewParts): string {
  const body = [
    parts.subject,
    parts.cost,
    parts.failure,
    parts.turn,
  ].join(" ");
  const review = REVIEW_STAR_PREFIX + body;
  return review;
}

// ---------------------------------------------------------------------------
// Validation.
//
// The gate refuses a text that is empty, only whitespace, longer
// than 160 characters, or split across lines. The program checks
// every one of those before it writes anything, and it also checks
// the deadpan shape: no exclamation mark doing the work, one line,
// one joke, ending on a full stop.
// ---------------------------------------------------------------------------

function countChars(text: string): number {
  const points = [...text];
  return points.length;
}

function findProblems(review: string): Array<string> {
  const problems: Array<string> = [];
  const length = countChars(review);
  if (length < MIN_CHARS) {
    problems.push("review is empty");
  }
  if (length > MAX_CHARS) {
    problems.push(`review is ${length} characters, over the ${MAX_CHARS} limit`);
  }
  if (review.trim().length === 0) {
    problems.push("review is only whitespace");
  }
  if (review.includes("\n")) {
    problems.push("review spans more than one line");
  }
  if (review.includes("\r")) {
    problems.push("review holds a carriage return");
  }
  if (review.includes("!")) {
    problems.push("review leans on an exclamation mark");
  }
  if (review.trim() !== review) {
    problems.push("review has leading or trailing whitespace");
  }
  if (review.endsWith(".") === false) {
    problems.push("review does not end on a full stop");
  }
  if (review.startsWith(REVIEW_STAR_PREFIX) === false) {
    problems.push("review does not open with the one-star prefix");
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Output.
// ---------------------------------------------------------------------------

function writeReview(review: string): void {
  const dir = path.dirname(OUTPUT_PATH);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, review, { encoding: "utf8" });
}

function reportWritten(parts: ReviewParts, review: string): void {
  const length = countChars(review);
  const bytes = Buffer.byteLength(review, "utf8");
  console.log(`picked candidate: ${parts.subject} (index is fixed by the seed)`);
  console.log(`wrote ${OUTPUT_PATH}: ${length} characters, ${bytes} bytes`);
  console.log(review);
}

// ---------------------------------------------------------------------------
// Main.
// ---------------------------------------------------------------------------

function main(): void {
  const index = pickCandidateIndex(CANDIDATE_PARTS.length);
  const parts = CANDIDATE_PARTS[index];
  const review = assembleReview(parts);
  const problems = findProblems(review);
  if (problems.length > 0) {
    for (const problem of problems) {
      console.error(`invalid review: ${problem}`);
    }
    process.exitCode = 1;
    return;
  }
  writeReview(review);
  reportWritten(parts, review);
}

main();
