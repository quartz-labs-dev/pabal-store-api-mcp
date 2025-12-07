/**
 * Google Play Console API Types
 *
 * Type definitions for Google Play Store operations.
 * Response types are from Discovery Document, Request attribute types are extracted.
 *
 * @see https://developers.google.com/android-publisher
 */

import type { Schemas } from "./generated-types";

// Schema type alias for convenience
type GooglePlaySchemas = Schemas;

// ============================================================================
// Custom Types (not from Discovery Document)
// ============================================================================

/**
 * Google Play Client Configuration
 * Internal type for client initialization
 */
export interface GooglePlayClientConfig {
  packageName: string;
  serviceAccountKeyPath?: string;
  serviceAccountKey?: object;
}

/**
 * Edit Session
 * Internal helper type that extends AppEdit with auth and packageName
 * for convenience in API calls
 */
export interface EditSession extends Pick<AppEdit, "id"> {
  auth: unknown;
  packageName: string;
  editId: string; // Alias for AppEdit.id
}

/**
 * Screenshot URLs grouped by device type
 * Internal type for organizing screenshots by device category
 */
export interface ScreenshotUrls {
  phone: string[];
  tablet7: string[];
  tablet10: string[];
  tv: string[];
  wear: string[];
}

/**
 * App Access Information
 * Internal type for app verification results
 */
export interface AppAccessInfo {
  packageName: string;
  title?: string;
  defaultLanguage?: string;
  supportedLocales?: string[];
}

/**
 * Latest Release Information
 * Internal type derived from TrackRelease for convenience
 * Extracts and transforms TrackRelease data for easier consumption
 */
export interface LatestReleaseInfo {
  versionCodes: number[]; // Converted from TrackRelease.versionCodes (string[] -> number[])
  status?: NonNullable<TrackRelease["status"]>;
  versionName?: string; // Derived from TrackRelease.name
  releaseName?: NonNullable<TrackRelease["name"]>;
  releaseDate?: string; // Extracted from releaseDate.seconds if available
}

/**
 * Release Update Result
 * Internal type for tracking release note update operations
 */
export interface ReleaseUpdateResult {
  updated: string[];
  failed: Array<{ locale: string; error: string }>;
}

/**
 * Create Release Options
 * Internal type for creating a new release
 * Based on TrackRelease but with simplified versionCodes (number[])
 */
export interface CreateReleaseOptions {
  versionCodes: number[]; // Will be converted to string[] for TrackRelease
  releaseName?: NonNullable<TrackRelease["name"]>;
  status?: NonNullable<TrackRelease["status"]>;
}

/**
 * Upload Screenshot Options
 * Internal type for screenshot upload operations
 */
export interface UploadScreenshotOptions {
  imagePath: string;
  imageType:
    | "phoneScreenshots"
    | "sevenInchScreenshots"
    | "tenInchScreenshots"
    | "tvScreenshots"
    | "wearScreenshots"
    | "featureGraphic";
  language?: string;
}

/**
 * Update Release Notes Options
 * Internal type for updating release notes
 */
export interface UpdateReleaseNotesOptions {
  releaseNotes: Record<string, string>; // Will be converted to LocalizedText[]
  track?: string;
}

/**
 * App Details Data
 * Internal type for app details update operations
 * Based on AppDetails but with optional fields for partial updates
 */
export interface AppDetailsData {
  contactEmail?: NonNullable<AppDetails["contactEmail"]>;
  contactPhone?: NonNullable<AppDetails["contactPhone"]>;
  contactWebsite?: NonNullable<AppDetails["contactWebsite"]>;
  defaultLanguage?: NonNullable<AppDetails["defaultLanguage"]>;
}

// ============================================================================
// Response Types (from Discovery Document)
// ============================================================================

export type AppEdit = GooglePlaySchemas["AppEdit"];
export type Listing = GooglePlaySchemas["Listing"];
export type AppDetails = GooglePlaySchemas["AppDetails"];
export type Image = GooglePlaySchemas["Image"];
export type Track = GooglePlaySchemas["Track"];
export type TrackRelease = GooglePlaySchemas["TrackRelease"];
export type LocalizedText = GooglePlaySchemas["LocalizedText"];
export type CountryTargeting = GooglePlaySchemas["CountryTargeting"];
export type ListingsListResponse = GooglePlaySchemas["ListingsListResponse"];
export type TracksListResponse = GooglePlaySchemas["TracksListResponse"];
export type ImagesListResponse = GooglePlaySchemas["ImagesListResponse"];

// ============================================================================
// Enum Types (from Discovery Document)
// ============================================================================

export type ImageType = import("./generated-types").ImageType;

// ============================================================================
// Request Attribute Types (extracted from Discovery Document)
// ============================================================================

/**
 * Listing Update Request Attributes
 * @see https://developers.google.com/android-publisher/api-ref/rest/v3/edits.listings#Listing
 */
export type ListingUpdateAttributes = {
  language?: string;
  title?: string;
  shortDescription?: string;
  fullDescription?: string;
  video?: string;
};

/**
 * App Details Update Request Attributes
 * @see https://developers.google.com/android-publisher/api-ref/rest/v3/edits.details#AppDetails
 */
export type AppDetailsUpdateAttributes = {
  defaultLanguage?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactWebsite?: string;
};

/**
 * Track Update Request Attributes
 * @see https://developers.google.com/android-publisher/api-ref/rest/v3/edits.tracks#Track
 */
export type TrackUpdateAttributes = {
  track?: string;
  releases?: TrackRelease[];
};
