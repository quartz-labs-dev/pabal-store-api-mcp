import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";

const server = new McpServer(
  { name: "pabal-mcp", version: "0.0.1" },
  {
    instructions:
      "ASO를 위한 App Store/Play Store 툴들을 제공합니다. 먼저 ping으로 연결 확인 후 사용하세요.",
  },
);

// 간단한 헬스체크용 도구
server.registerTool(
  "ping",
  {
    description: "연결 확인용 헬스체크",
  },
  async () => ({
    content: [{ type: "text" as const, text: "pong" }],
  }),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("MCP server failed to start", error);
  process.exit(1);
});
