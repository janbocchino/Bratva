# Paper Directions

Working notes on turning huzzdaq into a publishable paper. Covers what the system
currently is, candidate theses, concrete experimental cases, training enhancements,
and the blockers.

---

## 1. What the system actually is

Stated precisely, because it constrains which papers are available.

A pure function `f(person) -> p ∈ (0,1)`:

| Stage | Where | Detail |
|-------|-------|--------|
| Text features | `backend/ml/price.py` | 5 fields (`name`, `occupation`, `citizenship`, `associations`, `news_headlines`) GTE-base embedded, 768 × 5 = 3840 dims, concatenated |
| Numeric features | `backend/ml/price.py` | `log1p(net_worth)`, `log1p(social_media_followers)`, `age`, RobustScaler |
| Model | `backend/ml/model.py` | Two-branch MLP (text branch, numeric branch) → concat → l2 → single logit |
| Squash | `nnx.sigmoid` | logit → `p ∈ (0,1)` |
| Price map | `scale_to_stock_price` | `price = (log1p(779_700_000_000) * 7.3) ** p ≈ 197.8 ** p` |
| Market | `domain/market.md` | CPMM `x·y=k`; model price authoritative while `closed`, AMM price once liquidity ≥ $100 |

Two structural consequences:

- **Everything downstream is a monotone transform of one scalar.** The model emits an
  ordinal power score; the price map is an arbitrary exponential. "The model prices
  people" is really "the model ranks people, and we exponentiate."
- **The market is the only component that can hold information the model lacks.**
  That asymmetry is the paper.

---

## 2. Candidate theses

### 2a. Recommended: future prominence + audit

> Forecast future prominence from public signals (technical contribution), then audit
> what the forecaster learned (ethical contribution).

Future power *is* credit scoring for social capital — same features, same proxies, same
failure modes, without the regulatory exposure of claiming deployment. The market serves
as both the elicitation mechanism and the evaluation harness.

Why this wins over the alternatives: it supplies ground truth (delayed but real), it
makes market resolution meaningful, and it gives the ethics section evidence rather than
hand-wringing.

### 2b. Market as preference elicitation

> There is no ground truth for what a person is "worth." A market is a mechanism for
> eliciting one — and for correcting a model that has no label to train against.

Reframes the project from "shitcoins of humans" into human-in-the-loop model correction.
The exponential price map and the crowd become load-bearing rather than embarrassing.
Weaker than 2a because the priced quantity never resolves, so "the market corrects the
model" is unfalsifiable.

### 2c. Pure algorithmic audit

> A deployed model assigns monetary value to named real people from citizenship,
> occupation, associations, and news coverage. What does it encode?

Cheapest to execute — inference is pure and side-effect-free, so thousands of
counterfactuals run today. Needs no users, no market, no new data. Highest acceptance
probability. Good fallback if the corpus problem (§6) can't be solved.

### 2d. Market design / oracle exploitation

Oracle-fed AMM where the oracle updates on a fixed scraper cadence. Purely about the
exploit surface. Already started in `research/monte_carlo/`.

---

## 3. The two new framings

### 3a. "Predicting who will get power in the future" — strong, adopt it

Fixes the deepest problem: **future power has ground truth, it is just delayed.** Take a
2015 snapshot, predict 2020 Forbes rank / net worth / follower count. Labels exist
retroactively, so backtesting needs no five-year wait.

It also legitimises the market. A market on a quantity that never resolves is a beauty
contest. A market on future prominence *resolves* — Brier scores, realized outcomes, and
a falsifiable answer to whether traders beat the model.

**Design implication:** this resurrects the `Resolved` state that `domain/market.md`
argued could be deleted. For a forecasting market, resolution is the whole point, and
"pool empty ⇒ Closed" is no longer sufficient. Revisit that section of the doc if this
framing is adopted.

Three risks that decide whether it works:

| Risk | Detail | Mitigation |
|------|--------|------------|
| **Persistence baseline** | Power is heavy-tailed and sticky. "Next year ≈ this year" beats most models. | Report AR(1) on log net worth as the headline baseline. If the model can't beat it, there is no result. |
| **Survivorship bias** | Forbes lists contain only people who already made it. Cannot learn who *rises* from a dataset of the already-risen. | Sample a cohort at t₀ regardless of outcome — needs a different source than current scrapers. |
| **No history** | `.last_run.json` starts 2026. | Wayback / Forbes archives / Wikipedia revision history. Assembling this corpus is most of the work. |

### 3b. "Creditability for insurance" — bad application, excellent motivation

**As something to build, this is the weakest direction available.** Three independent
failures:

1. **No outcome data.** No defaults, no claims. Nothing to train or validate against.
2. **Regulated.** EU AI Act Annex III treats creditworthiness assessment of natural
   persons and life/health insurance pricing as high-risk; GDPR Art. 22 covers automated
   decisions with legal effect. *(Verify current text before citing.)*
3. **The features are the prohibited proxies.** `citizenship`, `age`, `name`,
   `associations` are precisely the set these regimes exist to police. Scoring people by
   nationality is the textbook case.

**Inverted, it becomes the strongest framing in the project:**

> Person-scoring systems are already deployed in credit, insurance, and influencer
> pricing. We built one from purely scrapeable public signals in a few hundred lines,
> and here is what it encodes.

FAccT-shaped contribution. Case 3 below *is* this paper. The `citizenship` feature is not
a bug to fix — it is the finding. The insurance framing supplies "why should anyone
care," the audit supplies evidence, and no claim is ever made that the model should price
anyone's premium.

---

## 4. Experimental cases

### Case 1 — Is the model anything more than log net worth?

Rank-correlate `p` against `log1p(net_worth)` across the corpus. If Kendall τ > 0.9, the
3840 embedding dims are decoration and that must be reported.

Run this first: a bad answer invalidates everything else. Ablate each field group
(text-only, numeric-only, drop net worth) and report τ against held-out labels.

### Case 2 — Headline contamination

`assets/live/ZUCK.json` currently contains *"Bank of America sends tough message on HP
stock"* and *"Musk defends AI ambitions as IPO reveals trouble"*. The news retrieval has
a precision problem, and headlines are `", ".join(...)`-ed into one string, embedded, and
fed straight in.

Measure: label a few hundred scraped headlines on-/off-subject, then measure Δprice from
injecting off-subject headlines. Clean quantified result, and it motivates the attention
fix in §5.

### Case 3 — Demographic counterfactuals *(highest research value, hours of compute)*

Hold everything fixed, vary one field:

- citizenship (US → Nigeria → Russia → …)
- name (gender- and ethnicity-coded variants)
- occupation

Report Δprice distributions. Given `citizenship` and `associations` pass through a
general-purpose embedding model, something will surface. This is the core evidence for
thesis 2a and 2c, and it is the insurance-critique paper.

### Case 4 — Oracle latency arbitrage

Scraper cadences from `assets/live/scrape/config.py`:

| Scraper | Interval |
|---------|----------|
| `news` | 10 s |
| `scrapeForbes_v2` | 4 h |
| `followers_v2` | 16 h |
| `extended_associations_v2` | 24 h |
| `valuation_summary` | 10 min |

A trader reading Twitter directly knows a follower spike ~16 h before the oracle does.
Quantify the exploitable window per feature and the PnL of a trader front-running each
scraper. Slots directly into the existing Monte Carlo harness.

### Case 5 — Does the market beat the model? *(needs real users)*

Compare model price vs. AMM price against a later realized outcome (net worth at t+90d,
Forbes rank change). If the crowd's deviation from the model predicts the model's error,
the market is an error-correction layer — the payoff result for thesis 2a/2b.

If it doesn't: honest negative result about noise traders, still publishable, and the
Monte Carlo machinery already exists to characterize it.

### Case 6 — Price-map sensitivity

`197.8 ** p` means the derivative near p=1 is enormous — a 0.01 logit shift near the top
moves price by dollars, near the bottom by cents. Show that tail calibration error
dominates total price error. Justifies the training changes in §5.

---

## 5. Training enhancements, ranked by payoff

### 5a. `attention_dim` is declared but unused

`ModelConfig` in `backend/types_.py` declares `attention_dim`; nothing in
`backend/ml/model.py` uses it. The natural fix is exactly what the unused field implies:
encode each headline separately and attention-pool over them, instead of joining 10
headlines into one string that gets truncated at 512 tokens.

Currently: silent truncation + averaging into mush. Biggest single modeling win.
Case 2 is its evaluation.

### 5b. Train in price space, not logit space

Given the exponential map, optimize a loss on `log price` with an isotonic or Platt
calibration layer on top. Report ECE and price-space MAE, not just accuracy —
calibration matters more than ranking accuracy here (see Case 6).

### 5c. Make the ranking objective explicit

`contrastive_loss_margin`, `positive_margin_threshold`, and `mse_loss_weight` in
`ModelConfig` suggest a hand-rolled pairwise objective. A standard Bradley–Terry /
RankNet formulation gets a principled probabilistic score, comparable baselines, and a
literature to cite.

### 5d. Temporal features

Nothing in `InputData` is a derivative. Add:

- net-worth velocity
- follower velocity
- recency-decayed headline weight (currently a 48 h-old headline == a headline from now)

Cheap given snapshots are already persisted, and these are what make price move for a
legitimate reason rather than because the scraper found a different headline set.
**Required** for thesis 2a — forecasting without temporal features is not forecasting.

### 5e. Check for label leakage

If labels derive from Forbes rank and `net_worth` is an input feature, the model learns
the label directly. Ablate.

### 5f. Market-price distillation

Once trades exist, fine-tune on AMM prices as target. This is the loop that makes thesis
2b work — market as reward signal for a task with no ground truth.

---

## 6. Blockers

### Corpus size

Five assets (`DISO`, `ERST`, `FASL`, `JBCN`, `ZUCK`). Every case needs hundreds to
thousands of people; cases 3 and 5 need real users. **This is the critical path.**

### Training code is not in this repo

`backend/` contains inference only (`worker`, `ml/{model,loader,price}`, `persistence`,
`summary`) — no training script. The paper needs the training set described precisely:
source, size, label definition, pair construction. That has to exist before anything else
matters.

### Historical snapshots (for thesis 2a)

Scrapers start 2026. Backtesting future-prominence needs t₀ snapshots from external
archives. See §3a.

### Ethics section is mandatory, not optional

A deployed system that assigns dollar values to named real people, scrapes their news
coverage, and lets strangers speculate on them draws a desk reject without one. Handle
head-on:

- consent (there is none)
- public-figure scoping
- harm of the score existing independently of the market
- what the Case 3 counterfactual audit found

Done properly this is a strength: the paper audits a class of system that already exists
implicitly in credit, insurance, and influencer pricing, and makes it explicit enough to
measure.

---

## 7. Suggested order of work

1. **Case 1** — cheap, and a bad answer invalidates the rest.
2. **Case 3** — highest research value per hour, no new infrastructure, works on the
   current checkpoint.
3. **§5a attention fix** + **Case 2** as its evaluation.
4. Resolve the corpus blocker (§6) — gates everything below.
5. **§5d temporal features** + historical snapshots → thesis 2a becomes testable.
6. **Case 4** into the existing Monte Carlo harness.
7. **Case 5** once there are users and resolution exists.
