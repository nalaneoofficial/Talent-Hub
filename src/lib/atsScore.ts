// Rule-based ATS score MVP. Pure function — no external calls.
// Designed so AI scoring can replace it later behind the same interface.

export type AtsBreakdown = {
  score: number;            // 0-100 overall
  keyword_score: number;    // 0-100
  structure_score: number;  // 0-100
  readability_score: number;// 0-100
  formatting_score: number; // 0-100
  feedback: string[];       // human-readable bullet points
};

const SECTION_HEADERS = [
  "experience", "work experience", "employment", "education",
  "skills", "summary", "profile", "objective", "certifications",
  "projects", "references", "achievements",
];

const STRONG_VERBS = [
  "led", "managed", "built", "designed", "developed", "implemented",
  "delivered", "improved", "increased", "reduced", "launched",
  "created", "achieved", "optimized", "coordinated", "negotiated",
];

export const scoreCv = (
  cvText: string,
  targetKeywords: string[] = [],
): AtsBreakdown => {
  const text = (cvText ?? "").toLowerCase();
  const feedback: string[] = [];

  // --- Structure: section headings present ---
  const found = SECTION_HEADERS.filter((h) => text.includes(h));
  const structure_score = Math.min(100, Math.round((found.length / 5) * 100));
  if (structure_score < 60) feedback.push("Add clear section headings like Experience, Education, and Skills.");

  // --- Keywords: overlap with target role ---
  let keyword_score = 60; // neutral when no target supplied
  if (targetKeywords.length > 0) {
    const hits = targetKeywords.filter((k) => k && text.includes(k.toLowerCase().trim())).length;
    keyword_score = Math.round((hits / targetKeywords.length) * 100);
    if (keyword_score < 50) feedback.push("Mirror more keywords from your target job description.");
  }

  // --- Readability: word count + average word length ---
  const words = text.split(/\s+/).filter(Boolean);
  const wc = words.length;
  let readability_score = 100;
  if (wc < 200) { readability_score -= 40; feedback.push("Your CV is short — aim for 350-700 words."); }
  else if (wc > 1200) { readability_score -= 20; feedback.push("Your CV is long — keep it under 2 pages."); }
  const avgLen = wc ? words.reduce((a, w) => a + w.length, 0) / wc : 0;
  if (avgLen > 7) { readability_score -= 15; feedback.push("Use shorter, simpler words where possible."); }
  const verbHits = STRONG_VERBS.filter((v) => text.includes(v)).length;
  if (verbHits < 4) { readability_score -= 15; feedback.push("Use stronger action verbs (led, built, delivered, improved)."); }
  readability_score = Math.max(0, Math.min(100, readability_score));

  // --- Formatting: simple = ATS-friendly. Penalise pipe-heavy/symbol-heavy text. ---
  let formatting_score = 100;
  const symbolRatio = ((text.match(/[│|▪▶◆◉■●★]/g) ?? []).length) / Math.max(1, wc);
  if (symbolRatio > 0.02) { formatting_score -= 25; feedback.push("Avoid decorative symbols/columns — ATS systems can't parse them."); }
  if (text.length > 0 && text.replace(/[^a-z0-9 ]/g, "").length / text.length < 0.7) {
    formatting_score -= 15;
    feedback.push("Reduce special characters and stick to standard punctuation.");
  }
  formatting_score = Math.max(0, Math.min(100, formatting_score));

  // --- Weighted total: 35% keyword, 25% structure, 20% readability, 20% formatting ---
  const score = Math.round(
    keyword_score * 0.35 +
    structure_score * 0.25 +
    readability_score * 0.20 +
    formatting_score * 0.20,
  );

  if (feedback.length === 0) feedback.push("Strong CV — you're ready to apply!");

  return { score, keyword_score, structure_score, readability_score, formatting_score, feedback };
};
