# Automatic Evaluation Results

Generated: 2026-04-13T23:01:07.799Z

This automatic evaluation reruns extraction against saved posting baselines and scores saved postings against the current resume without requiring manual expectations in eval-config.json.

## Automatic Extraction Consistency

- Postings checked: 10
- Average scalar field accuracy: 95%
- Average required skill recall: 96%
- Average preferred skill recall: 80%

| Posting | Scalar Accuracy | Required Recall | Preferred Recall |
| --- | --- | --- | --- |
| 2026 Summer Intern - Software Engineering at Tonal | 100% | 100% | 100% |
| AI Development Programmer at DataAnnotation | 100% | 100% | 0% |
| Backend Engineer at Reddit | 100% | 100% | 100% |
| Embedded Controls Engineer at General Motors of Canada | 100% | 100% | 100% |
| Front-End Developer at BET99 | 100% | 100% | 100% |
| Frontend Engineer at / | 75% | 60% | 100% |
| Full Stack Engineer (Talent Pool) at /null | 100% | 100% | 0% |
| Software Developer at 7shifts | 100% | 100% | 100% |
| Software Developer 1 at Intuit | 100% | 100% | 100% |
| Software Developer, New Grad at IXL Learning | 75% | 100% | 100% |

## Automatic Fit Scoring Review

- Postings scored: 10
- Average fit score: 59.7%
- Average required-skill match: 33.47%

| Posting | Actual Score | Actual Band | Heuristic Score | Heuristic Band | Required Match |
| --- | --- | --- | --- | --- | --- |
| 2026 Summer Intern - Software Engineering at Tonal | 63% | good_fit | 40% | stretch | 2/5 |
| AI Development Programmer at DataAnnotation | 55% | good_fit | 48% | stretch | 6/12 |
| Backend Engineer at Reddit | 47% | stretch | 45% | stretch | 3/5 |
| Embedded Controls Engineer at General Motors of Canada | 37% | stretch | 11% | growth_target | 0/5 |
| Front-End Developer at BET99 | 47% | stretch | 39% | stretch | 4/8 |
| Frontend Engineer at / | 69% | good_fit | 18% | growth_target | 0/5 |
| Full Stack Engineer (Talent Pool) at /null | 61% | good_fit | 16% | growth_target | 1/12 |
| Software Developer at 7shifts | 76% | good_fit | 38% | stretch | 3/8 |
| Software Developer 1 at Intuit | 59% | good_fit | 27% | growth_target | 2/9 |
| Software Developer, New Grad at IXL Learning | 83% | strong_fit | 68% | good_fit | 2/3 |

## Representative Cases

- Strongest current match: Software Developer, New Grad at IXL Learning (83%, strong_fit)
- Middle-range match: Software Developer 1 at Intuit (59%, good_fit)
- Weakest current match: Embedded Controls Engineer at General Motors of Canada (37%, stretch)

## Automatic Observations

- This mode is dynamic because it discovers saved postings automatically and evaluates them against the current pipeline outputs.
- Extraction consistency here measures agreement with saved structured baselines, so it is useful for regression detection rather than human-ground-truth accuracy.
- The heuristic fit comparison is a lightweight calibration check based on skill overlap and entry-level adjustments.
- Run the manual config-driven evaluation as well when you want explicit human expectations and narrative failure analysis.
