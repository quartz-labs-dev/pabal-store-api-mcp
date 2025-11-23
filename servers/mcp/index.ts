import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chdir } from "node:process";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import { z } from "zod";
import {
  handlePing,
  handleAuthCheck,
  handleSetupApps,
  handleAddApp,
  handleSearchApps,
  handleAsoPull,
  handleAsoPush,
  handleAsoTranslate,
  handleAsoCreateVersion,
  handleAsoPullReleaseNotes,
  handleUpdateNotes,
} from "./tools";

// Change to project root first
// tsx automatically resolves tsconfig.json paths when run from project root
const mcpServerFilename = fileURLToPath(import.meta.url);
const mcpServerDirname = dirname(mcpServerFilename);
const projectRoot = join(mcpServerDirname, "../..");
chdir(projectRoot);

const server = new McpServer(
  { name: "pabal-mcp", version: "0.0.1" },
  {
    instructions:
      "Provides tools for App Store/Play Store ASO. Use ping first to verify connection.",
  }
);

// ============================================================================
// Common Schemas
// ============================================================================

const storeSchema = z.enum(["appStore", "googlePlay", "both"]).optional();

// ============================================================================
// Health Check
// ============================================================================

server.registerTool(
  "ping",
  {
    description: "Health check for connection verification",
  },
  handlePing
);

// ============================================================================
// Authentication (auth-*)
// ============================================================================

server.registerTool(
  "auth-check",
  {
    description:
      "Check authentication status for App Store Connect / Google Play Console.",
    inputSchema: {
      store: storeSchema.describe("Store to check (default: both)"),
    },
  },
  handleAuthCheck
);

// ============================================================================
// App Management (apps-*)
// ============================================================================

server.registerTool(
  "apps-init",
  {
    description:
      "Query app list from store API and register automatically. App Store: auto-register all apps, Google Play: packageName required.",
    inputSchema: {
      store: z
        .enum(["appStore", "googlePlay"])
        .optional()
        .describe("Target store (default: appStore)"),
      packageName: z
        .string()
        .optional()
        .describe(
          "Google Play package name (required when setting up Google Play)"
        ),
    },
  },
  handleSetupApps
);

server.registerTool(
  "apps-add",
  {
    description:
      "Register individual app by bundleId or packageName. Automatically checks both stores.",
    inputSchema: {
      identifier: z
        .string()
        .describe(
          "App identifier (bundleId or packageName, e.g., com.example.app)"
        ),
      slug: z
        .string()
        .optional()
        .describe(
          "Custom slug (if not specified, uses last part of identifier)"
        ),
      store: storeSchema.describe("Store to check (default: both)"),
    },
  },
  handleAddApp
);

server.registerTool(
  "apps-search",
  {
    description:
      "Search registered apps. Returns all apps if called without query.",
    inputSchema: {
      query: z
        .string()
        .optional()
        .describe(
          "Search term (slug, bundleId, packageName, name). Returns all apps if empty"
        ),
      store: z
        .enum(["all", "appStore", "googlePlay"])
        .optional()
        .describe("Store filter (default: all)"),
    },
  },
  handleSearchApps
);

// ============================================================================
// ASO Data Sync (aso-*)
// ============================================================================

server.registerTool(
  "aso-pull",
  {
    description:
      "Fetch ASO data from App Store/Google Play and save to local cache.",
    inputSchema: {
      app: z
        .string()
        .optional()
        .describe("Registered app slug (app registered via apps-init)"),
      packageName: z.string().optional().describe("Google Play package name"),
      bundleId: z.string().optional().describe("App Store bundle ID"),
      store: storeSchema.describe("Target store (default: both)"),
      dryRun: z
        .boolean()
        .optional()
        .describe("If true, only outputs result without actually saving"),
    },
  },
  handleAsoPull
);

server.registerTool(
  "aso-push",
  {
    description: "Push ASO data from local cache to App Store/Google Play.",
    inputSchema: {
      app: z.string().optional().describe("Registered app slug"),
      packageName: z.string().optional().describe("Google Play package name"),
      bundleId: z.string().optional().describe("App Store bundle ID"),
      store: storeSchema.describe("Target store (default: both)"),
      uploadImages: z
        .boolean()
        .optional()
        .describe("Whether to upload images as well"),
      dryRun: z
        .boolean()
        .optional()
        .describe("If true, only outputs result without actually pushing"),
    },
  },
  handleAsoPush
);

server.registerTool(
  "aso-translate",
  {
    description:
      "Returns text that needs translation and target locale list. LLM should perform translation directly and pass results to release-update-notes.",
    inputSchema: {
      text: z.string().describe("Source text to translate"),
      sourceLocale: z
        .string()
        .optional()
        .describe("Source locale (default: en-US)"),
      targetLocales: z
        .array(z.string())
        .optional()
        .describe(
          "Target locale array (uses store default locales if not specified)"
        ),
      store: storeSchema.describe(
        "Target store (used to determine locale list)"
      ),
    },
  },
  handleAsoTranslate
);

// ============================================================================
// Release Management (release-*)
// ============================================================================

server.registerTool(
  "release-create",
  {
    description: "Create a new version on App Store/Google Play.",
    inputSchema: {
      app: z.string().optional().describe("Registered app slug"),
      packageName: z.string().optional().describe("Google Play package name"),
      bundleId: z.string().optional().describe("App Store bundle ID"),
      version: z.string().describe("Version string to create (e.g., 1.2.0)"),
      store: storeSchema.describe("Target store (default: both)"),
      versionCodes: z
        .array(z.number())
        .optional()
        .describe("Version code array for Google Play"),
    },
  },
  handleAsoCreateVersion
);

server.registerTool(
  "release-pull-notes",
  {
    description: "Fetch release notes from App Store/Google Play.",
    inputSchema: {
      app: z.string().optional().describe("Registered app slug"),
      packageName: z.string().optional().describe("Google Play package name"),
      bundleId: z.string().optional().describe("App Store bundle ID"),
      store: storeSchema.describe("Target store (default: both)"),
      dryRun: z
        .boolean()
        .optional()
        .describe("If true, only outputs result without actually saving"),
    },
  },
  handleAsoPullReleaseNotes
);

server.registerTool(
  "release-update-notes",
  {
    description:
      "Update release notes (What's New) for App Store/Google Play version.",
    inputSchema: {
      app: z.string().optional().describe("Registered app slug"),
      packageName: z.string().optional().describe("Google Play package name"),
      bundleId: z.string().optional().describe("App Store bundle ID"),
      store: storeSchema.describe("Target store (default: both)"),
      versionId: z
        .string()
        .optional()
        .describe(
          "App Store version ID (auto-detects editable version if not specified)"
        ),
      whatsNew: z
        .record(z.string(), z.string())
        .describe(
          'Release notes by locale (e.g., { "en-US": "Bug fixes", "ko": "Bug fixes" })'
        ),
    },
  },
  handleUpdateNotes
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("MCP server failed to start", error);
  process.exit(1);
});
