import type { GapAnalysis, JobPosting, MarketAnalysis, ResumeData } from './schemas.js';
import { clipText, formatJsonForPrompt } from './runtime.js';

const DOCUMENT_LIMIT = 18000;

export function jobExtractionSystemPrompt(): string {
  return `You extract structured data from job postings for a job-search assistant.

Rules:
- Use only the provided posting text.
- Never invent missing details. Use null or empty arrays when information is not listed.
- Normalize skills and technologies into concise phrases.
- Keep responsibilities as action-oriented bullet-sized statements.
- Salary should be numeric only when explicitly listed.
- Remote status must be one of: remote, hybrid, onsite, flexible, not_listed.`;
}

export function buildJobExtractionUserPrompt(documentText: string, fileName: string): string {
  return `Extract this job posting into the schema.

File name: ${fileName}

Posting text:
${clipText(documentText, DOCUMENT_LIMIT)}`;
}

export function resumeExtractionSystemPrompt(): string {
  return `You extract resume data for ATS-style analysis.

Rules:
- Use only the provided resume text.
- Never fabricate employers, degrees, dates, skills, or achievements.
- Use null or empty arrays for missing information.
- Hard skills should be technical skills and tools.
- Soft skills should be communication, leadership, teamwork, problem solving, and similar signals.
- Capture projects, accomplishments, and domain keywords even if they are outside formal work experience.`;
}

export function buildResumeExtractionUserPrompt(documentText: string, fileName: string): string {
  return `Extract this resume into the schema.

File name: ${fileName}

Resume text:
${clipText(documentText, DOCUMENT_LIMIT)}`;
}

export function companyResearchSystemPrompt(): string {
  return `You are researching an employer for a job applicant.

Use the web_search tool when you need current external context.

Research goals:
- Identify company size/stage and industry
- Find recent developments relevant to candidates
- Look for culture signals from engineering blogs, hiring pages, reviews, interviews, or public posts
- Surface application angles a candidate could mention

Rules:
- Prefer concise search queries.
- Cite only what is actually supported by tool results.
- If information is weak or unavailable, say so clearly.
- Stop after enough evidence is gathered and return a concise research summary.`;
}

export function buildCompanyResearchUserPrompt(posting: JobPosting): string {
  return `Research this company and role context.

Company: ${posting.companyName}
Job title: ${posting.jobTitle}
Location: ${posting.location ?? 'not listed'}
Remote status: ${posting.remoteStatus}
Required skills: ${posting.requiredSkills.join(', ') || 'none listed'}
Preferred skills: ${posting.preferredSkills.join(', ') || 'none listed'}
Posting summary: ${posting.postingSummary ?? 'not listed'}`;
}

export function companyResearchStructuringPrompt(
  posting: JobPosting,
  researchNotes: string,
  searchQueries: string[]
): string {
  return `Turn these research notes into the company research schema.

Company: ${posting.companyName}
Job title: ${posting.jobTitle}
Queries used: ${searchQueries.join(' | ') || 'none'}

Research notes:
${researchNotes}`;
}

export function marketInsightsSystemPrompt(): string {
  return `You are analyzing a collection of job postings to identify real hiring-market patterns.

Rules:
- Base every observation on the provided aggregate data and posting snapshots.
- Focus on patterns useful for a real job seeker.
- Avoid generic advice like "network more" unless tied to the data.
- Be explicit when salary or education data is sparse.`;
}

export function buildMarketInsightsUserPrompt(
  aggregate: MarketAnalysis['aggregate'],
  postings: JobPosting[]
): string {
  const postingSnapshots = postings.map((posting) => ({
    companyName: posting.companyName,
    jobTitle: posting.jobTitle,
    remoteStatus: posting.remoteStatus,
    requiredSkills: posting.requiredSkills.slice(0, 8),
    preferredSkills: posting.preferredSkills.slice(0, 6),
    seniority: posting.experienceLevel.seniority,
    companyResearch: posting.companyResearch
      ? {
          industry: posting.companyResearch.industry,
          summary: posting.companyResearch.summary,
        }
      : null,
  }));

  return `Create market insights from this aggregate job-market data.

Aggregate:
${formatJsonForPrompt(aggregate)}

Posting snapshots:
${formatJsonForPrompt(postingSnapshots)}`;
}

export function gapAnalysisSystemPrompt(): string {
  return `You are a practical resume advisor.

Your job:
- Compare the resume against the market analysis.
- Identify strengths, gaps, and unique value.
- Triage each gap realistically.

Triage rules:
- quick_win: wording, ordering, framing, keyword alignment
- short_term: days to weeks
- medium_term: weeks to months
- long_term: major investment or years of experience

Rules:
- Be specific and actionable.
- Do not tell the candidate to fabricate experience.
- Use encouraging but honest language.`;
}

export function buildGapAnalysisUserPrompt(
  resume: ResumeData,
  marketAnalysis: MarketAnalysis
): string {
  return `Analyze this resume against the market.

Resume:
${formatJsonForPrompt(resume)}

Market analysis:
${formatJsonForPrompt(marketAnalysis)}`;
}

export function applicationAnalysisSystemPrompt(): string {
  return `You are an application advisor helping a candidate decide how to apply to a specific role.

Rules:
- Evaluate requirements against only the provided resume and market context.
- Mark status as:
  - met: clear evidence exists
  - partial: some adjacent evidence exists
  - gap: evidence is missing or weak
- Importance must be:
  - core: central to the role
  - important: meaningful, but not the whole role
  - bonus: nice-to-have or stretch
- Your tone should encourage applying when the role is plausible.
- Resume adaptation suggestions must be concrete and factual.
- Cover letter and interview guidance must be role-specific, not generic.`;
}

export function buildApplicationAnalysisUserPrompt(
  posting: JobPosting,
  resume: ResumeData,
  marketAnalysis: MarketAnalysis,
  gapAnalysis: GapAnalysis
): string {
  return `Create an application analysis for this candidate.

New posting:
${formatJsonForPrompt(posting)}

Resume:
${formatJsonForPrompt(resume)}

Market analysis:
${formatJsonForPrompt(marketAnalysis)}

Gap analysis:
${formatJsonForPrompt(gapAnalysis)}`;
}

export function coverLetterDraftsSystemPrompt(): string {
  return `You write tailored cover letters for a specific candidate and job posting.

Rules:
- Generate at least 2 distinct variants.
- Each draft must sound like a real person, not a template.
- Use only the provided posting, resume, market context, and application analysis.
- Do not fabricate experience, certifications, employers, or outcomes.
- The first variant should be polished and balanced.
- The second variant should be more direct and product or impact focused.
- Each draft should be a complete cover letter, not bullet points.
- Keep each draft concise enough for a real application, roughly 250 to 400 words.`;
}

export function buildCoverLetterDraftsUserPrompt(
  posting: JobPosting,
  resume: ResumeData,
  marketAnalysis: MarketAnalysis,
  gapAnalysis: GapAnalysis,
  applicationAnalysis: {
    overallSummary: string;
    encouragingPositioning: string;
    requirements: unknown;
    resumeAdaptations: unknown;
    coverLetterGuidance: string[];
    interviewPrep: unknown;
  }
): string {
  return `Write cover letter drafts for this candidate.

Target posting:
${formatJsonForPrompt(posting)}

Resume:
${formatJsonForPrompt(resume)}

Market analysis:
${formatJsonForPrompt(marketAnalysis)}

Gap analysis:
${formatJsonForPrompt(gapAnalysis)}

Application analysis:
${formatJsonForPrompt(applicationAnalysis)}`;
}
