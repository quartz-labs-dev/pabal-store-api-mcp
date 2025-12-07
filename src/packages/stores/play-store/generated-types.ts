/**
 * This file re-exports types from googleapis library.
 * Do not make direct changes to the file.
 *
 * Source: https://androidpublisher.googleapis.com/$discovery/rest?version=v3
 * Types are from: googleapis/build/src/apis/androidpublisher/v3
 *
 * For full API documentation, see: https://developers.google.com/android-publisher
 */

import type { androidpublisher_v3 } from "googleapis";

// ============================================================================
// Core Types (re-exported from googleapis with Schema$ prefix removed)
// ============================================================================

/**
 * An app edit. The resource for EditsService.
 */
export type AppEdit = androidpublisher_v3.Schema$AppEdit;

/**
 * A localized store listing. The resource for ListingsService.
 */
export type Listing = androidpublisher_v3.Schema$Listing;

/**
 * The app details. The resource for DetailsService.
 */
export type AppDetails = androidpublisher_v3.Schema$AppDetails;

/**
 * An uploaded image. The resource for ImagesService.
 */
export type Image = androidpublisher_v3.Schema$Image;

/**
 * A track configuration. The resource for TracksService.
 */
export type Track = androidpublisher_v3.Schema$Track;

/**
 * A release within a track.
 */
export type TrackRelease = androidpublisher_v3.Schema$TrackRelease;

/**
 * Localized text in given language.
 */
export type LocalizedText = androidpublisher_v3.Schema$LocalizedText;

/**
 * Country targeting specification.
 */
export type CountryTargeting = androidpublisher_v3.Schema$CountryTargeting;

/**
 * Response listing all listings.
 */
export type ListingsListResponse =
  androidpublisher_v3.Schema$ListingsListResponse;

/**
 * Response listing all tracks.
 */
export type TracksListResponse = androidpublisher_v3.Schema$TracksListResponse;

/**
 * Response listing all images.
 */
export type ImagesListResponse = androidpublisher_v3.Schema$ImagesListResponse;

// ============================================================================
// Enums (from Discovery Document)
// ============================================================================

/**
 * Type of the Image
 * @see https://developers.google.com/android-publisher/api-ref/rest/v3/edits.images#ImageType
 */
export type ImageType =
  | "appImageTypeUnspecified"
  | "phoneScreenshots"
  | "sevenInchScreenshots"
  | "tenInchScreenshots"
  | "tvScreenshots"
  | "wearScreenshots"
  | "icon"
  | "featureGraphic"
  | "tvBanner";

// ============================================================================
// Request Types
// ============================================================================

/**
 * Request body for updating a listing.
 */
export interface ListingUpdateRequest {
  language?: string | null;
  title?: string | null;
  shortDescription?: string | null;
  fullDescription?: string | null;
  video?: string | null;
}

/**
 * Request body for updating app details.
 */
export interface AppDetailsUpdateRequest {
  defaultLanguage?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactWebsite?: string | null;
}

/**
 * Request body for updating a track.
 */
export interface TrackUpdateRequest {
  track?: string | null;
  releases?: TrackRelease[] | null;
}

// ============================================================================
// Schema Type Alias (for compatibility with App Store pattern)
// ============================================================================

export interface Schemas {
  AppEdit: AppEdit;
  Listing: Listing;
  AppDetails: AppDetails;
  Image: Image;
  Track: Track;
  TrackRelease: TrackRelease;
  LocalizedText: LocalizedText;
  CountryTargeting: CountryTargeting;
  ListingsListResponse: ListingsListResponse;
  TracksListResponse: TracksListResponse;
  ImagesListResponse: ImagesListResponse;
}

// ============================================================================
// API Parameter Types (extracted from Discovery Document)
// ============================================================================

/**
 * Parameters for edits.insert
 */
export interface EditsInsertParams {
  packageName: string;
  requestBody?: AppEdit;
}

/**
 * Parameters for edits.delete
 */
export interface EditsDeleteParams {
  packageName: string;
  editId: string;
}

/**
 * Parameters for edits.commit
 */
export interface EditsCommitParams {
  packageName: string;
  editId: string;
  changesNotSentForReview?: boolean;
}

/**
 * Parameters for edits.details.get
 */
export interface EditsDetailsGetParams {
  packageName: string;
  editId: string;
}

/**
 * Parameters for edits.details.update
 */
export interface EditsDetailsUpdateParams {
  packageName: string;
  editId: string;
  requestBody: AppDetailsUpdateRequest;
}

/**
 * Parameters for edits.listings.list
 */
export interface EditsListingsListParams {
  packageName: string;
  editId: string;
}

/**
 * Parameters for edits.listings.get
 */
export interface EditsListingsGetParams {
  packageName: string;
  editId: string;
  language: string;
}

/**
 * Parameters for edits.listings.update
 */
export interface EditsListingsUpdateParams {
  packageName: string;
  editId: string;
  language: string;
  requestBody: ListingUpdateRequest;
}

/**
 * Parameters for edits.images.list
 */
export interface EditsImagesListParams {
  packageName: string;
  editId: string;
  language: string;
  imageType: ImageType;
}

/**
 * Parameters for edits.images.upload
 */
export interface EditsImagesUploadParams {
  packageName: string;
  editId: string;
  language: string;
  imageType: ImageType;
  media: { mimeType: string; body: Buffer };
}

/**
 * Parameters for edits.tracks.get
 */
export interface EditsTracksGetParams {
  packageName: string;
  editId: string;
  track: string;
}

/**
 * Parameters for edits.tracks.update
 */
export interface EditsTracksUpdateParams {
  packageName: string;
  editId: string;
  track: string;
  requestBody: TrackUpdateRequest;
}

/**
 * Parameters for edits.tracks.list
 */
export interface EditsTracksListParams {
  packageName: string;
  editId: string;
}
