# 기여 가이드

## MCP 도구 추가하기

새로운 MCP 도구를 추가할 때는 다음 단계를 따르세요:

### 1. 도구 핸들러 함수 작성

`servers/mcp/tools/` 폴더에 새 파일을 생성하고 핸들러 함수를 작성합니다.

예시: `servers/mcp/tools/my-new-tool.ts`

```typescript
/**
 * 새 도구 설명
 */
export async function handleMyNewTool() {
  // 도구 로직 구현
  return {
    content: [
      {
        type: "text" as const,
        text: "결과",
      },
    ],
  };
}
```

### 2. 도구 핸들러 export

`servers/mcp/tools/index.ts`에 새로운 핸들러를 export합니다:

```typescript
export * from "./my-new-tool";
```

### 3. MCP 서버에 도구 등록

`servers/mcp/index.ts`에서 도구를 등록합니다:

```typescript
import { handleMyNewTool } from "./tools";

server.registerTool(
  "my-new-tool",
  {
    description: "도구 설명",
  },
  handleMyNewTool
);
```

### 4. 테스트 파일 작성

`tests/mcp-tools/` 폴더에 테스트 파일을 생성합니다.

예시: `tests/mcp-tools/my-new-tool.test.ts`

```typescript
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { handleMyNewTool } from "../../servers/mcp/tools/my-new-tool";

describe("MCP Tool: my-new-tool", () => {
  it("예상된 응답을 반환해야 한다", async () => {
    const result = await handleMyNewTool();

    assert.ok(result.content);
    assert.equal(result.content.length, 1);
    assert.equal(result.content[0].type, "text");
    // 추가 검증 로직
  });
});
```

### 5. 테스트 실행

```bash
# 모든 테스트 실행
npm test

# 특정 테스트 파일만 실행
npm test -- tests/mcp-tools/my-new-tool.test.ts
```

## 테스트 구조

- `tests/`: 모든 테스트 파일
  - `mcp-tools/`: MCP 도구별 테스트
  - 기타 유닛 테스트

모든 테스트는 Node.js 내장 테스트 러너(`node:test`)를 사용합니다.

## 기존 도구 목록

- `ping`: 연결 확인용 헬스체크
- `auth-app-store`: App Store 인증 상태 확인
- `auth-play-store`: Play Store 인증 상태 확인

