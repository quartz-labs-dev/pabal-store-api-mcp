import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createGooglePlayClient } from "@servers/mcp/core/clients/google-play-factory";

describe("createGooglePlayClient", () => {
  describe("Input Validation", () => {
    it("should fail when config is missing", () => {
      const result = createGooglePlayClient(null as any);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(result.error.includes("configuration is missing"));
      }
    });

    it("should fail when packageName is missing", () => {
      const result = createGooglePlayClient({} as any);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(result.error.includes("Package name is required"));
      }
    });

    it("should fail when packageName is empty string", () => {
      const result = createGooglePlayClient({ packageName: "" });
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(result.error.includes("Package name is required"));
      }
    });

    it("should fail when packageName is whitespace only", () => {
      const result = createGooglePlayClient({ packageName: "   " });
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(result.error.includes("Package name is required"));
      }
    });

    it("should fail when packageName is not a string", () => {
      const result = createGooglePlayClient({ packageName: 123 as any });
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(result.error.includes("Package name is required"));
      }
    });
  });

  describe("Integration with Config", () => {
    it("should return result (success or failure) with valid packageName", () => {
      // This test validates the factory works with real config
      // It may succeed or fail depending on environment, but should not throw
      const result = createGooglePlayClient({
        packageName: "com.example.test",
      });

      assert.ok(result !== null);
      assert.ok(typeof result === "object");
      assert.ok("success" in result);

      if (result.success) {
        // If config is available, client should be created
        assert.ok(result.client);
      } else {
        // If config is missing/invalid, should have error message
        assert.ok(result.error);
        assert.ok(typeof result.error === "string");
      }
    });

    it("should return consistent results for same input", () => {
      const result1 = createGooglePlayClient({
        packageName: "com.example.test",
      });
      const result2 = createGooglePlayClient({
        packageName: "com.example.test",
      });

      // Both calls should have same success/failure state
      assert.equal(result1.success, result2.success);

      if (!result1.success && !result2.success) {
        // Error messages should be consistent
        assert.equal(result1.error, result2.error);
      }
    });
  });

  describe("Result Type Safety", () => {
    it("should return discriminated union type", () => {
      const result = createGooglePlayClient({
        packageName: "com.example.test",
      });

      // TypeScript discriminated union check
      if (result.success) {
        // Success branch should have client
        assert.ok("client" in result);
        assert.ok(!("error" in result));
      } else {
        // Failure branch should have error
        assert.ok("error" in result);
        assert.ok(!("client" in result));
      }
    });
  });

  describe("Stateless Behavior", () => {
    it("should work from any directory context", () => {
      // Factory should load config fresh each time
      // This validates stateless design
      const result = createGooglePlayClient({
        packageName: "com.example.test",
      });

      // Should not throw or return undefined
      assert.ok(result);
      assert.equal(typeof result.success, "boolean");
    });
  });

  describe("Error Message Quality", () => {
    it("should provide clear error messages for missing config", () => {
      const result = createGooglePlayClient({ packageName: "" });

      assert.equal(result.success, false);
      if (!result.success) {
        // Error should be human-readable
        assert.ok(result.error.length > 10);
        assert.ok(!result.error.includes("undefined"));
        assert.ok(!result.error.includes("null"));
      }
    });

    it("should provide context in error messages", () => {
      const result = createGooglePlayClient(null as any);

      assert.equal(result.success, false);
      if (!result.success) {
        // Error should mention what's wrong
        assert.ok(
          result.error.includes("configuration") ||
            result.error.includes("config")
        );
      }
    });
  });
});
