/**
 * `@third-eye-cyborg/example-minimal-server`
 *
 * A runnable reference API server with zero external runtime dependencies. It
 * composes the workspace's local in-memory adapters and exposes the reference
 * contract (profiles, posts, communities, events, notifications) over HTTP.
 */

export {
  createServer,
  type CreateServerOptions,
  type RunningServer,
} from "./server.js";

export {
  createPlatform,
  demoTokenFor,
  newAccountId,
  type Platform,
} from "./store.js";

export {
  runDemoFlow,
  type DemoResult,
  type DemoStep,
} from "./demo-flow.js";

export type {
  CommunityWire,
  ErrorWire,
  EventWire,
  HealthWire,
  MembershipWire,
  NotificationWire,
  PageWire,
  PostWire,
  ProfileWire,
  ReactionWire,
  RsvpWire,
} from "./wire.js";
