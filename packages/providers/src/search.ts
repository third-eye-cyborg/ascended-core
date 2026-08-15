/**
 * Search index port plus an in-memory token-matching adapter.
 */

import {
  nowIso,
  HealthState,
  type EntityId,
  type HealthCheckable,
  type HealthReport,
  type Metadata,
} from "@ascended/core";

/** A document to be indexed and made searchable. */
export interface SearchDocument {
  /** Opaque document identifier. */
  id: EntityId;
  /** Free text the document is matched against. */
  text: string;
  /** Redaction-safe extension point (facets, tags). */
  metadata?: Metadata;
}

/** A single search hit with a relevance score. */
export interface SearchHit {
  id: EntityId;
  /** Relevance score; higher is more relevant. */
  score: number;
  metadata?: Metadata;
}

/** Search index port. */
export interface SearchIndexPort {
  /** Add or replace a document in the index. */
  index(doc: SearchDocument): Promise<void>;
  /** Remove a document by id. No-op when absent. */
  remove(id: EntityId): Promise<void>;
  /** Query the index; returns hits ordered by descending score. */
  query(q: string): Promise<SearchHit[]>;
}

interface IndexedDocument {
  doc: SearchDocument;
  tokens: Set<string>;
}

/**
 * In-memory search index using simple whitespace token matching. Scoring is
 * the count of distinct query tokens present in the document. For tests and
 * examples only — not a production search engine.
 */
export class InMemorySearchIndex implements SearchIndexPort, HealthCheckable {
  private readonly docs = new Map<EntityId, IndexedDocument>();

  async index(doc: SearchDocument): Promise<void> {
    this.docs.set(doc.id, { doc, tokens: tokenize(doc.text) });
  }

  async remove(id: EntityId): Promise<void> {
    this.docs.delete(id);
  }

  async query(q: string): Promise<SearchHit[]> {
    const queryTokens = tokenize(q);
    if (queryTokens.size === 0) return [];

    const hits: SearchHit[] = [];
    for (const entry of this.docs.values()) {
      let score = 0;
      for (const token of queryTokens) {
        if (entry.tokens.has(token)) score += 1;
      }
      if (score > 0) {
        const hit: SearchHit = { id: entry.doc.id, score };
        if (entry.doc.metadata !== undefined) hit.metadata = entry.doc.metadata;
        hits.push(hit);
      }
    }
    hits.sort((a, b) => b.score - a.score);
    return hits;
  }

  async checkHealth(): Promise<HealthReport> {
    return {
      state: HealthState.HEALTHY,
      checkedAt: nowIso(),
      details: { documents: this.docs.size },
    };
  }
}

function tokenize(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter((t) => t.length > 0);
  return new Set(tokens);
}
