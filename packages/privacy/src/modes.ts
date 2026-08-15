/**
 * Privacy modes and execution platforms.
 *
 * These enums are intentionally vendor-free. They describe *how* a request may
 * be served (cloud, private-local, or human) and *where* it runs (platform),
 * without referencing any specific product or provider.
 */

/**
 * User privacy preference governing which provider families may be used.
 *
 * - `CLOUD`: remote/cloud provider families are permitted.
 * - `PRIVATE_LOCAL`: only on-device/local families are permitted unless a
 *   specific provider is explicitly allow-listed.
 * - `HUMAN`: no automated provider calls are permitted; results come from
 *   human/community sources only.
 */
export enum PrivacyMode {
  CLOUD = "cloud",
  PRIVATE_LOCAL = "private-local",
  HUMAN = "human",
}

/**
 * Execution environment where a provider can run.
 */
export enum Platform {
  WEB = "web",
  IOS = "ios",
  ANDROID = "android",
  MACOS = "macos",
  WINDOWS = "windows",
  LINUX = "linux",
  /** Cross-platform desktop wrapper (macOS, Windows, Linux). */
  DESKTOP = "desktop",
}
