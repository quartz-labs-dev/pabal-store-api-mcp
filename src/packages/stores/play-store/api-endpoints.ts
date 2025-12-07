/**
 * Google Play Console API Endpoints
 *
 * Centralized API endpoint management for androidpublisher v3 API
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type {
  EditSession,
  AppEdit,
  AppDetails,
  Listing,
  ListingsListResponse,
  Image,
  ImagesListResponse,
  Track,
  TracksListResponse,
  ListingUpdateAttributes,
  AppDetailsUpdateAttributes,
  TrackUpdateAttributes,
  ImageType,
} from "./types";
import type {
  EditsInsertParams,
  EditsDeleteParams,
  EditsCommitParams,
  EditsDetailsGetParams,
  EditsDetailsUpdateParams,
  EditsListingsListParams,
  EditsListingsGetParams,
  EditsListingsUpdateParams,
  EditsImagesListParams,
  EditsImagesUploadParams,
  EditsTracksGetParams,
  EditsTracksUpdateParams,
  EditsTracksListParams,
} from "./generated-types";

export class GooglePlayApiEndpoints {
  constructor(private androidPublisher: any) {}

  /**
   * Edit Operations
   */
  async createEdit(
    auth: unknown,
    packageName: string
  ): Promise<{ data: AppEdit }> {
    const params: EditsInsertParams = { packageName };
    return this.androidPublisher.edits.insert({
      auth,
      ...params,
    });
  }

  async deleteEdit(session: EditSession): Promise<{ data: void }> {
    const params: EditsDeleteParams = {
      packageName: session.packageName,
      editId: session.editId,
    };
    return this.androidPublisher.edits.delete({
      auth: session.auth,
      ...params,
    });
  }

  async commitEdit(session: EditSession): Promise<{ data: AppEdit }> {
    const params: EditsCommitParams = {
      packageName: session.packageName,
      editId: session.editId,
    };
    return this.androidPublisher.edits.commit({
      auth: session.auth,
      ...params,
    });
  }

  /**
   * App Details Operations
   */
  async getAppDetails(session: EditSession): Promise<{ data: AppDetails }> {
    const params: EditsDetailsGetParams = {
      packageName: session.packageName,
      editId: session.editId,
    };
    return this.androidPublisher.edits.details.get({
      auth: session.auth,
      ...params,
    });
  }

  async updateAppDetails(
    session: EditSession,
    requestBody: AppDetailsUpdateAttributes
  ): Promise<{ data: AppDetails }> {
    const params: EditsDetailsUpdateParams = {
      packageName: session.packageName,
      editId: session.editId,
      requestBody,
    };
    return this.androidPublisher.edits.details.update({
      auth: session.auth,
      ...params,
    });
  }

  /**
   * Listing Operations
   */
  async listListings(
    session: EditSession
  ): Promise<{ data: ListingsListResponse }> {
    const params: EditsListingsListParams = {
      packageName: session.packageName,
      editId: session.editId,
    };
    return this.androidPublisher.edits.listings.list({
      auth: session.auth,
      ...params,
    });
  }

  async getListing(
    session: EditSession,
    language: string
  ): Promise<{ data: Listing }> {
    const params: EditsListingsGetParams = {
      packageName: session.packageName,
      editId: session.editId,
      language,
    };
    return this.androidPublisher.edits.listings.get({
      auth: session.auth,
      ...params,
    });
  }

  async updateListing(
    session: EditSession,
    language: string,
    requestBody: ListingUpdateAttributes
  ): Promise<{ data: Listing }> {
    const params: EditsListingsUpdateParams = {
      packageName: session.packageName,
      editId: session.editId,
      language,
      requestBody,
    };
    return this.androidPublisher.edits.listings.update({
      auth: session.auth,
      ...params,
    });
  }

  /**
   * Image Operations
   */
  async listImages(
    session: EditSession,
    language: string,
    imageType: ImageType
  ): Promise<{ data: ImagesListResponse }> {
    const params: EditsImagesListParams = {
      packageName: session.packageName,
      editId: session.editId,
      language,
      imageType,
    };
    return this.androidPublisher.edits.images.list({
      auth: session.auth,
      ...params,
    });
  }

  async uploadImage(
    session: EditSession,
    language: string,
    imageType: ImageType,
    media: { mimeType: string; body: Buffer }
  ): Promise<{ data: Image }> {
    const params: EditsImagesUploadParams = {
      packageName: session.packageName,
      editId: session.editId,
      language,
      imageType,
      media,
    };
    return this.androidPublisher.edits.images.upload({
      auth: session.auth,
      ...params,
    });
  }

  /**
   * Track Operations
   */
  async getTrack(
    session: EditSession,
    track: string
  ): Promise<{ data: Track }> {
    const params: EditsTracksGetParams = {
      packageName: session.packageName,
      editId: session.editId,
      track,
    };
    return this.androidPublisher.edits.tracks.get({
      auth: session.auth,
      ...params,
    });
  }

  async updateTrack(
    session: EditSession,
    track: string,
    requestBody: TrackUpdateAttributes
  ): Promise<{ data: Track }> {
    const params: EditsTracksUpdateParams = {
      packageName: session.packageName,
      editId: session.editId,
      track,
      requestBody,
    };
    return this.androidPublisher.edits.tracks.update({
      auth: session.auth,
      ...params,
    });
  }

  async listTracks(
    session: EditSession
  ): Promise<{ data: TracksListResponse }> {
    const params: EditsTracksListParams = {
      packageName: session.packageName,
      editId: session.editId,
    };
    return this.androidPublisher.edits.tracks.list({
      auth: session.auth,
      ...params,
    });
  }
}
