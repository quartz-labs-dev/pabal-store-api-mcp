# pabal-mcp

A project that provides App Store / Play Store ASO workflows as MCP tools. Includes store-specific clients and `aso:*` workflows.

## Quick Start (MCP Minimal Server)

- Requirements: Node.js 18+.
- Installation: `npm install`
- Run: `npm run dev:mcp`
  - Connect from an MCP client (e.g., Claude Desktop, MCP Inspector) as a stdio server.

## Data Storage Path Configuration (MCP)

- The default path for files created by MCP tools is the repository root.
- You can change the storage path using the `PABAL_MCP_DATA_DIR` environment variable (supports both absolute and relative paths; relative paths are relative to the repo).
- Local execution example: `PABAL_MCP_DATA_DIR=/Users/user-name/Desktop/projects/terms npm run dev:mcp`
- Claude Desktop configuration example (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "pabal-mcp": {
      "command": "bash",
      "args": ["/Users/user-name/Desktop/projects/pabal-mcp/run-mcp.sh"],
      "cwd": "/Users/user-name/Desktop/projects/pabal-mcp",
      "env": {
        "PABAL_MCP_DATA_DIR": "/Users/user-name/Desktop/projects/terms"
      }
    }
  }
}
```

**Important Notes:**

- Use `bash` as the command
- Use the **absolute path** to `run-mcp.sh` in the `args`
- Set `cwd` to the **project root directory** (not the MCP server directory)

## Testing

- Run all tests: `npm test`
- Each MCP tool has a test file in the `tests/mcp-tools/` folder.
- When adding a new tool, you must also add a test file.
- For more details, see [CONTRIBUTING.md](./docs/CONTRIBUTING.md).

## Credential Configuration (secrets/ is gitignored)

- Place key/configuration files under the `secrets/` directory. Do not commit them to the repository.

### Google Play Console

1. Google Cloud Console → Create service account → Download JSON key → Save to `secrets/google-play-service-account.json`.
2. Play Console → Users and permissions → Invite service account email and grant permissions:
   - ✅ View app information
   - ✅ Manage production releases
   - ✅ Manage store listing

### App Store Connect

1. Users and Access → Integrations → App Store Connect API → Create admin key.
2. Record Issuer ID and Key ID. Save the key file (`.p8`) to `secrets/app-store-key.p8`.

### Common Configuration File (`secrets/aso-config.json`)

Configure App Store and Play Store authentication information in this file. The project reads this file to use the authentication information.

```json
{
  "googlePlay": {
    "serviceAccountKeyPath": "./secrets/google-play-service-account.json"
  },
  "appStore": {
    "issuerId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "keyId": "XXXXXXXXXX",
    "privateKeyPath": "./secrets/app-store-key.p8"
  }
}
```

## Planned Structure

- `packages/core`: Common types/errors/configuration loader.
- `packages/app-store`: App Store Connect client.
- `packages/play-store`: Play Developer API client.
- `packages/use-cases`: Common use cases such as `pull/push/prepare/create-version`.
- `servers/mcp`: MCP server entry (includes ASO tools).
- `scripts/aso`: Keep CLI scripts (`aso:*`) thin by calling use cases.

## Implementation Notes by Store

- App Store Connect (based on official documentation)
  - JWT: `kid` (Key ID), `iss` (Issuer ID), `aud` is always `appstoreconnect-v1`. Token validity maximum 20 minutes, time synchronization required.
  - Permissions: Minimum `App Manager` or role appropriate for the task required. Use team/vendor ID accurately.
  - App version status: When `prepare`/`push`, fields are allowed/blocked based on `appStoreVersions` status (e.g., `PREPARE_FOR_SUBMISSION`, `READY_FOR_SALE`).
  - Locales: Localized fields (`name`, `subtitle`, `description`, `releaseNotes`) are managed per locale. Missing locales can block submission.
  - Media assets: Screenshots/icons have strict specifications per device family. Validate specifications before upload.
  - Rate limits: When 429 occurs, comply with `Retry-After`, exponential backoff required.
- Google Play Developer API (based on official documentation)
  - Authentication: Use service account JSON (`client_email`, `private_key`). App-specific permissions must be granted in Play Console (Release Manager or higher recommended).
  - Edits workflow: Most metadata/track changes must follow the order `edits.insert -> edits.* -> edits.commit`. Changes are not reflected if `commit` is missing.
  - Tracks/releases: Use track names (`production`/`beta`/`alpha`/`internal`) accurately. Manage `userFraction` for staged rollouts.
  - Locales: Store listing fields are submitted per locale key (`en-US`, `ko-KR`, etc.). Comply with required length limits (e.g., title 50 characters).
  - App ID: Identified by package name (`com.example.app`). New apps must be created in the console first before they can be manipulated via API.

## Next Steps

1. Define common `StoreClient` interface/types.
2. Implement minimal calls (authentication/health check) for App Store/Play Store clients.
3. Add MCP tools: `aso:pull/prepare/push/create-version/pull-release-notes/extract-app-id`.
4. Connect `scripts/aso/*.ts` to call the same use cases.
