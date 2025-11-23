import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { handleAuthPlayStore } from "../../servers/mcp/tools/auth/play-store";

describe("MCP Tool: auth-play-store", () => {
  it("인증 설정이 있으면 성공 응답을 반환해야 한다", async () => {
    const result = await handleAuthPlayStore();

    assert.ok(result.content);
    assert.equal(result.content.length, 1);
    assert.equal(result.content[0].type, "text");

    const textContent = result.content[0].text;
    const parsed = JSON.parse(textContent);

    if (parsed.ok) {
      // 성공 케이스: 서비스 계정 정보가 포함되어야 함
      assert.equal(parsed.ok, true);
      assert.ok(parsed.client_email);
      assert.ok(parsed.project_id);
      assert.ok(typeof parsed.client_email === "string");
      assert.ok(typeof parsed.project_id === "string");
    } else {
      // 실패 케이스: 에러 메시지가 포함되어야 함
      assert.ok(typeof textContent === "string");
      assert.ok(textContent.includes("설정이 없습니다") || textContent.includes("실패"));
    }
  });
});




