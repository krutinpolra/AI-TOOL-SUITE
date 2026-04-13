# Evaluation Results

Generated: 2026-04-13T23:20:05.123Z

## Extraction Spot-Check

### ../project-data/backend/job-01.pdf

| Field | Result |
| --- | --- |
| jobTitle | match |
| companyName | match |
| remoteStatus | match |
| requiredSkills | match |
| preferredSkills | match |
| minimumYears | match |
| educationRequired | not specified |

### ../project-data/backend/job-05.pdf

| Field | Result |
| --- | --- |
| jobTitle | match |
| companyName | match |
| remoteStatus | match |
| requiredSkills | match |
| preferredSkills | match |
| minimumYears | match |
| educationRequired | not specified |

### ../project-data/backend/job-10.pdf

| Field | Result |
| --- | --- |
| jobTitle | match |
| companyName | match |
| remoteStatus | match |
| requiredSkills | match |
| preferredSkills | match |
| minimumYears | match |
| educationRequired | not specified |

## Scoring Check

### ../project-data/backend/job-01.pdf

- Expected band: strong_fit
- Actual band: good_fit
- Actual score: 65%
- Agreement: no
- Manual note: New-grad software role with strong overlap in Java, JavaScript, React, Git, and general web/software fundamentals.

### ../project-data/backend/job-07.pdf

- Expected band: good_fit
- Actual band: good_fit
- Actual score: 50%
- Agreement: yes
- Manual note: General software-development role with cloud, SQL, teamwork, and SDLC signals that mostly line up with the resume.

### ../project-data/backend/job-08.pdf

- Expected band: stretch
- Actual band: stretch
- Actual score: 40%
- Agreement: yes
- Manual note: Some language overlap exists through Python, Java, and C++, but the Reddit role asks for 3+ years plus backend/ads/distributed-systems depth.

## Failure Analysis

### Company research sometimes stores weak or incomplete source URLs

- What happened: Some company-research outputs contain placeholder-style links like '/' or short internal-looking paths instead of fully useful external URLs.
- Why it happened: The research-summary step relies on the LLM to restructure Tavily results, so weak source formatting can slip through when the model paraphrases or compresses search evidence.
- Proposed fix: Preserve Tavily URLs directly from tool output, validate that saved source URLs are absolute, and reject or flag any source that does not start with http or https.

### Resume adaptation can drift toward unsupported keyword stuffing

- What happened: The advisor sometimes suggests adding missing job keywords such as Redux or Webpack even when the resume does not show evidence of that experience.
- Why it happened: The advisor prompt prioritizes ATS alignment, but it does not sharply separate 'reframe existing evidence' from 'do not add unsupported skills.'
- Proposed fix: Tighten the prompt so every resume suggestion must explicitly cite existing resume evidence, and split recommendations into 'reorder/reframe' versus 'future learning goals.'

### Fit scoring still depends heavily on extracted keyword overlap

- What happened: A role can score lower than it should when the resume has adjacent experience but the exact posting terminology is different.
- Why it happened: The scoring model uses structured requirement items derived from extraction, so synonym gaps and imperfect normalization still affect the final fit band.
- Proposed fix: Add a stronger normalization layer for skills and frameworks, plus a second-pass semantic match check that groups related terms like React/React.js or REST/RESTful APIs.

## Overall Observations

The system is strongest at producing organized structured outputs and practical applicant-facing reports from raw postings and a resume. It is also encouraging in a useful way, which helps avoid talking the candidate out of applying too early. The main weaknesses are occasional over-inference in resume tailoring, imperfect company-research source formatting, and scoring sensitivity to exact wording rather than deeper semantic equivalence.
