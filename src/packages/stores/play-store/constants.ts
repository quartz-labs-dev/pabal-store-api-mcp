/**
 * Google Play Console API Constants
 *
 * Constant values for Google Play Store operations
 */

import type { ImageType } from "./generated-types";

// Subset of ImageType enum values that are commonly used for screenshots
export const IMAGE_TYPES: readonly ImageType[] = [
  "phoneScreenshots",
  "sevenInchScreenshots",
  "tenInchScreenshots",
  "tvScreenshots",
  "wearScreenshots",
  "featureGraphic",
] as const;

export const DEFAULT_TRACK = "production";
export const DEFAULT_LANGUAGE = "en-US";
export const DEFAULT_RELEASE_STATUS = "draft";
