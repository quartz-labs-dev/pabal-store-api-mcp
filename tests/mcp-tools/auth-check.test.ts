import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { handleAuthCheck } from "@servers/mcp/tools/auth/check";

describe("MCP Tool: auth-check", () => {
  it("should check authentication status for both stores", async () => {
    const result = await handleAuthCheck({ store: "both" });

    assert.ok(result.content);
    assert.equal(result.content.length, 1);
    assert.equal(result.content[0].type, "text");

    const textContent = result.content[0].text;
    assert.ok(textContent.includes("Authentication Status"));
    // Should include App Store or Google Play section
    assert.ok(
      textContent.includes("App Store Connect") ||
        textContent.includes("Google Play Console")
    );
  });

  it("should be able to check only App Store", async () => {
    const result = await handleAuthCheck({ store: "appStore" });

    assert.ok(result.content);
    const textContent = result.content[0].text;
    assert.ok(textContent.includes("App Store Connect"));
  });

  it("should be able to check only Google Play", async () => {
    const result = await handleAuthCheck({ store: "googlePlay" });

    assert.ok(result.content);
    const textContent = result.content[0].text;
    assert.ok(textContent.includes("Google Play Console"));
  });
});
