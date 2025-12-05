# pabal-mcp — App Store / Play Store ASO용 MCP 서버

앱스토어와 플레이스토어 메타데이터, 릴리스, ASO 동기화를 MCP 도구로 제공합니다. Claude Code, Cursor, MCP Inspector 같은 MCP 클라이언트에서 stdio 서버로 실행해 바로 사용할 수 있습니다.

## ✅ 한눈에 보기

- 두 스토어 ASO 풀/푸시를 한 곳에서 처리
- 로컬 캐시에 기반한 반복 가능 워크플로
- 릴리스 노트와 버전 체크를 AI 클라이언트 안에서 실행

## 🛠️ 빠른 시작

1. Node.js 18+ 필요
2. 의존성 설치: `yarn install`
3. `secrets/`(gitignore 됨)에 자격 증명 추가
   - App Store Connect: `secrets/app-store-key.p8` 저장, Issuer ID와 Key ID 기록
   - Google Play Console: `secrets/google-play-service-account.json` 저장, 스토어 접근 권한 확인
4. `secrets/aso-config.json` 생성:

```json
{
  "dataDir": "/path/to/data/directory",
  "appStore": {
    "issuerId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "keyId": "XXXXXXXXXX",
    "privateKeyPath": "./secrets/app-store-key.p8"
  },
  "googlePlay": {
    "serviceAccountKeyPath": "./secrets/google-play-service-account.json"
  }
}
```

데이터 디렉터리 기본값은 프로젝트 루트입니다. `secrets/aso-config.json`의 `dataDir`(절대/상대 경로) 또는 환경 변수 `PABAL_MCP_DATA_DIR`로 바꿀 수 있습니다. 우선순위: config > env > 루트.

## 🛠️ 설치

### 요구 사항

- Node.js 18 이상
- MCP 클라이언트: Cursor, Claude Code, VS Code, Windsurf 등
- App Store / Google Play 자격 증명 + `secrets/aso-config.json` (또는 데이터 디렉터리를 가리키는 `PABAL_MCP_DATA_DIR`)

> [!TIP]
> ASO/스토어 작업을 자주 한다면 MCP 클라이언트 규칙에 “항상 pabal-mcp 사용” 같은 자동 호출 규칙을 추가해 매번 입력하지 않게 설정하세요.

<details>
<summary><b>Cursor에 설치</b></summary>

- 원클릭: [![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=pabal-mcp&config=eyJjb21tYW5kIjoibnB4IC15IHBhYmFsLW1jcEBsYXRlc3QifQ%3D%3D)
- 또는 `~/.cursor/mcp.json`(글로벌)이나 프로젝트 `.cursor/mcp.json`에 추가:

```json
{
  "mcpServers": {
    "pabal-mcp": {
      "command": "bash",
      "args": ["/ABSOLUTE/PATH/TO/pabal-mcp/run-mcp.sh"],
      "cwd": "/ABSOLUTE/PATH/TO/pabal-mcp",
      "env": {
        "PABAL_MCP_DATA_DIR": "/ABSOLUTE/PATH/TO/data"
      }
    }
  }
}
```

`run-mcp.sh`를 사용하면 프로젝트 루트 기준으로 TypeScript 경로가 올바르게 잡힙니다. `PABAL_MCP_DATA_DIR`는 선택 사항이며, config 파일의 `dataDir`가 더 높은 우선순위를 가집니다.

</details>

<details>
<summary><b>VS Code에 설치</b></summary>

[<img alt="Install in VS Code (npx)" src="https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20pabal-mcp&color=0098FF">](https://insiders.vscode.dev/redirect?url=vscode%3Amcp%2Finstall%3F%7B%22name%22%3A%22pabal-mcp%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22pabal-mcp%40latest%22%5D%7D)

`settings.json` MCP 섹션 예시(로컬 실행):

```json
"mcp": {
  "servers": {
    "pabal-mcp": {
      "type": "stdio",
      "command": "bash",
      "args": ["/ABSOLUTE/PATH/TO/pabal-mcp/run-mcp.sh"],
      "env": {
        "PABAL_MCP_DATA_DIR": "/ABSOLUTE/PATH/TO/data"
      }
    }
  }
}
```

패키지 실행을 원하면 `command`를 `npx`, `args`를 `["-y", "pabal-mcp@latest"]`로 바꾸세요.

</details>

<details>
<summary><b>Claude Code에 설치</b></summary>

로컬(bash) 실행:

```sh
claude mcp add pabal-mcp -- bash /ABSOLUTE/PATH/TO/pabal-mcp/run-mcp.sh
```

배포 패키지(npx):

```sh
claude mcp add pabal-mcp -- npx -y pabal-mcp@latest
```

데이터 디렉터리를 환경 변수로 넘기려면 `--env PABAL_MCP_DATA_DIR=/ABSOLUTE/PATH/TO/data`를 추가하세요.

</details>

<details>
<summary><b>Windsurf에 설치</b></summary>

```json
{
  "mcpServers": {
    "pabal-mcp": {
      "command": "bash",
      "args": ["/ABSOLUTE/PATH/TO/pabal-mcp/run-mcp.sh"],
      "env": {
        "PABAL_MCP_DATA_DIR": "/ABSOLUTE/PATH/TO/data"
      }
    }
  }
}
```

`command`/`args`를 `npx` + `pabal-mcp@latest`로 교체하면 바로 패키지를 실행할 수 있습니다.

</details>

> 다른 MCP 클라이언트도 `command`/`args`에 `run-mcp.sh` 또는 `npx -y pabal-mcp@latest`를 지정하는 방식으로 대부분 동일하게 설정할 수 있습니다.

## 🚀 서버 실행

- 로컬 개발: `npm run dev:mcp` (프로젝트 루트에서 stdio MCP 서버 실행)
- MCP 클라이언트 설정 시 `run-mcp.sh` 래퍼 사용 예시(Claude Desktop):

```json
{
  "mcpServers": {
    "pabal-mcp": {
      "command": "bash",
      "args": ["/Users/you/path/to/pabal-mcp/run-mcp.sh"],
      "cwd": "/Users/you/path/to/pabal-mcp"
    }
  }
}
```

환경 변수 대신 `secrets/aso-config.json`의 `dataDir`를 권장합니다. 필요하면 MCP 클라이언트 설정 `env` 블록에 `PABAL_MCP_DATA_DIR`를 추가하세요.

## 🔧 MCP 도구

- 인증
  - `auth-check`: App Store Connect / Google Play 인증 상태 확인 (`store`: appStore | googlePlay | both)
- 앱 관리
  - `apps-init`: 스토어 API에서 앱을 가져와 자동 등록 (Google Play는 `packageName` 필요)
  - `apps-add`: bundleId/packageName(`identifier`)로 단일 앱 등록, `slug`/`store` 옵션
  - `apps-search`: 앱 검색 (`query`, 선택적 `store`)
- ASO 동기화
  - `aso-pull`: ASO 데이터를 로컬 캐시에 가져오기 (`app`/`bundleId`/`packageName`, 선택적 `store`, `dryRun`)
  - `aso-push`: 캐시된 ASO를 스토어에 반영 (동일한 타겟 옵션, 선택적 `uploadImages`, `dryRun`)
- 릴리스 관리
  - `release-check-versions`: 앱별 최신 버전 조회
  - `release-create`: 새 버전 생성 (`version`, Google Play의 `versionCodes`, 표준 타겟 옵션)
  - `release-pull-notes`: 릴리스 노트를 로컬 캐시에 가져오기 (`dryRun` 지원)
  - `release-update-notes`: 릴리스 노트/What’s New 업데이트 (`whatsNew` 맵 또는 `text`+`sourceLocale`, 표준 타겟팅)

현재 도구 목록은 `npm run tools`로 직접 확인할 수 있습니다.

## ✅ 테스트

- 전체 테스트 실행: `npm test`
