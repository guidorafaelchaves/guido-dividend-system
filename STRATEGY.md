# Dividend System - Strategic Product Roadmap

This document keeps the system from becoming only "more screens". The goal is a disciplined cockpit for opportunity, evidence, memory and follow-up.

## North star

The system should answer five questions better than a spreadsheet:

1. What is real in my portfolio?
2. What event or asset deserves attention now?
3. What is the expected payoff, after price, tax, recurrence and risk?
4. What decision did I make, and why?
5. After time passed, was the decision good?

## Data hierarchy

1. B3 movement files are the source of truth for what happened.
2. Public event calendars are leads, not truth.
3. Brapi and public market data enrich price, liquidity, history and indicators.
4. OpenAI should explain, compare and audit. It should not invent accounting facts.
5. Google Sheets and Docs preserve memory beyond the browser.

## Core scoring model

Every opportunity should be decomposed into independent dimensions. A single score is useful only if the components remain visible.

Recommended dimensions:

- Event yield: provento / current price.
- Time yield: event yield annualized by days until ex-date or payment, capped to avoid absurd short-term distortions.
- Recurrence quality: how repeatable the income source is.
- Data confidence: source, freshness, date plausibility, ticker match, suspicious gaps.
- Portfolio fit: concentration, sector exposure, current position, cash need.
- Total return: price change plus income, not income alone.
- Liquidity and execution: spread, volume, practical ability to enter/exit.
- Tax friction: IR, asset class, sale threshold and loss compensation.
- Drawdown risk: recent volatility, event-driven drop, extraordinary provento risk.

Formula direction:

```text
opportunity_score =
  event_merit
  + recurrence_quality
  + timing_quality
  + data_confidence
  + portfolio_fit
  + total_return_context
  - concentration_penalty
  - liquidity_penalty
  - tax_penalty
  - anomaly_penalty
```

## Memory model

Sheets should hold structured state:

- Assets
- Operations
- Dividends
- Snapshots
- Decisions
- Radar events
- Logs

Docs should hold narrative memory:

- Investment thesis
- Decision notes
- Review notes
- AI dossiers
- Monthly portfolio letters

The system should never only say "buy" or "sell". It should say:

- evidence used
- confidence
- what would falsify the thesis
- review date
- result after review

## Better user workflows

### Daily

1. Open dashboard.
2. See new events, stale data and actions due.
3. Sync only priority tickers.
4. Register decisions and notes to memory.

### Weekly

1. Import B3 movement file.
2. Reconcile expected vs received income.
3. Review concentration and dead capital.
4. Save a strategic note.

### Monthly

1. Generate portfolio snapshot.
2. Compare expected income vs actual income.
3. Review decisions made in the last 30-90 days.
4. Ask AI for narrative audit using only structured facts.

## Product improvements by priority

### Now

- Native Memory API panel in the app.
- Sync current assets to Google Sheets.
- Save strategic notes to Google Docs.
- Make GitHub Pages the canonical deploy target.

### Next

- Add "Decision Review" queue: decisions with `revisar_em <= today`.
- Add monthly snapshot button.
- Add event lifecycle view: detected, ex-date, paid, reconciled, post-event return.
- Add confidence badges to every public-data-derived field.

### Later

- Split the single HTML into modules.
- Add a small backend proxy for API keys and rate limits.
- Add portfolio simulation and cash allocation planning.
- Add tax lots and formal IR reports.
- Add decision quality analytics: hit rate, false positives, opportunity cost.

## Non-negotiable principles

- Do not hide uncertainty.
- Do not treat public event data as confirmed cash.
- Do not optimize only for dividend yield.
- Always track total return.
- Always preserve the reason behind a decision.
- Keep user data portable through backup and Google memory.

