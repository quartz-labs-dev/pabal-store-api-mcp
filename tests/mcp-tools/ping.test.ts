import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { handlePing } from "../../servers/mcp/tools/ping";

describe("MCP Tool: ping", () => {
  it("pong 응답을 반환해야 한다", async () => {
    const result = await handlePing();

    assert.ok(result.content);
    assert.equal(result.content.length, 1);
    assert.equal(result.content[0].type, "text");
    assert.equal(result.content[0].text, "pong");
  });
});


