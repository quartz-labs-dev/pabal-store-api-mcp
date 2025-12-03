import { AppError } from "@/packages/common/errors/app-error";
import { ERROR_CODES } from "@/packages/common/errors/error-codes";
import { findApp } from "@/packages/configs/secrets-config/registered-apps";
import { HTTP_STATUS } from "@/packages/common/errors/status-codes";
import { serviceFailure, serviceSuccess } from "./service-helpers";
import { type ResolvedAppContext, type ServiceResult } from "./types";

interface ResolveAppOptions {
  slug?: string;
  bundleId?: string;
  packageName?: string;
}

/**
 * Resolve registered app and store identifiers from user input.
 * Separates "which store data is available" from tool-level orchestration.
 */
export class AppResolutionService {
  resolve(options: ResolveAppOptions): ServiceResult<ResolvedAppContext> {
    const { slug, bundleId, packageName } = options;
    const identifier = slug || bundleId || packageName;

    if (!identifier) {
      return serviceFailure(
        AppError.validation(
          ERROR_CODES.APP_IDENTIFIER_MISSING,
          "❌ App not found. Please provide app (slug), packageName, or bundleId."
        )
      );
    }

    try {
      const app = findApp(identifier);
      if (!app) {
        return serviceFailure(
          AppError.notFound(
            ERROR_CODES.APP_NOT_FOUND,
            `❌ App registered with "${identifier}" not found. Check registered apps using apps-search.`
          )
        );
      }

      return serviceSuccess({
        app,
        slug: app.slug,
        bundleId: bundleId ?? app.appStore?.bundleId,
        packageName: packageName ?? app.googlePlay?.packageName,
        hasAppStore: Boolean(app.appStore),
        hasGooglePlay: Boolean(app.googlePlay),
      });
    } catch (error) {
      return serviceFailure(
        AppError.wrap(
          error,
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_CODES.APP_RESOLUTION_FAILED,
          "Failed to resolve app"
        )
      );
    }
  }
}
