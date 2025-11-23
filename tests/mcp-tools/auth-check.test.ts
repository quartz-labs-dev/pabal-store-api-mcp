import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { handleAuthCheck } from "../../servers/mcp/tools/auth/check";

describe("MCP Tool: auth-check", () => {
  it("양쪽 스토어 인증 상태를 확인해야 한다", async () => {
    const result = await handleAuthCheck({ store: "both" });

    assert.ok(result.content);
    assert.equal(result.content.length, 1);
    assert.equal(result.content[0].type, "text");

    const textContent = result.content[0].text;
    assert.ok(textContent.includes("인증 상태"));
    // App Store 또는 Google Play 섹션이 포함되어야 함
    assert.ok(
      textContent.includes("App Store Connect") ||
        textContent.includes("Google Play Console")
    );
  });

  it("App Store만 확인할 수 있어야 한다", async () => {
    const result = await handleAuthCheck({ store: "appStore" });

    assert.ok(result.content);
    const textContent = result.content[0].text;
    assert.ok(textContent.includes("App Store Connect"));
  });

  it("Google Play만 확인할 수 있어야 한다", async () => {
    const result = await handleAuthCheck({ store: "googlePlay" });

    assert.ok(result.content);
    const textContent = result.content[0].text;
    assert.ok(textContent.includes("Google Play Console"));
  });
});
