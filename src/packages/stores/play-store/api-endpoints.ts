/**
 * Google Play Console API Endpoints
 *
 * Centralized API endpoint management for androidpublisher v3 API
 */

import type { androidpublisher_v3 } from "googleapis";
import type {
  EditSession,
  ListingUpdateAttributes,
  AppDetailsUpdateAttributes,
  TrackUpdateAttributes,
  ImageType,
  AppEdit,
  AppDetails,
  Listing,
  Image,
  Track,
  ListingsListResponse,
  ImagesListResponse,
  TracksListResponse,
  ImagesUploadResponse,
} from "./types";

export class GooglePlayApiEndpoints {
  constructor(private androidPublisher: androidpublisher_v3.Androidpublisher) {}

  /**
   * Edit Operations
   */
  async createEdit(
    auth: EditSession["auth"],
    packageName: string
  ): Promise<{ data: AppEdit }> {
    const response = await this.androidPublisher.edits.insert({
      auth,
      packageName,
    });
    return { data: response.data };
  }

  async deleteEdit(session: EditSession): Promise<{ data: void }> {
    await this.androidPublisher.edits.delete({
      auth: session.auth,
      packageName: session.packageName,
      editId: session.editId,
    });
    return { data: undefined };
  }

  async commitEdit(session: EditSession): Promise<{ data: AppEdit }> {
    const response = await this.androidPublisher.edits.commit({
      auth: session.auth,
      packageName: session.packageName,
      editId: session.editId,
    });
    return { data: response.data };
  }

  /**
   * App Details Operations
   */
  async getAppDetails(session: EditSession): Promise<{ data: AppDetails }> {
    const response = await this.androidPublisher.edits.details.get({
      auth: session.auth,
      packageName: session.packageName,
      editId: session.editId,
    });
    return { data: response.data };
  }

  async updateAppDetails(
    session: EditSession,
    requestBody: AppDetailsUpdateAttributes
  ): Promise<{ data: AppDetails }> {
    const response = await this.androidPublisher.edits.details.update({
      auth: session.auth,
      packageName: session.packageName,
      editId: session.editId,
      requestBody,
    });
    return { data: response.data };
  }

  /**
   * Listing Operations
   */
  async listListings(
    session: EditSession
  ): Promise<{ data: ListingsListResponse }> {
    const response = await this.androidPublisher.edits.listings.list({
      auth: session.auth,
      packageName: session.packageName,
      editId: session.editId,
    });
    return { data: response.data };
  }

  async getListing(
    session: EditSession,
    language: string
  ): Promise<{ data: Listing }> {
    const response = await this.androidPublisher.edits.listings.get({
      auth: session.auth,
      packageName: session.packageName,
      editId: session.editId,
      language,
    });
    return { data: response.data };
  }

  async updateListing(
    session: EditSession,
    language: string,
    requestBody: ListingUpdateAttributes
  ): Promise<{ data: Listing }> {
    const response = await this.androidPublisher.edits.listings.update({
      auth: session.auth,
      packageName: session.packageName,
      editId: session.editId,
      language,
      requestBody,
    });
    return { data: response.data };
  }

  /**
   * Image Operations
   */
  async listImages(
    session: EditSession,
    language: string,
    imageType: ImageType
  ): Promise<{ data: ImagesListResponse }> {
    const response = await this.androidPublisher.edits.images.list({
      auth: session.auth,
      packageName: session.packageName,
      editId: session.editId,
      language,
      imageType,
    });
    return { data: response.data };
  }

  async uploadImage(
    session: EditSession,
    language: string,
    imageType: ImageType,
    media: { mimeType: string; body: Buffer }
  ): Promise<{ data: Image }> {
    const response = await this.androidPublisher.edits.images.upload({
      auth: session.auth,
      packageName: session.packageName,
      editId: session.editId,
      language,
      imageType,
      media,
    });
    const uploadData: ImagesUploadResponse = response.data;
    if (!uploadData?.image) {
      throw new Error("Image upload failed: no image data returned");
    }
    return { data: uploadData.image };
  }

  /**
   * Track Operations
   */
  async getTrack(
    session: EditSession,
    track: string
  ): Promise<{ data: Track }> {
    const response = await this.androidPublisher.edits.tracks.get({
      auth: session.auth,
      packageName: session.packageName,
      editId: session.editId,
      track,
    });
    return { data: response.data };
  }

  async updateTrack(
    session: EditSession,
    track: string,
    requestBody: TrackUpdateAttributes
  ): Promise<{ data: Track }> {
    const response = await this.androidPublisher.edits.tracks.update({
      auth: session.auth,
      packageName: session.packageName,
      editId: session.editId,
      track,
      requestBody,
    });
    return { data: response.data };
  }

  async listTracks(
    session: EditSession
  ): Promise<{ data: TracksListResponse }> {
    const response = await this.androidPublisher.edits.tracks.list({
      auth: session.auth,
      packageName: session.packageName,
      editId: session.editId,
    });
    return { data: response.data };
  }
}
