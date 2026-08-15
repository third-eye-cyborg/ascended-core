/**
 * Programmatic demo of the reference SDK against the reference minimal server.
 *
 * The flow mirrors what a downstream adopter's integration test would do:
 * health check, profile setup, posting, reactions, community membership, and
 * notifications — entirely offline, with synthetic data only.
 */

import {
  AscendedCoreClient,
  collectAll,
  type AscendedCoreClientOptions,
} from "@ascended/sdk";

/** One line of the demo transcript. */
export interface DemoStep {
  readonly name: string;
  readonly detail: string;
}

/** Result of {@link runApiDemo}. */
export interface ApiDemoResult {
  readonly ok: boolean;
  readonly steps: readonly DemoStep[];
}

/**
 * Run the SDK demo flow against a base URL. `apiKey` is a bearer token; the
 * reference server accepts synthetic `test-<accountId>` tokens so no real
 * identity provider is needed.
 */
export async function runApiDemo(
  options: Pick<AscendedCoreClientOptions, "baseUrl" | "apiKey">,
): Promise<ApiDemoResult> {
  const client = new AscendedCoreClient(options);
  const steps: DemoStep[] = [];

  const health = await client.getHealthz();
  steps.push({ name: "health", detail: `status=${health.status}` });

  const profile = await client.updateMyProfile({
    displayName: "Ada Example",
    bio: "Synthetic profile for the SDK demo.",
  });
  steps.push({ name: "profile.update", detail: `displayName=${profile.displayName}` });

  const fetched = await client.getMyProfile();
  steps.push({ name: "profile.get", detail: `id=${fetched.id}` });

  const first = await client.createPost({
    content: "First post from the SDK demo.",
  });
  steps.push({ name: "posts.create", detail: `id=${first.id}` });

  await client.createPost({ content: "Second post from the SDK demo." });

  const posts = await collectAll((cursor) =>
    client.listPosts({ limit: 1, ...(cursor ? { cursor } : {}) }),
  );
  steps.push({ name: "posts.list", detail: `collected=${posts.length}` });

  const reaction = await client.addReaction(first.id, { kind: "like" });
  steps.push({ name: "reactions.add", detail: `kind=${reaction.kind}` });

  const community = await client.createCommunity({
    name: "SDK Demo Community",
    description: "Synthetic community created by the openapi-client example.",
  });
  steps.push({ name: "communities.create", detail: `id=${community.id}` });

  const membership = await client.joinCommunity(community.id);
  steps.push({ name: "communities.join", detail: `role=${membership.role}` });

  const notifications = await client.listMyNotifications();
  steps.push({
    name: "notifications.list",
    detail: `count=${notifications.items.length}`,
  });

  return { ok: true, steps };
}
