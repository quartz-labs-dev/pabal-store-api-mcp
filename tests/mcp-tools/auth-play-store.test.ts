import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { handleAuthPlayStore } from "@servers/mcp/tools/auth/play-store";

describe("MCP Tool: auth-play-store", () => {
  it("should return success response when authentication is configured", async () => {
    const result = await handleAuthPlayStore();

    assert.ok(result.content);
    assert.equal(result.content.length, 1);
    assert.equal(result.content[0].type, "text");

    const textContent = result.content[0].text;
    const parsed = JSON.parse(textContent);

    if (parsed.ok) {
      // Success case: Should include service account information
      assert.equal(parsed.ok, true);
      assert.ok(parsed.client_email);
      assert.ok(parsed.project_id);
      assert.ok(typeof parsed.client_email === "string");
      assert.ok(typeof parsed.project_id === "string");
    } else {
      // Failure case: Should include error message
      assert.ok(typeof textContent === "string");
      assert.ok(
        textContent.includes("not configured") || textContent.includes("failed")
      );
    }
  });
});
