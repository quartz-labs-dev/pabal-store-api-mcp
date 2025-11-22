import type {
  AppId,
  CreateVersionResult,
  ReleaseNote,
  StoreMetadata,
} from "./types";

// 스토어별 클라이언트가 구현해야 할 최소 인터페이스
export interface StoreClient {
  pullMetadata(appId: AppId): Promise<StoreMetadata>;
  pushMetadata(appId: AppId, payload: StoreMetadata): Promise<void>;
  createVersion(appId: AppId, version: string): Promise<CreateVersionResult>;
  pullReleaseNotes(appId: AppId): Promise<ReleaseNote[]>;
  extractAppId(input: string): Promise<AppId | null>;
}
