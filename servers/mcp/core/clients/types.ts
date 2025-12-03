import type { AppError } from "@/packages/common/errors/app-error";

export type ClientFactoryResult<TClient> =
  | { success: true; client: TClient }
  | { success: false; error: AppError };
