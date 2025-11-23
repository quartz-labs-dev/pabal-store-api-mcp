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

const server = new McpServer(
  { name: "pabal-mcp", version: "0.0.1" },
  {
    instructions:
      "ASO를 위한 App Store/Play Store 툴들을 제공합니다. 먼저 ping으로 연결 확인 후 사용하세요.",
  }
);

// ============================================================================
// 공통 스키마
// ============================================================================

const storeSchema = z.enum(["appStore", "googlePlay", "both"]).optional();

// ============================================================================
// 헬스체크
// ============================================================================

server.registerTool(
  "ping",
  {
    description: "연결 확인용 헬스체크",
  },
  handlePing
);

// ============================================================================
// 인증 (auth-*)
// ============================================================================

server.registerTool(
  "auth-check",
  {
    description: "App Store Connect / Google Play Console 인증 상태를 확인합니다.",
    inputSchema: {
      store: storeSchema.describe("확인할 스토어 (기본값: both)"),
    },
  },
  handleAuthCheck
);

// ============================================================================
// 앱 관리 (apps-*)
// ============================================================================

server.registerTool(
  "apps-init",
  {
    description: "스토어 API에서 앱 목록을 조회하고 자동으로 등록합니다. App Store는 전체 앱 자동 등록, Google Play는 packageName 필요.",
    inputSchema: {
      store: z.enum(["appStore", "googlePlay"]).optional().describe("대상 스토어 (기본값: appStore)"),
      packageName: z.string().optional().describe("Google Play 패키지 이름 (Google Play 설정 시 필수)"),
    },
  },
  handleSetupApps
);

server.registerTool(
  "apps-add",
  {
    description: "bundleId 또는 packageName으로 개별 앱을 등록합니다. 양쪽 스토어를 자동으로 확인합니다.",
    inputSchema: {
      identifier: z.string().describe("앱 식별자 (bundleId 또는 packageName, 예: com.example.app)"),
      slug: z.string().optional().describe("커스텀 slug (미지정시 identifier의 마지막 부분 사용)"),
      store: storeSchema.describe("확인할 스토어 (기본값: both)"),
    },
  },
  handleAddApp
);

server.registerTool(
  "apps-search",
  {
    description: "등록된 앱을 검색합니다. query 없이 호출하면 모든 앱 목록을 반환합니다.",
    inputSchema: {
      query: z.string().optional().describe("검색어 (slug, bundleId, packageName, name). 비워두면 모든 앱 반환"),
      store: z.enum(["all", "appStore", "googlePlay"]).optional().describe("스토어 필터 (기본값: all)"),
    },
  },
  handleSearchApps
);

// ============================================================================
// ASO 데이터 동기화 (aso-*)
// ============================================================================

server.registerTool(
  "aso-pull",
  {
    description: "App Store/Google Play에서 ASO 데이터를 가져와 로컬 캐시에 저장합니다.",
    inputSchema: {
      app: z.string().optional().describe("등록된 앱 slug (apps-init으로 등록된 앱)"),
      packageName: z.string().optional().describe("Google Play 패키지 이름"),
      bundleId: z.string().optional().describe("App Store 번들 ID"),
      store: storeSchema.describe("대상 스토어 (기본값: both)"),
      dryRun: z.boolean().optional().describe("true면 실제 저장 없이 결과만 출력"),
    },
  },
  handleAsoPull
);

server.registerTool(
  "aso-push",
  {
    description: "로컬 캐시의 ASO 데이터를 App Store/Google Play에 푸시합니다.",
    inputSchema: {
      app: z.string().optional().describe("등록된 앱 slug"),
      packageName: z.string().optional().describe("Google Play 패키지 이름"),
      bundleId: z.string().optional().describe("App Store 번들 ID"),
      store: storeSchema.describe("대상 스토어 (기본값: both)"),
      uploadImages: z.boolean().optional().describe("이미지도 함께 업로드할지 여부"),
      dryRun: z.boolean().optional().describe("true면 실제 푸시 없이 결과만 출력"),
      cacheKey: z.string().optional().describe("캐시 키 (기본값: packageName 또는 bundleId)"),
    },
  },
  handleAsoPush
);

server.registerTool(
  "aso-translate",
  {
    description: "번역이 필요한 텍스트와 대상 로케일 목록을 반환합니다. LLM이 직접 번역을 수행한 후 결과를 release-update-notes에 전달하세요.",
    inputSchema: {
      text: z.string().describe("번역할 원본 텍스트"),
      sourceLocale: z.string().optional().describe("원본 로케일 (기본값: en-US)"),
      targetLocales: z.array(z.string()).optional().describe("대상 로케일 배열 (미지정시 스토어 기본 로케일 사용)"),
      store: storeSchema.describe("대상 스토어 (로케일 목록 결정에 사용)"),
    },
  },
  handleAsoTranslate
);

// ============================================================================
// 릴리즈 관리 (release-*)
// ============================================================================

server.registerTool(
  "release-create",
  {
    description: "App Store/Google Play에 새 버전을 생성합니다.",
    inputSchema: {
      app: z.string().optional().describe("등록된 앱 slug"),
      packageName: z.string().optional().describe("Google Play 패키지 이름"),
      bundleId: z.string().optional().describe("App Store 번들 ID"),
      version: z.string().describe("생성할 버전 문자열 (예: 1.2.0)"),
      store: storeSchema.describe("대상 스토어 (기본값: both)"),
      versionCodes: z.array(z.number()).optional().describe("Google Play용 버전 코드 배열"),
    },
  },
  handleAsoCreateVersion
);

server.registerTool(
  "release-pull-notes",
  {
    description: "App Store/Google Play에서 릴리즈 노트를 가져옵니다.",
    inputSchema: {
      app: z.string().optional().describe("등록된 앱 slug"),
      packageName: z.string().optional().describe("Google Play 패키지 이름"),
      bundleId: z.string().optional().describe("App Store 번들 ID"),
      store: storeSchema.describe("대상 스토어 (기본값: both)"),
      dryRun: z.boolean().optional().describe("true면 실제 저장 없이 결과만 출력"),
    },
  },
  handleAsoPullReleaseNotes
);

server.registerTool(
  "release-update-notes",
  {
    description: "App Store/Google Play 버전의 릴리즈 노트(What's New)를 업데이트합니다.",
    inputSchema: {
      app: z.string().optional().describe("등록된 앱 slug"),
      packageName: z.string().optional().describe("Google Play 패키지 이름"),
      bundleId: z.string().optional().describe("App Store 번들 ID"),
      store: storeSchema.describe("대상 스토어 (기본값: both)"),
      versionId: z.string().optional().describe("App Store 버전 ID (미지정시 편집 가능한 버전 자동 탐색)"),
      whatsNew: z.record(z.string(), z.string()).describe("로케일별 릴리즈 노트 (예: { \"en-US\": \"Bug fixes\", \"ko\": \"버그 수정\" })"),
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
