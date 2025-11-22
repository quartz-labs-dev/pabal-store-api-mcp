import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import {
  handlePing,
  handleAuthAppStore,
  handleAuthPlayStore,
} from "./tools";

const server = new McpServer(
  { name: "pabal-mcp", version: "0.0.1" },
  {
    instructions:
      "ASO를 위한 App Store/Play Store 툴들을 제공합니다. 먼저 ping으로 연결 확인 후 사용하세요.",
  }
);

// 간단한 헬스체크용 도구
server.registerTool(
  "ping",
  {
    description: "연결 확인용 헬스체크",
  },
  handlePing
);

// App Store 인증 상태 확인
server.registerTool(
  "auth-app-store",
  {
    description:
      "secrets/aso-config.json 파일의 App Store Connect 키를 확인하고 JWT를 생성해본다.",
  },
  handleAuthAppStore
);

// Google Play 인증 상태 확인 (서비스 계정 JSON 존재 여부만 확인)
server.registerTool(
  "auth-play-store",
  {
    description:
      "secrets/aso-config.json 파일의 Google Play 서비스 계정 키를 확인합니다.",
  },
  handleAuthPlayStore
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("MCP server failed to start", error);
  process.exit(1);
});
