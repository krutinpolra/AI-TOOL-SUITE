import type {
  ApplicationReport,
  GapAnalysis,
  JobPosting,
  MarketAnalysis,
  ProcessingFailure,
  ResumeData,
} from './schemas.js';
import { topMarketSkillComparisons } from './analysis.js';

function renderBulletList(items: string[]): string {
  if (items.length === 0) {
    return '- None\n';
  }

  return items.map((item) => `- ${item}`).join('\n') + '\n';
}

function renderTable(rows: string[][]): string {
  if (rows.length === 0) {
    return '';
  }

  const [header, ...body] = rows;
  const divider = header.map(() => '---');
  return [header, divider, ...body].map((row) => `| ${row.join(' | ')} |`).join('\n') + '\n';
}

export function renderMarketAnalysisMarkdown(
  market: MarketAnalysis,
  failures: ProcessingFailure[]
): string {
  const aggregate = market.aggregate;
  const lines: string[] = [];

  lines.push('# Job Market Analysis');
  lines.push('');
  lines.push(`Generated: ${aggregate.generatedAt}`);
  lines.push('');
  lines.push('## Executive Summary');
  lines.push('');
  lines.push(market.insights.executiveSummary);
  lines.push('');
  lines.push('## Snapshot');
  lines.push('');
  lines.push(`- Total postings analyzed: ${aggregate.totalPostings}`);
  lines.push(`- Salary samples found: ${aggregate.salarySnapshot.sampleSize}`);
  lines.push(`- Experience samples found: ${aggregate.experienceYears.sampleSize}`);
  lines.push('');
  lines.push('## Most Common Required Skills');
  lines.push('');
  lines.push(
    renderTable([
      ['Skill', 'Count'],
      ...aggregate.topRequiredSkills.map((item) => [item.skill, String(item.count)]),
    ])
  );
  lines.push('## Most Common Preferred Skills');
  lines.push('');
  lines.push(
    renderTable([
      ['Skill', 'Count'],
      ...aggregate.topPreferredSkills.map((item) => [item.skill, String(item.count)]),
    ])
  );
  lines.push('## Typical Experience and Education');
  lines.push('');
  lines.push(
    `- Minimum years requested: ${
      aggregate.experienceYears.minimum !== null ? aggregate.experienceYears.minimum : 'not enough data'
    }`
  );
  lines.push(
    `- Median years requested: ${
      aggregate.experienceYears.median !== null ? aggregate.experienceYears.median : 'not enough data'
    }`
  );
  lines.push(
    `- Highest years requested: ${
      aggregate.experienceYears.maximum !== null ? aggregate.experienceYears.maximum : 'not enough data'
    }`
  );
  lines.push('');
  lines.push(
    renderTable([
      ['Education Requirement', 'Count'],
      ...aggregate.educationBreakdown.map((item) => [item.label, String(item.count)]),
    ])
  );
  lines.push('## Salary Signals');
  lines.push('');
  lines.push(
    `- Lowest listed salary: ${
      aggregate.salarySnapshot.minimumListed !== null ? aggregate.salarySnapshot.minimumListed : 'not listed'
    }`
  );
  lines.push(
    `- Highest listed salary: ${
      aggregate.salarySnapshot.maximumListed !== null ? aggregate.salarySnapshot.maximumListed : 'not listed'
    }`
  );
  lines.push(
    `- Average salary midpoint: ${
      aggregate.salarySnapshot.averageMidpoint !== null
        ? aggregate.salarySnapshot.averageMidpoint
        : 'not enough data'
    }`
  );
  lines.push('');
  lines.push('## Patterns and Trends');
  lines.push('');
  for (const pattern of market.insights.notablePatterns) {
    lines.push(`### ${pattern.title}`);
    lines.push('');
    lines.push(pattern.detail);
    lines.push('');
  }
  lines.push('## Candidate Takeaways');
  lines.push('');
  lines.push(renderBulletList(market.insights.candidateTakeaways));
  lines.push('## Risk Signals');
  lines.push('');
  lines.push(renderBulletList(market.insights.riskSignals));
  lines.push('## Company Research Highlights');
  lines.push('');
  lines.push(renderBulletList(aggregate.researchHighlights));

  if (failures.length > 0) {
    lines.push('## Processing Failures');
    lines.push('');
    lines.push(
      renderTable([
        ['Source', 'Stage', 'Message'],
        ...failures.slice(-10).map((failure) => [
          failure.sourcePath,
          failure.stage,
          failure.message.replace(/\|/g, '/'),
        ]),
      ])
    );
  }

  return lines.join('\n').trim() + '\n';
}

export function renderGapAnalysisMarkdown(gapAnalysis: GapAnalysis): string {
  const lines: string[] = [];
  lines.push('# Resume Gap Analysis');
  lines.push('');
  lines.push(`Generated: ${gapAnalysis.generatedAt}`);
  lines.push('');
  lines.push('## Overall Readiness');
  lines.push('');
  lines.push(gapAnalysis.overallReadinessSummary);
  lines.push('');
  lines.push('## Strengths');
  lines.push('');
  for (const strength of gapAnalysis.strengths) {
    lines.push(`### ${strength.item}`);
    lines.push('');
    lines.push(`- Evidence: ${strength.evidence}`);
    lines.push(`- Why it matters: ${strength.whyItMatters}`);
    lines.push('');
  }
  lines.push('## Gaps');
  lines.push('');
  for (const gap of gapAnalysis.gaps) {
    lines.push(`### ${gap.item}`);
    lines.push('');
    lines.push(`- Level: ${gap.gapLevel}`);
    lines.push(`- Market demand: ${gap.marketDemand}`);
    lines.push(`- Current resume signal: ${gap.currentResumeSignal}`);
    lines.push(`- Action plan: ${gap.actionPlan}`);
    lines.push(`- Rationale: ${gap.rationale}`);
    lines.push('');
  }
  lines.push('## Unique Value');
  lines.push('');
  for (const item of gapAnalysis.uniqueValue) {
    lines.push(`### ${item.item}`);
    lines.push('');
    lines.push(`- Evidence: ${item.evidence}`);
    lines.push(`- Positioning advice: ${item.positioningAdvice}`);
    lines.push('');
  }
  lines.push('## Resume Messaging Recommendations');
  lines.push('');
  lines.push(renderBulletList(gapAnalysis.resumeMessagingRecommendations));
  return lines.join('\n').trim() + '\n';
}

export function renderApplicationMarkdown(report: ApplicationReport, posting: JobPosting): string {
  const lines: string[] = [];
  lines.push(`# Application Advisor Report: ${posting.jobTitle} at ${posting.companyName}`);
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push('## Fit Assessment');
  lines.push('');
  lines.push(`- Fit score: ${report.fitScore}%`);
  lines.push(`- Recommendation band: ${report.fitBand}`);
  lines.push(`- Guidance: ${report.scoreExplanation}`);
  lines.push('');
  lines.push(report.analysis.overallSummary);
  lines.push('');
  lines.push(
    renderTable([
      ['Requirement', 'Importance', 'Status', 'Evidence'],
      ...report.analysis.requirements.map((item) => [
        item.requirement,
        item.importance,
        item.status,
        item.evidence.replace(/\|/g, '/'),
      ]),
    ])
  );
  lines.push('## Resume Adaptation');
  lines.push('');
  for (const item of report.analysis.resumeAdaptations) {
    lines.push(`### ${item.targetSection}`);
    lines.push('');
    lines.push(`- Change: ${item.change}`);
    lines.push(`- Why: ${item.why}`);
    lines.push('');
  }
  lines.push('## Cover Letter Guidance');
  lines.push('');
  lines.push(renderBulletList(report.analysis.coverLetterGuidance));
  lines.push('## Interview Prep');
  lines.push('');
  lines.push('### Likely Questions');
  lines.push('');
  lines.push(renderBulletList(report.analysis.interviewPrep.likelyQuestions));
  lines.push('### Skills To Brush Up');
  lines.push('');
  lines.push(renderBulletList(report.analysis.interviewPrep.skillsToBrushUp));
  lines.push('### Company Research Topics');
  lines.push('');
  lines.push(renderBulletList(report.analysis.interviewPrep.companyResearchTopics));
  lines.push('### Talking Points');
  lines.push('');
  lines.push(renderBulletList(report.analysis.interviewPrep.talkingPoints));
  return lines.join('\n').trim() + '\n';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function barSvg(
  items: Array<{ label: string; value: number; color: string; suffix?: string }>,
  width = 560,
  rowHeight = 36
): string {
  const maxValue = Math.max(1, ...items.map((item) => item.value));
  const height = items.length * rowHeight + 24;
  const left = 160;
  const usableWidth = width - left - 24;

  const rows = items
    .map((item, index) => {
      const y = 26 + index * rowHeight;
      const barWidth = Math.max(4, Math.round((item.value / maxValue) * usableWidth));
      return `
        <text x="12" y="${y + 14}" font-size="13" fill="#213547">${escapeHtml(item.label)}</text>
        <rect x="${left}" y="${y}" width="${usableWidth}" height="16" rx="8" fill="#dbe7ef"></rect>
        <rect x="${left}" y="${y}" width="${barWidth}" height="16" rx="8" fill="${item.color}"></rect>
        <text x="${left + usableWidth + 8}" y="${y + 13}" font-size="12" fill="#456">${item.value}${item.suffix ?? ''}</text>
      `;
    })
    .join('');

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img">${rows}</svg>`;
}

export function renderApplicationHtml(
  report: ApplicationReport,
  posting: JobPosting,
  market: MarketAnalysis,
  resume: ResumeData
): string {
  const statusCounts = [
    {
      label: 'Met',
      value: report.scoringBreakdown.met,
      color: '#1b9c85',
    },
    {
      label: 'Partial',
      value: report.scoringBreakdown.partial,
      color: '#e0a526',
    },
    {
      label: 'Gap',
      value: report.scoringBreakdown.gap,
      color: '#d65c4f',
    },
  ];

  const marketComparison = topMarketSkillComparisons(market, resume).map((item) => ({
    label: item.skill,
    value: item.demandCount,
    color: item.onResume ? '#1b9c85' : '#597b96',
    suffix: item.onResume ? ' on resume' : ' missing',
  }));

  const requirementCards = report.analysis.requirements
    .map(
      (item) => `
        <div class="card requirement ${item.status}">
          <div class="pill ${item.status}">${escapeHtml(item.status)}</div>
          <h3>${escapeHtml(item.requirement)}</h3>
          <p><strong>Importance:</strong> ${escapeHtml(item.importance)}</p>
          <p><strong>Evidence:</strong> ${escapeHtml(item.evidence)}</p>
          <p>${escapeHtml(item.notes)}</p>
        </div>
      `
    )
    .join('');

  const adaptationCards = report.analysis.resumeAdaptations
    .map(
      (item) => `
        <div class="card">
          <h3>${escapeHtml(item.targetSection)}</h3>
          <p><strong>Change:</strong> ${escapeHtml(item.change)}</p>
          <p><strong>Why:</strong> ${escapeHtml(item.why)}</p>
        </div>
      `
    )
    .join('');

  const coverLetterItems = report.analysis.coverLetterGuidance
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('');
  const likelyQuestions = report.analysis.interviewPrep.likelyQuestions
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('');
  const brushUpItems = report.analysis.interviewPrep.skillsToBrushUp
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('');
  const researchItems = report.analysis.interviewPrep.companyResearchTopics
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('');
  const talkingPoints = report.analysis.interviewPrep.talkingPoints
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Application Advisor Report</title>
    <style>
      :root {
        --paper: #f8f4ed;
        --ink: #173042;
        --muted: #597b96;
        --panel: #ffffff;
        --line: #d8e2e9;
        --green: #1b9c85;
        --amber: #e0a526;
        --red: #d65c4f;
        --blue: #2f6d9f;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Segoe UI", "Aptos", sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(47,109,159,0.18), transparent 28%),
          radial-gradient(circle at top right, rgba(27,156,133,0.16), transparent 22%),
          linear-gradient(180deg, #fbfaf6, var(--paper));
      }
      .wrap {
        max-width: 1180px;
        margin: 0 auto;
        padding: 32px 18px 64px;
      }
      .hero {
        background: linear-gradient(145deg, rgba(255,255,255,0.96), rgba(236,244,248,0.96));
        border: 1px solid var(--line);
        border-radius: 28px;
        padding: 28px;
        display: grid;
        grid-template-columns: 1.3fr 0.7fr;
        gap: 20px;
      }
      .score {
        border-radius: 24px;
        padding: 18px;
        background: linear-gradient(180deg, #fdf8ef, #fff);
        border: 1px solid var(--line);
      }
      .score-number {
        font-size: 72px;
        line-height: 1;
        font-weight: 700;
      }
      .score-band {
        display: inline-block;
        margin-top: 12px;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(47,109,159,0.1);
        color: var(--blue);
        font-weight: 600;
      }
      .section {
        margin-top: 28px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 16px;
      }
      .card {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 20px;
        padding: 18px;
      }
      .pill {
        display: inline-block;
        border-radius: 999px;
        padding: 5px 10px;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 10px;
      }
      .pill.met { background: rgba(27,156,133,0.12); color: var(--green); }
      .pill.partial { background: rgba(224,165,38,0.12); color: #8c6900; }
      .pill.gap { background: rgba(214,92,79,0.12); color: var(--red); }
      .requirement.met { border-left: 6px solid var(--green); }
      .requirement.partial { border-left: 6px solid var(--amber); }
      .requirement.gap { border-left: 6px solid var(--red); }
      h1, h2, h3 { margin-top: 0; }
      ul { padding-left: 20px; margin-bottom: 0; }
      .chart {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 20px;
        padding: 16px;
      }
      .meta {
        color: var(--muted);
        font-size: 14px;
      }
      @media (max-width: 860px) {
        .hero {
          grid-template-columns: 1fr;
        }
        .score-number {
          font-size: 56px;
        }
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <section class="hero">
        <div>
          <p class="meta">Generated ${escapeHtml(report.generatedAt)}</p>
          <h1>${escapeHtml(posting.jobTitle)} at ${escapeHtml(posting.companyName)}</h1>
          <p>${escapeHtml(report.analysis.overallSummary)}</p>
          <p><strong>Encouraging take:</strong> ${escapeHtml(report.analysis.encouragingPositioning)}</p>
        </div>
        <div class="score">
          <div class="score-number">${report.fitScore}%</div>
          <div class="score-band">${escapeHtml(report.fitBand)}</div>
          <p>${escapeHtml(report.scoreExplanation)}</p>
        </div>
      </section>

      <section class="section grid">
        <div class="chart">
          <h2>Fit Breakdown</h2>
          ${barSvg(statusCounts)}
        </div>
        <div class="chart">
          <h2>Market Skill Alignment</h2>
          ${barSvg(marketComparison)}
        </div>
      </section>

      <section class="section">
        <h2>Requirement Assessment</h2>
        <div class="grid">
          ${requirementCards}
        </div>
      </section>

      <section class="section">
        <h2>Resume Adaptation</h2>
        <div class="grid">
          ${adaptationCards}
        </div>
      </section>

      <section class="section grid">
        <div class="card">
          <h2>Cover Letter Guidance</h2>
          <ul>${coverLetterItems}</ul>
        </div>
        <div class="card">
          <h2>Likely Interview Questions</h2>
          <ul>${likelyQuestions}</ul>
        </div>
      </section>

      <section class="section grid">
        <div class="card">
          <h2>Skills To Brush Up</h2>
          <ul>${brushUpItems}</ul>
        </div>
        <div class="card">
          <h2>Company Research Topics</h2>
          <ul>${researchItems}</ul>
        </div>
        <div class="card">
          <h2>Talking Points</h2>
          <ul>${talkingPoints}</ul>
        </div>
      </section>
    </div>
  </body>
</html>`;
}
