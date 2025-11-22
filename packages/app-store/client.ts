import type {
  AppId,
  CreateVersionResult,
  ReleaseNote,
  StoreMetadata,
} from "../core/types";
import type { StoreClient } from "../core/store-client";
import type { AppStoreConfig } from "../core/config";

// App Store Connect API 호출은 추후 구현. 현재는 시그니처만 유지.
export class AppStoreClient implements StoreClient {
  constructor(private readonly config: AppStoreConfig) {}

  async pullMetadata(_appId: AppId): Promise<StoreMetadata> {
    throw new Error("App Store pullMetadata not implemented yet");
  }

  async pushMetadata(_appId: AppId, _payload: StoreMetadata): Promise<void> {
    throw new Error("App Store pushMetadata not implemented yet");
  }

  async createVersion(_appId: AppId, _version: string): Promise<CreateVersionResult> {
    throw new Error("App Store createVersion not implemented yet");
  }

  async pullReleaseNotes(_appId: AppId): Promise<ReleaseNote[]> {
    throw new Error("App Store pullReleaseNotes not implemented yet");
  }

  async extractAppId(_input: string): Promise<AppId | null> {
    throw new Error("App Store extractAppId not implemented yet");
  }
}
