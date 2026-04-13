import type {
  ApplicationReport,
  GapAnalysis,
  JobPosting,
  MarketAnalysis,
  ProcessingFailure,
  ResumeData,
} from './schemas.js';
import { summarizeGapLevels, topMarketSkillComparisons } from './analysis.js';

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
  lines.push('## Cover Letter Drafts');
  lines.push('');
  for (const draft of report.coverLetterDrafts) {
    lines.push(`### ${draft.variantLabel}`);
    lines.push('');
    lines.push(`- Tone: ${draft.tone}`);
    lines.push(`- Emphasis: ${draft.emphasis}`);
    lines.push('');
    lines.push(draft.draft);
    lines.push('');
  }
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

function reportHtmlShell(title: string, subtitle: string, body: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
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
        margin-bottom: 28px;
      }
      .meta {
        color: var(--muted);
        font-size: 14px;
      }
      .section {
        margin-top: 28px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 16px;
      }
      .card, .chart {
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
        background: rgba(47,109,159,0.12);
        color: var(--blue);
        margin-bottom: 10px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        text-align: left;
        padding: 10px 12px;
        border-bottom: 1px solid var(--line);
        vertical-align: top;
      }
      ul {
        margin: 0;
        padding-left: 20px;
      }
      pre.report-text {
        background: #fbfdff;
        border: 1px solid var(--line);
        border-radius: 20px;
        padding: 20px;
        white-space: pre-wrap;
        line-height: 1.6;
        overflow-wrap: anywhere;
      }
      .letter-body {
        line-height: 1.65;
      }
      @media (max-width: 860px) {
        .wrap {
          padding: 24px 14px 56px;
        }
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <section class="hero">
        <p class="meta">${escapeHtml(subtitle)}</p>
        <h1>${escapeHtml(title)}</h1>
      </section>
      ${body}
    </div>
  </body>
</html>`;
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

function simpleTableHtml(headers: string[], rows: string[][]): string {
  const head = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('');
  const body = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
    )
    .join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

export function renderMarketAnalysisHtml(
  market: MarketAnalysis,
  failures: ProcessingFailure[]
): string {
  const aggregate = market.aggregate;
  const topRequiredChart = barSvg(
    aggregate.topRequiredSkills.slice(0, 8).map((item) => ({
      label: item.skill,
      value: item.count,
      color: '#2f6d9f',
    }))
  );
  const remoteChart = barSvg(
    aggregate.remoteBreakdown.map((item) => ({
      label: item.label,
      value: item.count,
      color: '#1b9c85',
    })),
    520
  );

  const body = `
    <section class="grid">
      <div class="card"><div class="pill">Summary</div><h2>${aggregate.totalPostings}</h2><p>postings analyzed</p></div>
      <div class="card"><div class="pill">Experience</div><h2>${aggregate.experienceYears.median ?? 'n/a'}</h2><p>median years requested</p></div>
      <div class="card"><div class="pill">Salary</div><h2>${aggregate.salarySnapshot.averageMidpoint ?? 'n/a'}</h2><p>average midpoint</p></div>
    </section>

    <section class="section card">
      <h2>Executive Summary</h2>
      <p>${escapeHtml(market.insights.executiveSummary)}</p>
    </section>

    <section class="section grid">
      <div class="chart">
        <h2>Top Required Skills</h2>
        ${topRequiredChart}
      </div>
      <div class="chart">
        <h2>Remote Distribution</h2>
        ${remoteChart}
      </div>
    </section>

    <section class="section grid">
      <div class="card">
        <h2>Preferred Skills</h2>
        ${simpleTableHtml(
          ['Skill', 'Count'],
          aggregate.topPreferredSkills.map((item) => [item.skill, String(item.count)])
        )}
      </div>
      <div class="card">
        <h2>Education Breakdown</h2>
        ${simpleTableHtml(
          ['Requirement', 'Count'],
          aggregate.educationBreakdown.map((item) => [item.label, String(item.count)])
        )}
      </div>
    </section>

    <section class="section card">
      <h2>Patterns and Trends</h2>
      ${market.insights.notablePatterns
        .map(
          (pattern) => `
            <h3>${escapeHtml(pattern.title)}</h3>
            <p>${escapeHtml(pattern.detail)}</p>
          `
        )
        .join('')}
    </section>

    <section class="section grid">
      <div class="card">
        <h2>Candidate Takeaways</h2>
        <ul>${market.insights.candidateTakeaways
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join('')}</ul>
      </div>
      <div class="card">
        <h2>Risk Signals</h2>
        <ul>${market.insights.riskSignals
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join('')}</ul>
      </div>
      <div class="card">
        <h2>Company Research Highlights</h2>
        <ul>${aggregate.researchHighlights
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join('')}</ul>
      </div>
    </section>

    ${
      failures.length > 0
        ? `<section class="section card">
            <h2>Processing Failures</h2>
            ${simpleTableHtml(
              ['Source', 'Stage', 'Message'],
              failures.slice(-10).map((failure) => [
                failure.sourcePath,
                failure.stage,
                failure.message,
              ])
            )}
          </section>`
        : ''
    }
  `;

  return reportHtmlShell(
    'Job Market Analysis',
    `Generated ${aggregate.generatedAt}`,
    body
  );
}

export function renderGapAnalysisHtml(gapAnalysis: GapAnalysis): string {
  const gapLevelChart = barSvg(
    summarizeGapLevels(gapAnalysis).map((item) => ({
      label: item.label,
      value: item.count,
      color:
        item.label === 'quick_win'
          ? '#1b9c85'
          : item.label === 'short_term'
            ? '#2f6d9f'
            : item.label === 'medium_term'
              ? '#e0a526'
              : '#d65c4f',
    })),
    520
  );

  const body = `
    <section class="grid">
      <div class="card"><div class="pill">Readiness</div><p>${escapeHtml(
        gapAnalysis.overallReadinessSummary
      )}</p></div>
      <div class="chart"><h2>Gap Levels</h2>${gapLevelChart}</div>
    </section>

    <section class="section grid">
      <div class="card">
        <h2>Strengths</h2>
        ${gapAnalysis.strengths
          .map(
            (strength) => `
              <h3>${escapeHtml(strength.item)}</h3>
              <p><strong>Evidence:</strong> ${escapeHtml(strength.evidence)}</p>
              <p>${escapeHtml(strength.whyItMatters)}</p>
            `
          )
          .join('')}
      </div>
      <div class="card">
        <h2>Unique Value</h2>
        ${gapAnalysis.uniqueValue
          .map(
            (item) => `
              <h3>${escapeHtml(item.item)}</h3>
              <p><strong>Evidence:</strong> ${escapeHtml(item.evidence)}</p>
              <p>${escapeHtml(item.positioningAdvice)}</p>
            `
          )
          .join('')}
      </div>
    </section>

    <section class="section card">
      <h2>Triaged Gaps</h2>
      ${gapAnalysis.gaps
        .map(
          (gap) => `
            <div class="card" style="margin-bottom: 14px;">
              <div class="pill">${escapeHtml(gap.gapLevel)}</div>
              <h3>${escapeHtml(gap.item)}</h3>
              <p><strong>Market demand:</strong> ${escapeHtml(gap.marketDemand)}</p>
              <p><strong>Current resume signal:</strong> ${escapeHtml(gap.currentResumeSignal)}</p>
              <p><strong>Action plan:</strong> ${escapeHtml(gap.actionPlan)}</p>
              <p>${escapeHtml(gap.rationale)}</p>
            </div>
          `
        )
        .join('')}
    </section>

    <section class="section card">
      <h2>Resume Messaging Recommendations</h2>
      <ul>${gapAnalysis.resumeMessagingRecommendations
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join('')}</ul>
    </section>
  `;

  return reportHtmlShell(
    'Resume Gap Analysis',
    `Generated ${gapAnalysis.generatedAt}`,
    body
  );
}

export function renderEvaluationHtml(markdownReport: string): string {
  return reportHtmlShell(
    'Evaluation Results',
    'Styled HTML companion to the evaluation markdown report',
    `<section class="card"><pre class="report-text">${escapeHtml(markdownReport)}</pre></section>`
  );
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
  const coverLetterDraftCards = report.coverLetterDrafts
    .map(
      (draft) => `
        <div class="card">
          <div class="pill neutral">${escapeHtml(draft.variantLabel)}</div>
          <h3>${escapeHtml(draft.tone)}</h3>
          <p><strong>Emphasis:</strong> ${escapeHtml(draft.emphasis)}</p>
          <p class="letter-body">${escapeHtml(draft.draft).replace(/\n/g, '<br>')}</p>
        </div>
      `
    )
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

  return reportHtmlShell(
    'Application Advisor Report',
    `Generated ${report.generatedAt}`,
    `
      <section class="hero" style="display:grid;grid-template-columns:1.3fr 0.7fr;gap:20px;">
        <div>
          <p class="meta">${escapeHtml(posting.jobTitle)} at ${escapeHtml(posting.companyName)}</p>
          <h1>${escapeHtml(posting.jobTitle)} at ${escapeHtml(posting.companyName)}</h1>
          <p>${escapeHtml(report.analysis.overallSummary)}</p>
          <p><strong>Encouraging take:</strong> ${escapeHtml(report.analysis.encouragingPositioning)}</p>
        </div>
        <div class="card">
          <div style="font-size:72px;line-height:1;font-weight:700;">${report.fitScore}%</div>
          <div class="pill">${escapeHtml(report.fitBand)}</div>
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

      <section class="section">
        <h2>Cover Letter Drafts</h2>
        <div class="grid">
          ${coverLetterDraftCards}
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
    `
  );
}
