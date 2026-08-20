/**
 * End-to-end wiring of the reference adapters.
 *
 * {@link createReferencePlatform} composes Core's ports with generic in-memory
 * adapters plus the two hand-written synthetic adapters in this package, then
 * subscribes a reaction pipeline to `content.post_published` that touches
 * search, audit, realtime fan-out, AI summarization, and notifications. This
 * is the integration shape a downstream product replicates with real vendor
 * adapters in its private repo.
 */

import {
  createId,
  nowIso,
  type EntityId,
  type Metadata,
} from "@third-eye-cyborg/core";
import type { Post } from "@third-eye-cyborg/contracts";
import { EVENT_TYPES, InMemoryEventBus } from "@third-eye-cyborg/events";
import { InMemoryRepository } from "@third-eye-cyborg/persistence";
import { InMemoryAuditLog, InMemorySearchIndex } from "@third-eye-cyborg/providers";
import { LocalPubSub } from "@third-eye-cyborg/realtime";
import {
  InMemoryInAppInbox,
  InMemoryPreferences,
  NotificationService,
  RecordingEmailSender,
  RecordingPushSender,
} from "@third-eye-cyborg/notifications";
import {
  HealthAggregator,
  InMemoryLogger,
  InMemoryMetrics,
  ProviderHealthTracker,
} from "@third-eye-cyborg/observability";

import { SyntheticBillingAdapter } from "./adapters/synthetic-billing.js";
import { SyntheticTextGenerator } from "./adapters/synthetic-text-generation.js";

/** Input for {@link ReferencePlatform.publishPost}. */
export interface PublishPostInput {
  authorId: EntityId;
  body: string;
  metadata?: Metadata;
}

/** Every adapter and service wired together, exposed for assertions. */
export interface ReferencePlatform {
  readonly bus: InMemoryEventBus;
  readonly posts: InMemoryRepository<Post>;
  readonly search: InMemorySearchIndex;
  readonly audit: InMemoryAuditLog;
  readonly pubsub: LocalPubSub;
  readonly notifications: NotificationService;
  readonly inbox: InMemoryInAppInbox;
  readonly email: RecordingEmailSender;
  readonly push: RecordingPushSender;
  readonly ai: SyntheticTextGenerator;
  readonly aiHealth: ProviderHealthTracker;
  readonly billing: SyntheticBillingAdapter;
  readonly logger: InMemoryLogger;
  readonly metrics: InMemoryMetrics;
  readonly health: HealthAggregator;
  /** Persist a post and publish its domain event through the pipeline. */
  publishPost(input: PublishPostInput): Promise<Post>;
}

/** Topic a post is fanned out to over realtime pub/sub. */
export function feedTopic(authorId: EntityId): string {
  return `feed:${authorId}`;
}

export function createReferencePlatform(): ReferencePlatform {
  const bus = new InMemoryEventBus();
  const posts = new InMemoryRepository<Post>();
  const search = new InMemorySearchIndex();
  const audit = new InMemoryAuditLog();
  const pubsub = new LocalPubSub();
  const inbox = new InMemoryInAppInbox();
  const email = new RecordingEmailSender();
  const push = new RecordingPushSender();
  const notifications = new NotificationService(bus, new InMemoryPreferences(), {
    inApp: inbox,
    email,
    push,
  });
  const ai = new SyntheticTextGenerator();
  const aiHealth = new ProviderHealthTracker("synthetic-text");
  const billing = new SyntheticBillingAdapter();
  const logger = new InMemoryLogger();
  const metrics = new InMemoryMetrics();

  const health = new HealthAggregator();
  health.register("search", search);
  health.register("audit", audit);
  health.register("ai", aiHealth);

  bus.subscribe<{ postId: EntityId; authorId: EntityId }>(
    EVENT_TYPES.CONTENT_POST_PUBLISHED,
    async (event) => {
      const { postId, authorId } = event.payload;
      const post = await posts.findById(postId);
      if (!post) return;

      await search.index({ id: post.id, text: post.body });
      await audit.record({
        action: "content.post_published",
        actorId: authorId,
        target: `post:${post.id}`,
      });
      await pubsub.publish(feedTopic(authorId), { postId: post.id });

      const summary = await ai.generateText({
        prompt: `Summarize post ${post.id}`,
        maxTokens: 48,
      });
      aiHealth.recordSuccess();

      await notifications.notify({
        recipientAccountId: authorId,
        template: "content.post_published",
        data: { postId: post.id, summary: summary.text },
      });

      metrics.increment("reference.post_published");
      logger.info("post published through reference pipeline", {
        postId: post.id,
      });
    },
  );

  async function publishPost(input: PublishPostInput): Promise<Post> {
    const post = await posts.create({
      id: createId("post"),
      authorId: input.authorId,
      body: input.body,
      createdAt: nowIso(),
      metadata: input.metadata,
    } as Post);
    await bus.publish({
      id: createId("evt"),
      type: EVENT_TYPES.CONTENT_POST_PUBLISHED,
      version: 1,
      occurredAt: nowIso(),
      producer: "example-reference-adapters",
      idempotencyKey: createId("idem"),
      payload: {
        postId: post.id,
        authorId: post.authorId,
        publishedAt: post.createdAt,
      },
    });
    return post;
  }

  return {
    bus,
    posts,
    search,
    audit,
    pubsub,
    notifications,
    inbox,
    email,
    push,
    ai,
    aiHealth,
    billing,
    logger,
    metrics,
    health,
    publishPost,
  };
}
