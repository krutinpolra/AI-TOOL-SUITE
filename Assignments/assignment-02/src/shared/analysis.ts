import type { GapAnalysis, JobPosting, MarketAnalysis, ResumeData } from './schemas.js';

const TERM_ALIASES: Record<string, string> = {
  aws: 'aws',
  'amazon web services': 'aws',
  azure: 'azure',
  gcp: 'gcp',
  'google cloud platform': 'gcp',
  'node js': 'node.js',
  nodejs: 'node.js',
  'node.js': 'node.js',
  js: 'javascript',
  javascript: 'javascript',
  ts: 'typescript',
  typescript: 'typescript',
  postgres: 'postgresql',
  postgresql: 'postgresql',
  'ci cd': 'ci/cd',
  cicd: 'ci/cd',
  'ci/cd': 'ci/cd',
  reactjs: 'react',
  react: 'react',
  'next js': 'next.js',
  nextjs: 'next.js',
  'next.js': 'next.js',
  kubernetes: 'kubernetes',
  docker: 'docker',
  agile: 'agile',
  microservices: 'microservices',
  'rest api': 'rest api',
};

type FrequencyItem = {
  label: string;
  count: number;
};

function normalizeWhitespace(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9+#./]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function canonicalizeTerm(value: string): string {
  const normalized = normalizeWhitespace(value);
  return TERM_ALIASES[normalized] || normalized;
}

export function titleCaseFromCanonical(value: string): string {
  if (value === 'aws') return 'AWS';
  if (value === 'gcp') return 'GCP';
  if (value === 'ci/cd') return 'CI/CD';

  return value
    .split(' ')
    .map((part) => (part ? part[0]!.toUpperCase() + part.slice(1) : part))
    .join(' ');
}

function buildSkillFrequencyList(values: string[], limit: number): Array<{ skill: string; count: number }> {
  const counts = new Map<string, { count: number; label: string }>();

  for (const value of values) {
    const canonical = canonicalizeTerm(value);
    if (!canonical) {
      continue;
    }

    const existing = counts.get(canonical);
    if (existing) {
      existing.count += 1;
      continue;
    }

    counts.set(canonical, { count: 1, label: titleCaseFromCanonical(canonical) });
  }

  return [...counts.values()]
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, limit)
    .map((item) => ({ skill: item.label, count: item.count }));
}

function buildLabelFrequencyList(values: string[], limit: number): FrequencyItem[] {
  const counts = new Map<string, number>();

  for (const value of values) {
    const label = value.trim();
    if (!label) {
      continue;
    }

    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, limit);
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Number((((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2).toFixed(2));
  }

  return sorted[middle] ?? null;
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const value of values) {
    const key = canonicalizeTerm(value);
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(value);
  }

  return deduped;
}

export function computeMarketAggregate(postings: JobPosting[]): MarketAnalysis['aggregate'] {
  const experienceYears = postings
    .map((posting) => posting.experienceLevel.minimumYears)
    .filter((value): value is number => value !== null);

  const salaryMidpoints = postings
    .map((posting) => {
      const minimum = posting.salaryRange.minimum;
      const maximum = posting.salaryRange.maximum;
      if (minimum === null || maximum === null) {
        return null;
      }

      return (minimum + maximum) / 2;
    })
    .filter((value): value is number => value !== null);

  const salaryMinimums = postings
    .map((posting) => posting.salaryRange.minimum)
    .filter((value): value is number => value !== null);
  const salaryMaximums = postings
    .map((posting) => posting.salaryRange.maximum)
    .filter((value): value is number => value !== null);

  const researchHighlights = dedupe(
    postings.flatMap((posting) => posting.companyResearch?.applicationAngles ?? [])
  ).slice(0, 8);

  return {
    generatedAt: new Date().toISOString(),
    totalPostings: postings.length,
    postingFiles: postings.map((posting) => posting.source.sourceFileName),
    topRequiredSkills: buildSkillFrequencyList(postings.flatMap((posting) => posting.requiredSkills), 12),
    topPreferredSkills: buildSkillFrequencyList(postings.flatMap((posting) => posting.preferredSkills), 12),
    topKeywords: buildSkillFrequencyList(
      postings.flatMap((posting) => posting.keywordsAndDomainExpertise),
      12
    ),
    remoteBreakdown: buildLabelFrequencyList(postings.map((posting) => posting.remoteStatus), 10),
    seniorityBreakdown: buildLabelFrequencyList(
      postings.map((posting) => posting.experienceLevel.seniority ?? 'not listed'),
      10
    ),
    educationBreakdown: buildLabelFrequencyList(
      postings.map((posting) => posting.educationRequirements.required ?? 'not listed'),
      10
    ),
    experienceYears: {
      sampleSize: experienceYears.length,
      minimum: experienceYears.length ? Math.min(...experienceYears) : null,
      maximum: experienceYears.length ? Math.max(...experienceYears) : null,
      average: average(experienceYears),
      median: median(experienceYears),
    },
    salarySnapshot: {
      sampleSize: salaryMidpoints.length,
      minimumListed: salaryMinimums.length ? Math.min(...salaryMinimums) : null,
      maximumListed: salaryMaximums.length ? Math.max(...salaryMaximums) : null,
      averageMidpoint: average(salaryMidpoints),
    },
    commonResponsibilities: buildLabelFrequencyList(
      postings.flatMap((posting) => posting.keyResponsibilities),
      10
    ).map((item) => ({
      responsibility: item.label,
      count: item.count,
    })),
    researchHighlights,
  };
}

function buildResumeEvidenceIndex(resume: ResumeData): Set<string> {
  const values = [
    ...resume.hardSkills,
    ...resume.softSkills,
    ...resume.keywordsAndDomainExpertise,
    ...resume.projects.flatMap((project) => project.technologies),
    ...resume.workExperience.flatMap((item) => item.technologies),
    ...resume.certifications.map((item) => item.name),
    ...resume.education.flatMap((item) => item.relevantCoursework),
  ];

  return new Set(values.map((value) => canonicalizeTerm(value)));
}

export function computePostingVsResumeSkillOverlap(
  posting: JobPosting,
  resume: ResumeData
): {
  matchedRequiredSkills: string[];
  missingRequiredSkills: string[];
  matchedPreferredSkills: string[];
  missingPreferredSkills: string[];
} {
  const resumeEvidence = buildResumeEvidenceIndex(resume);
  const matchedRequiredSkills = posting.requiredSkills.filter((skill) =>
    resumeEvidence.has(canonicalizeTerm(skill))
  );
  const missingRequiredSkills = posting.requiredSkills.filter(
    (skill) => !resumeEvidence.has(canonicalizeTerm(skill))
  );
  const matchedPreferredSkills = posting.preferredSkills.filter((skill) =>
    resumeEvidence.has(canonicalizeTerm(skill))
  );
  const missingPreferredSkills = posting.preferredSkills.filter(
    (skill) => !resumeEvidence.has(canonicalizeTerm(skill))
  );

  return {
    matchedRequiredSkills,
    missingRequiredSkills,
    matchedPreferredSkills,
    missingPreferredSkills,
  };
}

export function computeFitScore(report: {
  analysis: {
    requirements: Array<{
      importance: 'core' | 'important' | 'bonus';
      status: 'met' | 'partial' | 'gap';
    }>;
  };
}): {
  fitScore: number;
  fitBand: 'strong_fit' | 'good_fit' | 'stretch' | 'growth_target';
  explanation: string;
  breakdown: {
    met: number;
    partial: number;
    gap: number;
    weightedScore: number;
  };
} {
  let scoreEarned = 0;
  let scorePossible = 0;
  let met = 0;
  let partial = 0;
  let gap = 0;

  for (const requirement of report.analysis.requirements) {
    const weight =
      requirement.importance === 'core' ? 12 : requirement.importance === 'important' ? 8 : 4;
    const statusScore =
      requirement.status === 'met' ? 1 : requirement.status === 'partial' ? 0.5 : 0;

    scorePossible += weight;
    scoreEarned += weight * statusScore;

    if (requirement.status === 'met') met += 1;
    if (requirement.status === 'partial') partial += 1;
    if (requirement.status === 'gap') gap += 1;
  }

  const weightedScore = scorePossible === 0 ? 0 : Math.round((scoreEarned / scorePossible) * 100);
  const fitBand =
    weightedScore >= 80
      ? 'strong_fit'
      : weightedScore >= 50
        ? 'good_fit'
        : weightedScore >= 30
          ? 'stretch'
          : 'growth_target';

  const explanation =
    fitBand === 'strong_fit'
      ? 'Strong fit, you should definitely apply.'
      : fitBand === 'good_fit'
        ? 'Good fit, you meet the core requirements and should apply with a targeted story.'
        : fitBand === 'stretch'
          ? 'Stretch role, still worth applying if the work excites you and you position your strengths clearly.'
          : 'Growth target today, but still useful as a roadmap for what to build next.';

  return {
    fitScore: weightedScore,
    fitBand,
    explanation,
    breakdown: {
      met,
      partial,
      gap,
      weightedScore,
    },
  };
}

export function topMarketSkillComparisons(
  market: MarketAnalysis,
  resume: ResumeData,
  limit = 8
): Array<{
  skill: string;
  demandCount: number;
  onResume: boolean;
}> {
  const resumeEvidence = buildResumeEvidenceIndex(resume);
  return market.aggregate.topRequiredSkills.slice(0, limit).map((item) => ({
    skill: item.skill,
    demandCount: item.count,
    onResume: resumeEvidence.has(canonicalizeTerm(item.skill)),
  }));
}

export function summarizeGapLevels(gapAnalysis: GapAnalysis): FrequencyItem[] {
  return buildLabelFrequencyList(gapAnalysis.gaps.map((gap) => gap.gapLevel), 10);
}
