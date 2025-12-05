![Cover](public/cover.gif)

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=pabal-mcp&config=eyJjb21tYW5kIjoibnB4IC15IHBhYmFsLW1jcEBsYXRlc3QifQ%3D%3D) [<img alt="Install in VS Code (npx)" src="https://img.shields.io/badge/Install%20in%20VS%20Code-0098FF?style=for-the-badge&logo=visualstudiocode&logoColor=white">](https://insiders.vscode.dev/redirect?url=vscode%3Amcp%2Finstall%3F%7B%22name%22%3A%22pabal-mcp%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22pabal-mcp%40latest%22%5D%7D)

[![한국어 문서](https://img.shields.io/badge/docs-한국어-green)](./i18n/README.ko.md)

# pabal-mcp — MCP server for App Store / Play Store ASO

Up-to-date ASO workflows exposed as MCP tools. Run it as a stdio MCP server (Claude Code, Cursor, MCP Inspector, etc.) to manage metadata, releases, and store syncs without leaving your AI client.

## ❌ Without pabal-mcp

- Manual App Store Connect and Google Play Console clicks for every update
- Copy-paste errors across locales and release notes
- Repeating the same setup per client or project

## ✅ With pabal-mcp

- One MCP server that handles ASO pulls/pushes for both stores
- Consistent release note updates and version checks from your AI client
- Reusable, scriptable workflows backed by local cache and config

## 🛠️ Quick Setup

1. Requirements: Node.js 18+
2. Install dependencies: `yarn install`
3. Add credentials under `secrets/` (gitignored):
   - App Store Connect: save the API key file as `secrets/app-store-key.p8`, and note the Issuer ID and Key ID.
   - Google Play Console: save the service account JSON as `secrets/google-play-service-account.json` and ensure the account has store access.
   - `secrets/aso-config.json` pointing to the credential files:

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

Data directory: by default, files are written to the project root. Override with `dataDir` in `secrets/aso-config.json` (absolute or repo-relative) or `PABAL_MCP_DATA_DIR` environment variable. Priority: config file > environment variable > project root.

## 🛠️ Installation

### Requirements

- Node.js >= 18
- MCP client: Cursor, Claude Code, VS Code, Windsurf, etc.
- App Store / Google Play credentials + `secrets/aso-config.json` (or `PABAL_MCP_DATA_DIR` pointing to your data dir)

> [!TIP]
> If you repeatedly do ASO/store tasks, add a client rule like “always use pabal-mcp” so the MCP server auto-invokes without typing it every time.

<details>
<summary><b>Install in Cursor</b></summary>

- One-click: [![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=pabal-mcp&config=eyJjb21tYW5kIjoibnB4IC15IHBhYmFsLW1jcEBsYXRlc3QifQ%3D%3D)
- Or add to `~/.cursor/mcp.json` (global) or project `.cursor/mcp.json`:

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

`run-mcp.sh` keeps TypeScript paths resolved from the repo root. `PABAL_MCP_DATA_DIR` is optional; `dataDir` in the config file has higher priority.

</details>

<details>
<summary><b>Install in VS Code</b></summary>

[<img alt="Install in VS Code (npx)" src="https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20pabal-mcp&color=0098FF">](https://insiders.vscode.dev/redirect?url=vscode%3Amcp%2Finstall%3F%7B%22name%22%3A%22pabal-mcp%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22pabal-mcp%40latest%22%5D%7D)

Example `settings.json` MCP section (local project run):

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

Switch `command` to `npx` and `args` to `["-y", "pabal-mcp@latest"]` to run the published package instead.

</details>

<details>
<summary><b>Install in Claude Code</b></summary>

Local (bash) run:

```sh
claude mcp add pabal-mcp -- bash /ABSOLUTE/PATH/TO/pabal-mcp/run-mcp.sh
```

Published package (npx):

```sh
claude mcp add pabal-mcp -- npx -y pabal-mcp@latest
```

If you need the data directory via env, add `--env PABAL_MCP_DATA_DIR=/ABSOLUTE/PATH/TO/data`.

</details>

<details>
<summary><b>Install in Windsurf</b></summary>

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

You can swap `command`/`args` to `npx` + `pabal-mcp@latest` for direct package execution.

</details>

> 다른 MCP 클라이언트도 대부분 위와 비슷하게 `command`/`args`에 `run-mcp.sh` 또는 `npx -y pabal-mcp@latest`를 지정하면 됩니다.

## 🚀 Run the MCP Server

- Local development: `npm run dev:mcp` (starts a stdio MCP server in the project root).
- From an MCP client, use the `run-mcp.sh` wrapper so paths resolve correctly. Example Claude Desktop config:

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

You can set `dataDir` in `secrets/aso-config.json` instead of environment variables. If you prefer env vars, set `PABAL_MCP_DATA_DIR` in the `env` block of your MCP client config.

## 🔧 MCP Tools

- Authentication
  - `auth-check`: Check App Store Connect / Google Play authentication (`store`: appStore | googlePlay | both).
- App management
  - `apps-init`: Fetch apps from the store API and auto-register them. For Google Play, provide `packageName`.
  - `apps-add`: Register a single app by bundleId/packageName (`identifier`), with optional `slug` and `store`.
  - `apps-search`: Search registered apps (`query`) with optional `store` filter.
- ASO data sync
  - `aso-pull`: Fetch ASO data to the local cache (`app`/`bundleId`/`packageName`, optional `store`, `dryRun`).
  - `aso-push`: Push cached ASO data to the stores (same targeting options, optional `uploadImages`, `dryRun`).
- Release management
  - `release-check-versions`: Show the latest versions per store for the specified app.
  - `release-create`: Create a new version; accepts `version`, `versionCodes` (for Google Play), and standard app targeting options.
  - `release-pull-notes`: Retrieve release notes to the local cache (`dryRun` supported).
  - `release-update-notes`: Update release notes/what's new (`whatsNew` map or `text`+`sourceLocale`, standard targeting).

Run `npm run tools` to print the current tool list directly from the server code.

## ✅ Testing

- Run all tests: `npm test`
