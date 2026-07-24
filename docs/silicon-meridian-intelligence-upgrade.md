# Silicon Meridian Intelligence Upgrade

## Objective

Silicon Meridian should evolve from a news aggregator into an AI industry intelligence layer. The product goal is not to show more links. The goal is to turn fragmented updates into fewer, higher-signal events that can support homepage reading, daily reports, investment analysis, and Agent workflows.

## Product Position

The upgraded module should be named **AI Intelligence**, not simply News.

It should cover:

- News
- Papers
- Models
- Companies
- Funding
- GitHub projects
- Researchers
- Products
- Jobs and adoption signals

The long-term product direction is an AI industry Bloomberg: event tracking, company profiles, market impact, opportunities, risks, and Agent-readable structured context.

## Current Project Fit

The repository already has the right foundation:

- `server/news/` fetches and normalizes feed-based news.
- `src/domain/intelligence/recommendationEngine.js` already calculates freshness, source quality, corroboration, personal score, and event clusters.
- `src/domain/intelligence/briefingEngine.js` already builds algorithmic daily briefing payloads.
- `server/profile/` and `src/utils/profileModel.js` already model user interests, source tiers, and special follows.
- `src/utils/workflowEngine.js` can consume structured intelligence context for Agent workflows.

The upgrade should extend these layers instead of creating a separate product silo.

## Target Architecture

```txt
External Sources
  AI HOT / RSS / arXiv / GitHub / official blogs / financial media
        |
        v
server/intelligence/collectors
  fetch, normalize, source metadata, evidence preservation
        |
        v
server/intelligence/processors
  dedupe -> event clustering -> entity extraction -> scoring -> briefing
        |
        v
Postgres Intelligence Tables
  sources / articles / events / entities / scores / relations
        |
        v
domain/intelligence
  recommendation, briefing, profile matching, Agent context
        |
        v
Frontend + Agent API
  Intelligence feed / AI Daily / investment signals / company graph / Agent answers
```

## Source Strategy

### Tier S: Official and Primary Sources

- OpenAI Blog
- Anthropic News
- Google DeepMind
- Google AI Blog
- Meta AI
- Microsoft AI
- NVIDIA Blog
- GitHub Blog

### Tier A: High Authority Media and Research

- MIT Technology Review
- The Verge
- TechCrunch
- Reuters
- Bloomberg
- Nature / Science / arXiv
- Stanford HAI / Berkeley BAIR / MIT CSAIL

### Tier B: Community and Trend Signals

- Hacker News
- GitHub Trending AI
- HuggingFace
- Product Hunt
- selected X/Twitter accounts

### Aggregator Source

- AI HOT selected items
- AI HOT daily reports

AI HOT should be treated as a high-quality upstream intelligence source, not as the only source of truth. The default integration path should use selected items. Daily reports should be used only for daily-report features.

Important AI HOT implementation notes:

- Public API does not require an API key.
- `/api/public/items` should be called with a browser-like User-Agent.
- Default mode should be selected.
- `mode=all` should be reserved for explicit full-pool use cases.
- `daily` should be reserved for actual daily-report workflows.

## Proposed Backend Modules

```txt
server/intelligence/
  collectors/
    aihotCollector.js
    rssCollector.js
    arxivCollector.js
    githubCollector.js
    officialBlogCollector.js

  processors/
    normalizeItem.js
    dedupe.js
    eventCluster.js
    entityExtract.js
    impactScore.js
    briefingComposer.js

  repositories/
    intelligenceRepository.js
    eventRepository.js
    entityRepository.js

  services/
    intelligenceService.js
    dailyIntelligenceService.js
    agentIntelligenceService.js
```

## API Surface

```txt
GET /api/intelligence/items
GET /api/intelligence/events
GET /api/intelligence/daily
GET /api/intelligence/entities/:id
GET /api/intelligence/agent/context
```

Initial v1 can expose only:

```txt
GET /api/intelligence/items
GET /api/intelligence/agent/context
```

## Event Fusion

Event fusion is the key product upgrade.

### Level 1: Hard Deduplication

- Same canonical URL
- Same upstream item ID
- Highly similar title from the same source
- Reposted feed item with tracking-only URL differences

### Level 2: Event Clustering

Signals:

- Title token similarity
- Entity overlap: company, model, product, paper, person
- Same or related category
- Time window, initially 48 hours
- Source diversity

### Level 3: Representative Selection

Representative article priority:

1. Official source
2. Primary source
3. Higher source weight
4. More complete summary
5. Newer published time

Suggested event shape:

```js
{
  id,
  title,
  summary,
  category,
  primaryArticleId,
  articleIds,
  entities,
  independentSourceCount,
  firstSeenAt,
  lastSeenAt,
  heatScore,
  impactScore,
  personalScore,
  confidence,
  citations
}
```

## Scoring System

### Heat Score

Measures current public attention:

```txt
sourceWeight * 25
+ independentSourceCount * 15
+ freshnessDecay * 25
+ socialOrCommunitySignal * 15
+ officialSourceBonus * 20
```

### Impact Score

Measures industry importance:

```txt
companyWeight * 20
+ technologyBreakthrough * 25
+ capitalMarketImpact * 15
+ developerAdoption * 15
+ enterpriseAdoption * 15
+ regulatoryRisk * 10
```

### Personal Score

Measures fit for a user:

```txt
domainTierMatch * 25
+ sourceTierMatch * 15
+ specialFollowMatch * 25
+ readingBehaviorMatch * 20
+ novelty * 10
- negativeFeedbackPenalty
```

### Ranking Defaults

Anonymous:

```txt
60% Impact + 30% Heat + 10% Freshness
```

Logged in:

```txt
40% Impact + 25% Heat + 35% Personal
```

## Database Direction

Add these tables in a later migration after the first API slice is stable:

```sql
intelligence_sources
intelligence_articles
intelligence_events
intelligence_event_articles
intelligence_entities
intelligence_event_entities
intelligence_scores
intelligence_relations
```

Postgres JSONB plus indexes is enough for v1. A graph database should not be introduced until entity and relation workloads prove the need.

## Push Logic

### Homepage Feed

Use high Impact, high Heat, and fresh events. Show event cards, not duplicate article lists.

### AI Daily Intelligence

Daily structured report:

- Top events
- Why it matters
- Investment or business impact
- Technical signal
- Risk
- Citations

### Investment Opportunities

Filter for:

- High impact
- Company or funding signals
- Enterprise adoption
- Developer ecosystem growth
- Market structure changes

### Agent Context

Return structured JSON for Agents:

- events
- scores
- citations
- entities
- suggested questions
- briefing-ready summary

The Agent interface should avoid UI prose and keep citations traceable.

## Rollout Plan

### Phase 1: Vertical Slice

- Add AI HOT collector.
- Normalize AI HOT items into Silicon Meridian intelligence item shape.
- Add lightweight heat and impact scoring.
- Add in-memory cache.
- Add `/api/intelligence/items`.
- Add `/api/intelligence/agent/context`.

### Phase 2: Event Layer

- Add event clustering service.
- Persist articles and events.
- Build AI Daily Intelligence from event objects.
- Add frontend Intelligence Feed mode.

### Phase 3: Company and Opportunity Layer

- Extract entities.
- Build company profiles.
- Track models, products, papers, funding, and GitHub projects.
- Add opportunity and risk analysis.

### Phase 4: Personal Intelligence

- Combine profile tiers, source tiers, behavior, and special follows.
- Add personalized daily report.
- Add proactive push and weekly sector analysis.

## First Implementation Principle

Build a small working loop first:

```txt
AI HOT API
  -> normalize
  -> score
  -> cache
  -> /api/intelligence/items
  -> /api/intelligence/agent/context
```

After this loop works, extend it with event clustering and persistence.
