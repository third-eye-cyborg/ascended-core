/**
 * Search bounded context: search queries/results with cursor pagination and
 * recommendation request/response shapes.
 */

import { isEntityId, type EntityId, type Metadata } from "@ascended/core";
import { isRecord } from "./internal/guards";

/** A search request. */
export interface SearchQuery {
  /** Raw query text. */
  text: string;
  /** Optional filters as generic key/value pairs. */
  filters?: Record<string, unknown>;
  /** Max results to return in a page. */
  limit?: number;
  /** Opaque forward-cursor from a prior {@link SearchResultSet}. */
  cursor?: string;
  metadata?: Metadata;
}

/** A single search hit referencing a domain entity. */
export interface SearchResult {
  id: EntityId;
  /** Type of the referenced entity (e.g. "post", "community"). */
  entityType: string;
  /** Relevance score; higher is more relevant. */
  score: number;
  metadata?: Metadata;
}

/** A page of search results with a forward cursor. */
export interface SearchResultSet {
  results: SearchResult[];
  /** Opaque cursor for the next page, absent when exhausted. */
  nextCursor?: string;
  /** Total matches when the backend can provide it. */
  total?: number;
  metadata?: Metadata;
}

/** A request for personalized recommendations. */
export interface RecommendationRequest {
  accountId: EntityId;
  /** Recommendation surface/context (e.g. "home-feed"). */
  surface: string;
  limit?: number;
  cursor?: string;
  metadata?: Metadata;
}

/** A single recommended item. */
export interface RecommendationItem {
  id: EntityId;
  entityType: string;
  score: number;
  /** Optional generic explanation of why the item was recommended. */
  reason?: string;
  metadata?: Metadata;
}

/** A recommendation response page. */
export interface RecommendationResponse {
  items: RecommendationItem[];
  nextCursor?: string;
  metadata?: Metadata;
}

/** Type guard for {@link SearchQuery}. */
export function isSearchQuery(value: unknown): value is SearchQuery {
  if (!isRecord(value)) return false;
  return typeof value["text"] === "string";
}

/** Type guard for {@link SearchResult}. */
export function isSearchResult(value: unknown): value is SearchResult {
  if (!isRecord(value)) return false;
  return (
    isEntityId(value["id"]) &&
    typeof value["entityType"] === "string" &&
    typeof value["score"] === "number"
  );
}

/** Type guard for {@link SearchResultSet}. */
export function isSearchResultSet(value: unknown): value is SearchResultSet {
  if (!isRecord(value)) return false;
  return Array.isArray(value["results"]) && value["results"].every(isSearchResult);
}

/** Type guard for {@link RecommendationRequest}. */
export function isRecommendationRequest(value: unknown): value is RecommendationRequest {
  if (!isRecord(value)) return false;
  return isEntityId(value["accountId"]) && typeof value["surface"] === "string";
}

/** Type guard for {@link RecommendationItem}. */
export function isRecommendationItem(value: unknown): value is RecommendationItem {
  if (!isRecord(value)) return false;
  return (
    isEntityId(value["id"]) &&
    typeof value["entityType"] === "string" &&
    typeof value["score"] === "number"
  );
}

/** Type guard for {@link RecommendationResponse}. */
export function isRecommendationResponse(value: unknown): value is RecommendationResponse {
  if (!isRecord(value)) return false;
  return Array.isArray(value["items"]) && value["items"].every(isRecommendationItem);
}
