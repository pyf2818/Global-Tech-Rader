import { getPool, withTransaction } from '../../db/client.js';

function articleValues(article) {
  return [
    article.id,
    article.provider || '',
    article.upstreamId || '',
    article.title || '',
    article.titleEn || '',
    article.summary || '',
    article.url || '',
    article.source || '',
    article.sourceUrl || '',
    article.sourceTier || '',
    article.category || 'industry',
    article.categoryLabel || '',
    article.publishedAt || new Date().toISOString(),
    JSON.stringify(article.entities || []),
    JSON.stringify(article.tags || []),
    JSON.stringify({
      heatScore: article.heatScore || 0,
      impactScore: article.impactScore || 0,
      intelligenceScore: article.intelligenceScore || 0,
      scoreParts: article.scoreParts || {},
    }),
    JSON.stringify(article.evidence || {}),
    JSON.stringify(article),
  ];
}

function eventValues(event) {
  return [
    event.id,
    event.title || '',
    event.summary || '',
    event.category || 'industry',
    event.categoryLabel || '',
    event.primaryItemId || null,
    JSON.stringify(event.articleIds || []),
    JSON.stringify(event.entities || []),
    JSON.stringify(event.sources || []),
    event.independentSourceCount || 1,
    event.firstSeenAt || new Date().toISOString(),
    event.lastSeenAt || new Date().toISOString(),
    event.heatScore || 0,
    event.impactScore || 0,
    event.intelligenceScore || 0,
    event.confidence || 0,
    JSON.stringify(event.citations || []),
    JSON.stringify(event.reasons || []),
    JSON.stringify(event),
  ];
}

function mapArticle(row) {
  return {
    id: row.id,
    provider: row.provider,
    upstreamId: row.upstream_id,
    title: row.title,
    titleEn: row.title_en,
    summary: row.summary,
    url: row.url,
    source: row.source,
    sourceUrl: row.source_url,
    sourceTier: row.source_tier,
    category: row.category,
    categoryLabel: row.category_label,
    publishedAt: row.published_at?.toISOString?.() || row.published_at,
    entities: row.entities || [],
    tags: row.tags || [],
    evidence: row.evidence || {},
    ...(row.payload || {}),
  };
}

function mapEvent(row) {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    category: row.category,
    categoryLabel: row.category_label,
    primaryItemId: row.primary_article_id,
    articleIds: row.article_ids || [],
    entities: row.entities || [],
    sources: row.sources || [],
    independentSourceCount: row.independent_source_count,
    firstSeenAt: row.first_seen_at?.toISOString?.() || row.first_seen_at,
    lastSeenAt: row.last_seen_at?.toISOString?.() || row.last_seen_at,
    heatScore: Number(row.heat_score || 0),
    impactScore: Number(row.impact_score || 0),
    intelligenceScore: Number(row.intelligence_score || 0),
    confidence: Number(row.confidence || 0),
    citations: row.citations || [],
    reasons: row.reasons || [],
    ...(row.payload || {}),
  };
}

export function createIntelligenceRepository(db = getPool()) {
  return {
    async upsertArticlesAndEvents({ articles = [], events = [] } = {}) {
      return withTransaction(async client => {
        for (const article of articles) {
          await client.query(
            `insert into intelligence_articles (
              id, provider, upstream_id, title, title_en, summary, url, source, source_url, source_tier,
              category, category_label, published_at, entities, tags, scores, evidence, payload
            ) values (
              $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::jsonb,$16::jsonb,$17::jsonb,$18::jsonb
            )
            on conflict (id) do update set
              title = excluded.title,
              title_en = excluded.title_en,
              summary = excluded.summary,
              source = excluded.source,
              source_url = excluded.source_url,
              source_tier = excluded.source_tier,
              category = excluded.category,
              category_label = excluded.category_label,
              published_at = excluded.published_at,
              entities = excluded.entities,
              tags = excluded.tags,
              scores = excluded.scores,
              evidence = excluded.evidence,
              payload = excluded.payload,
              last_seen_at = now()`,
            articleValues(article),
          );
        }

        for (const event of events) {
          await client.query(
            `insert into intelligence_events (
              id, title, summary, category, category_label, primary_article_id, article_ids, entities, sources,
              independent_source_count, first_seen_at, last_seen_at, heat_score, impact_score, intelligence_score,
              confidence, citations, reasons, payload
            ) values (
              $1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18::jsonb,$19::jsonb
            )
            on conflict (id) do update set
              title = excluded.title,
              summary = excluded.summary,
              category = excluded.category,
              category_label = excluded.category_label,
              primary_article_id = excluded.primary_article_id,
              article_ids = excluded.article_ids,
              entities = excluded.entities,
              sources = excluded.sources,
              independent_source_count = excluded.independent_source_count,
              first_seen_at = least(intelligence_events.first_seen_at, excluded.first_seen_at),
              last_seen_at = greatest(intelligence_events.last_seen_at, excluded.last_seen_at),
              heat_score = excluded.heat_score,
              impact_score = excluded.impact_score,
              intelligence_score = excluded.intelligence_score,
              confidence = excluded.confidence,
              citations = excluded.citations,
              reasons = excluded.reasons,
              payload = excluded.payload,
              updated_at = now()`,
            eventValues(event),
          );
        }

        return { articles: articles.length, events: events.length };
      });
    },

    async listEvents({ limit = 30, category = '' } = {}) {
      const boundedLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 30));
      const params = [boundedLimit];
      let where = '';
      if (category) {
        params.push(category);
        where = 'where category = $2';
      }
      const result = await db.query(
        `select * from intelligence_events ${where}
         order by intelligence_score desc, last_seen_at desc
         limit $1`,
        params,
      );
      return result.rows.map(mapEvent);
    },

    async listArticles({ limit = 50 } = {}) {
      const boundedLimit = Math.min(200, Math.max(1, Number.parseInt(limit, 10) || 50));
      const result = await db.query('select * from intelligence_articles order by published_at desc limit $1', [boundedLimit]);
      return result.rows.map(mapArticle);
    },
  };
}
