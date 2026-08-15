import { describe, it, expect } from "vitest";
import { LocalPubSub } from "../src/local/pubsub";

describe("LocalPubSub", () => {
  it("fans out to all subscribers of an exact topic", async () => {
    const pubsub = new LocalPubSub();
    const a: string[] = [];
    const b: string[] = [];
    pubsub.subscribe<string>("topic.a", (m) => void a.push(m));
    pubsub.subscribe<string>("topic.a", (m) => void b.push(m));
    pubsub.subscribe<string>("topic.b", (m) => void a.push(`b:${m}`));

    await pubsub.publish("topic.a", "hello");
    expect(a).toEqual(["hello"]);
    expect(b).toEqual(["hello"]);
  });

  it("stops delivering after unsubscribe", async () => {
    const pubsub = new LocalPubSub();
    const seen: string[] = [];
    const off = pubsub.subscribe<string>("t", (m) => void seen.push(m));
    await pubsub.publish("t", "one");
    off();
    off(); // idempotent
    await pubsub.publish("t", "two");
    expect(seen).toEqual(["one"]);
  });
});
