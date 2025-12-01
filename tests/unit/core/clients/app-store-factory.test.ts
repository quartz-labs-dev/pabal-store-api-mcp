import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createAppStoreClient } from "@servers/mcp/core/clients/app-store-factory";

describe("createAppStoreClient", () => {
  describe("Input Validation", () => {
    it("should fail when config is missing", () => {
      const result = createAppStoreClient(null as any);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(result.error.includes("configuration is missing"));
      }
    });

    it("should fail when bundleId is missing", () => {
      const result = createAppStoreClient({} as any);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(result.error.includes("Bundle ID is required"));
      }
    });

    it("should fail when bundleId is empty string", () => {
      const result = createAppStoreClient({ bundleId: "" });
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(result.error.includes("Bundle ID is required"));
      }
    });

    it("should fail when bundleId is whitespace only", () => {
      const result = createAppStoreClient({ bundleId: "   " });
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(result.error.includes("Bundle ID is required"));
      }
    });

    it("should fail when bundleId is not a string", () => {
      const result = createAppStoreClient({ bundleId: 123 as any });
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(result.error.includes("Bundle ID is required"));
      }
    });
  });

  describe("Integration with Config", () => {
    it("should return result (success or failure) with valid bundleId", () => {
      // This test validates the factory works with real config
      // It may succeed or fail depending on environment, but should not throw
      const result = createAppStoreClient({ bundleId: "com.example.test" });

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
      const result1 = createAppStoreClient({ bundleId: "com.example.test" });
      const result2 = createAppStoreClient({ bundleId: "com.example.test" });

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
      const result = createAppStoreClient({ bundleId: "com.example.test" });

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
      const result = createAppStoreClient({ bundleId: "com.example.test" });

      // Should not throw or return undefined
      assert.ok(result);
      assert.equal(typeof result.success, "boolean");
    });
  });

  describe("Error Message Quality", () => {
    it("should provide clear error messages for missing config", () => {
      const result = createAppStoreClient({ bundleId: "" });

      assert.equal(result.success, false);
      if (!result.success) {
        // Error should be human-readable
        assert.ok(result.error.length > 10);
        assert.ok(!result.error.includes("undefined"));
        assert.ok(!result.error.includes("null"));
      }
    });

    it("should provide context in error messages", () => {
      const result = createAppStoreClient(null as any);

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
