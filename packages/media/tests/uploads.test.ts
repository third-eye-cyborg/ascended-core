import { describe, it, expect } from "vitest";
import { CoreError, ErrorCode, createId } from "@third-eye-cyborg/core";
import { LocalMediaService } from "../src/local";
import { MediaAssetState } from "../src/assets";
import type { UploadPolicy } from "../src/uploads";
import { RecordingEventBus } from "./support";

const policy: UploadPolicy = {
  maxSizeBytes: 1_000_000,
  allowedContentTypes: ["image/png", "image/jpeg"],
};

describe("LocalMediaService uploads", () => {
  it("begin -> complete emits media.asset_uploaded and marks asset ready", async () => {
    const bus = new RecordingEventBus();
    const service = new LocalMediaService(bus, policy);
    const owner = createId("acct");

    const session = await service.beginUpload({
      ownerId: owner,
      filename: "placeholder.png",
      contentType: "image/png",
      sizeBytes: 2048,
    });
    expect(session.method).toBe("direct");

    await service.completeUpload(session.uploadId);
    expect(bus.types()).toContain("media.asset_uploaded");

    const event = bus.events.find((e) => e.type === "media.asset_uploaded");
    const assetId = (event?.payload as { assetId: string }).assetId;
    const asset = await service.getAsset(assetId as ReturnType<typeof createId>);
    expect(asset?.state).toBe(MediaAssetState.READY);
    expect(asset?.publicUrl).toBeDefined();
  });

  it("rejects oversize uploads with VALIDATION", async () => {
    const service = new LocalMediaService(new RecordingEventBus(), policy);
    await expect(
      service.beginUpload({
        ownerId: createId("acct"),
        filename: "big.png",
        contentType: "image/png",
        sizeBytes: 5_000_000,
      }),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION });
  });

  it("rejects unsupported content types with VALIDATION", async () => {
    const service = new LocalMediaService(new RecordingEventBus(), policy);
    try {
      await service.beginUpload({
        ownerId: createId("acct"),
        filename: "notes.txt",
        contentType: "text/plain",
        sizeBytes: 10,
      });
      throw new Error("expected rejection");
    } catch (error) {
      expect(CoreError.isCoreError(error)).toBe(true);
      expect((error as CoreError).code).toBe(ErrorCode.VALIDATION);
    }
  });

  it("abort discards the pending asset", async () => {
    const service = new LocalMediaService(new RecordingEventBus(), policy);
    const session = await service.beginUpload({
      ownerId: createId("acct"),
      filename: "x.jpeg",
      contentType: "image/jpeg",
      sizeBytes: 100,
    });
    await service.abortUpload(session.uploadId);
    await expect(service.completeUpload(session.uploadId)).rejects.toBeInstanceOf(CoreError);
  });
});
