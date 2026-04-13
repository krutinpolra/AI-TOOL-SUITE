import { z } from 'zod';

const NullableText = z.string().trim().min(1).nullable();
const StringList = z.array(z.string().trim().min(1)).default([]);

export const RemoteStatusSchema = z.enum(['remote', 'hybrid', 'onsite', 'flexible', 'not_listed']);
export const GapLevelSchema = z.enum(['quick_win', 'short_term', 'medium_term', 'long_term']);
export const RequirementStatusSchema = z.enum(['met', 'partial', 'gap']);
export const RequirementImportanceSchema = z.enum(['core', 'important', 'bonus']);
export const FitBandSchema = z.enum(['strong_fit', 'good_fit', 'stretch', 'growth_target']);

export const SourceMetadataSchema = z.object({
  sourcePath: z.string().min(1),
  sourceFileName: z.string().min(1),
  sourceSha256: z.string().min(1),
  extractedAt: z.string().min(1),
  parser: z.string().min(1),
  charCount: z.number().int().nonnegative(),
  pageCount: z.number().int().nullable(),
});

export const ResearchSourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().min(1),
  snippet: NullableText,
});

export const CompanyResearchSchema = z.object({
  status: z.enum(['completed', 'failed', 'skipped']),
  summary: NullableText,
  sizeAndStage: NullableText,
  industry: NullableText,
  recentDevelopments: z
    .array(
      z.object({
        headline: z.string().min(1),
        summary: z.string().min(1),
        url: z.string().min(1),
      })
    )
    .default([]),
  cultureSignals: StringList,
  applicationAngles: StringList,
  searchQueries: StringList,
  sources: z.array(ResearchSourceSchema).default([]),
  failureReason: NullableText,
});

export const JobPostingSchema = z.object({
  source: SourceMetadataSchema,
  jobTitle: z.string().trim().min(1),
  companyName: z.string().trim().min(1),
  location: NullableText,
  remoteStatus: RemoteStatusSchema,
  requiredSkills: StringList,
  preferredSkills: StringList,
  experienceLevel: z.object({
    minimumYears: z.number().nonnegative().nullable(),
    preferredYears: z.number().nonnegative().nullable(),
    seniority: NullableText,
    notes: NullableText,
  }),
  educationRequirements: z.object({
    required: NullableText,
    preferred: NullableText,
  }),
  salaryRange: z.object({
    minimum: z.number().nonnegative().nullable(),
    maximum: z.number().nonnegative().nullable(),
    currency: NullableText,
    interval: z.enum(['hour', 'month', 'year', 'not_listed']),
    rawText: NullableText,
  }),
  keyResponsibilities: StringList,
  keywordsAndDomainExpertise: StringList,
  applicationSignals: StringList,
  postingSummary: NullableText,
  extractionNotes: StringList,
  companyResearch: CompanyResearchSchema.nullable(),
});

export const SkillFrequencySchema = z.object({
  skill: z.string().min(1),
  count: z.number().int().positive(),
});

export const FrequencyItemSchema = z.object({
  label: z.string().min(1),
  count: z.number().int().nonnegative(),
});

export const MarketAggregateSchema = z.object({
  generatedAt: z.string().min(1),
  totalPostings: z.number().int().nonnegative(),
  postingFiles: z.array(z.string()).default([]),
  topRequiredSkills: z.array(SkillFrequencySchema).default([]),
  topPreferredSkills: z.array(SkillFrequencySchema).default([]),
  topKeywords: z.array(SkillFrequencySchema).default([]),
  remoteBreakdown: z.array(FrequencyItemSchema).default([]),
  seniorityBreakdown: z.array(FrequencyItemSchema).default([]),
  educationBreakdown: z.array(FrequencyItemSchema).default([]),
  experienceYears: z.object({
    sampleSize: z.number().int().nonnegative(),
    minimum: z.number().nonnegative().nullable(),
    maximum: z.number().nonnegative().nullable(),
    average: z.number().nonnegative().nullable(),
    median: z.number().nonnegative().nullable(),
  }),
  salarySnapshot: z.object({
    sampleSize: z.number().int().nonnegative(),
    minimumListed: z.number().nonnegative().nullable(),
    maximumListed: z.number().nonnegative().nullable(),
    averageMidpoint: z.number().nonnegative().nullable(),
  }),
  commonResponsibilities: z
    .array(
      z.object({
        responsibility: z.string().min(1),
        count: z.number().int().positive(),
      })
    )
    .default([]),
  researchHighlights: StringList,
});

export const MarketInsightsSchema = z.object({
  executiveSummary: z.string().min(1),
  notablePatterns: z
    .array(
      z.object({
        title: z.string().min(1),
        detail: z.string().min(1),
      })
    )
    .min(3)
    .max(6),
  candidateTakeaways: z.array(z.string().min(1)).min(3).max(6),
  riskSignals: z.array(z.string().min(1)).min(2).max(5),
});

export const MarketAnalysisSchema = z.object({
  aggregate: MarketAggregateSchema,
  insights: MarketInsightsSchema,
});

export const ResumeExperienceItemSchema = z.object({
  jobTitle: NullableText,
  company: NullableText,
  location: NullableText,
  startDate: NullableText,
  endDate: NullableText,
  durationMonths: z.number().int().nonnegative().nullable(),
  responsibilities: StringList,
  achievements: StringList,
  technologies: StringList,
});

export const ResumeEducationItemSchema = z.object({
  degree: NullableText,
  institution: NullableText,
  graduationDate: NullableText,
  relevantCoursework: StringList,
});

export const ResumeCertificationItemSchema = z.object({
  name: z.string().min(1),
  issuer: NullableText,
  dateEarned: NullableText,
  expiresOn: NullableText,
  details: NullableText,
});

export const ResumeProjectItemSchema = z.object({
  name: z.string().min(1),
  description: NullableText,
  technologies: StringList,
  outcomes: StringList,
});

export const ResumeSchema = z.object({
  source: SourceMetadataSchema,
  candidateName: NullableText,
  headline: NullableText,
  professionalSummary: NullableText,
  hardSkills: StringList,
  softSkills: StringList,
  workExperience: z.array(ResumeExperienceItemSchema).default([]),
  education: z.array(ResumeEducationItemSchema).default([]),
  certifications: z.array(ResumeCertificationItemSchema).default([]),
  projects: z.array(ResumeProjectItemSchema).default([]),
  accomplishments: StringList,
  keywordsAndDomainExpertise: StringList,
  portfolioLinks: StringList,
  extractionNotes: StringList,
});

export const GapInsightSchema = z.object({
  item: z.string().min(1),
  evidence: z.string().min(1),
  whyItMatters: z.string().min(1),
});

export const GapItemSchema = z.object({
  item: z.string().min(1),
  marketDemand: z.string().min(1),
  currentResumeSignal: z.string().min(1),
  gapLevel: GapLevelSchema,
  actionPlan: z.string().min(1),
  rationale: z.string().min(1),
});

export const UniqueValueSchema = z.object({
  item: z.string().min(1),
  evidence: z.string().min(1),
  positioningAdvice: z.string().min(1),
});

export const GapAnalysisSchema = z.object({
  generatedAt: z.string().min(1),
  strengths: z.array(GapInsightSchema).min(1),
  gaps: z.array(GapItemSchema).default([]),
  uniqueValue: z.array(UniqueValueSchema).default([]),
  resumeMessagingRecommendations: z.array(z.string().min(1)).default([]),
  overallReadinessSummary: z.string().min(1),
});

export const RequirementAssessmentSchema = z.object({
  requirement: z.string().min(1),
  category: z.enum([
    'required_skill',
    'preferred_skill',
    'responsibility',
    'experience',
    'education',
    'domain',
  ]),
  importance: RequirementImportanceSchema,
  status: RequirementStatusSchema,
  evidence: z.string().min(1),
  notes: z.string().min(1),
});

export const ResumeAdaptationSchema = z.object({
  targetSection: z.string().min(1),
  change: z.string().min(1),
  why: z.string().min(1),
});

export const ApplicationAnalysisSchema = z.object({
  overallSummary: z.string().min(1),
  encouragingPositioning: z.string().min(1),
  requirements: z.array(RequirementAssessmentSchema).min(4),
  resumeAdaptations: z.array(ResumeAdaptationSchema).min(4),
  coverLetterGuidance: z.array(z.string().min(1)).min(4),
  interviewPrep: z.object({
    likelyQuestions: z.array(z.string().min(1)).min(5),
    skillsToBrushUp: z.array(z.string().min(1)).min(3),
    companyResearchTopics: z.array(z.string().min(1)).min(3),
    talkingPoints: z.array(z.string().min(1)).min(4),
  }),
});

export const ApplicationReportSchema = z.object({
  generatedAt: z.string().min(1),
  postingSlug: z.string().min(1),
  fitScore: z.number().min(0).max(100),
  fitBand: FitBandSchema,
  scoreExplanation: z.string().min(1),
  analysis: ApplicationAnalysisSchema,
  scoringBreakdown: z.object({
    met: z.number().int().nonnegative(),
    partial: z.number().int().nonnegative(),
    gap: z.number().int().nonnegative(),
    weightedScore: z.number().min(0).max(100),
  }),
});

export const ManifestEntrySchema = z.object({
  sourcePath: z.string().min(1),
  sourceSha256: z.string().min(1),
  outputPath: z.string().min(1),
  processedAt: z.string().min(1),
});

export const JobManifestSchema = z.object({
  version: z.literal(1),
  entries: z.array(ManifestEntrySchema).default([]),
});

export const ProcessingFailureSchema = z.object({
  sourcePath: z.string().min(1),
  failedAt: z.string().min(1),
  stage: z.string().min(1),
  message: z.string().min(1),
});

export const ExpectedExtractionSchema = z.object({
  jobTitle: z.string().optional(),
  companyName: z.string().optional(),
  remoteStatus: RemoteStatusSchema.optional(),
  requiredSkills: z.array(z.string()).optional(),
  preferredSkills: z.array(z.string()).optional(),
  minimumYears: z.number().nullable().optional(),
  educationRequired: z.string().nullable().optional(),
});

export const EvaluationConfigSchema = z.object({
  extractionSpotChecks: z
    .array(
      z.object({
        postingPath: z.string().min(1),
        expected: ExpectedExtractionSchema,
      })
    )
    .default([]),
  scoringChecks: z
    .array(
      z.object({
        postingPath: z.string().min(1),
        expectedBand: FitBandSchema,
        notes: NullableText,
      })
    )
    .default([]),
  failureAnalysis: z
    .array(
      z.object({
        title: z.string().min(1),
        whatHappened: z.string().min(1),
        whyItHappened: z.string().min(1),
        proposedFix: z.string().min(1),
      })
    )
    .default([]),
  overallObservations: z.string().nullable().default(null),
});

export type JobPosting = z.infer<typeof JobPostingSchema>;
export type MarketAnalysis = z.infer<typeof MarketAnalysisSchema>;
export type ResumeData = z.infer<typeof ResumeSchema>;
export type GapAnalysis = z.infer<typeof GapAnalysisSchema>;
export type ApplicationReport = z.infer<typeof ApplicationReportSchema>;
export type JobManifest = z.infer<typeof JobManifestSchema>;
export type ProcessingFailure = z.infer<typeof ProcessingFailureSchema>;
export type EvaluationConfig = z.infer<typeof EvaluationConfigSchema>;
