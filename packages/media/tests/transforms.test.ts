import { describe, it, expect } from "vitest";
import { createId } from "@ascended/core";
import { NoopTransformPort } from "../src/local";
import { TransformJobState } from "../src/transforms";

describe("NoopTransformPort", () => {
  it("returns a completed job honoring the transform contract", async () => {
    const port = new NoopTransformPort();
    const assetId = createId("asset");
    const job = await port.requestTransform(assetId, { width: 128, format: "webp", quality: 80 });

    expect(job.assetId).toBe(assetId);
    expect(job.state).toBe(TransformJobState.COMPLETED);
    expect(job.spec.width).toBe(128);
    expect(job.outputAssetId).toBe(assetId);
  });
});
