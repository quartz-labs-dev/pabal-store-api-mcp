import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import {
  DATA_DIR_ENV_KEY,
  getDataDir,
  getProjectRoot,
} from "../../packages/core/config";

const originalDataDirEnv = process.env[DATA_DIR_ENV_KEY];

beforeEach(() => {
  delete process.env[DATA_DIR_ENV_KEY];
});

after(() => {
  if (typeof originalDataDirEnv === "undefined") {
    delete process.env[DATA_DIR_ENV_KEY];
    return;
  }
  process.env[DATA_DIR_ENV_KEY] = originalDataDirEnv;
});

describe("getDataDir", () => {
  it("기본값은 프로젝트 루트 경로다", () => {
    assert.equal(getDataDir(), getProjectRoot());
  });

  it("절대 경로 환경 변수 값을 그대로 사용한다", () => {
    const absolutePath = "/tmp/pabal-mcp-data";
    process.env[DATA_DIR_ENV_KEY] = absolutePath;

    assert.equal(getDataDir(), absolutePath);
  });

  it("상대 경로 환경 변수 값은 프로젝트 루트를 기준으로 해석한다", () => {
    process.env[DATA_DIR_ENV_KEY] = "./tmp/data";
    const expected = resolve(getProjectRoot(), "tmp/data");

    assert.equal(getDataDir(), expected);
  });
});
