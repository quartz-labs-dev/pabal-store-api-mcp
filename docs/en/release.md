# Release Management Tools

Tools for managing app versions and release notes on App Store Connect and Google Play Console.

## release-check-versions

Check latest versions from App Store/Google Play.

### Parameters

| Parameter     | Type                                   | Required    | Default  | Description              |
| ------------- | -------------------------------------- | ----------- | -------- | ------------------------ |
| `app`         | `string`                               | Conditional | -        | Registered app slug      |
| `bundleId`    | `string`                               | Conditional | -        | App Store bundle ID      |
| `packageName` | `string`                               | Conditional | -        | Google Play package name |
| `store`       | `"appStore" \| "googlePlay" \| "both"` | No          | `"both"` | Target store             |

### Usage Examples

```json
// Check both stores
{ "app": "myapp" }

// Check App Store only
{ "app": "myapp", "store": "appStore" }

// Check using direct identifiers
{ "bundleId": "com.example.app" }
```

### Response

```
🍎 **App Store**
   Latest: 1.2.0 (READY_FOR_DISTRIBUTION)
   Editable: 1.3.0 (PREPARE_FOR_SUBMISSION)

🤖 **Google Play**
   Production: 1.2.0 (versionCode: 120)
```

---

## release-create

Create a new version on App Store/Google Play.

### Parameters

| Parameter      | Type                                   | Required    | Default  | Description                                                             |
| -------------- | -------------------------------------- | ----------- | -------- | ----------------------------------------------------------------------- |
| `app`          | `string`                               | Conditional | -        | Registered app slug                                                     |
| `bundleId`     | `string`                               | Conditional | -        | App Store bundle ID                                                     |
| `packageName`  | `string`                               | Conditional | -        | Google Play package name                                                |
| `version`      | `string`                               | No          | -        | Version string (e.g., "1.2.0"). If not provided, shows current versions |
| `store`        | `"appStore" \| "googlePlay" \| "both"` | No          | `"both"` | Target store                                                            |
| `versionCodes` | `number[]`                             | Conditional | -        | Required for Google Play                                                |

### Usage Examples

```json
// Check current versions first (no version provided)
{ "app": "myapp" }

// Create App Store version
{ "app": "myapp", "store": "appStore", "version": "1.3.0" }

// Create Google Play version with version codes
{
  "app": "myapp",
  "store": "googlePlay",
  "version": "1.3.0",
  "versionCodes": [130, 131]
}

// Create on both stores
{
  "app": "myapp",
  "version": "1.3.0",
  "versionCodes": [130]
}
```

### Response

```
📦 Version Creation Results:
✅ App Store version 1.3.0 created (PREPARE_FOR_SUBMISSION)
✅ Google Play production draft created with versionCodes: 130, 131
```

**Errors:**

```
📦 Version Creation Results:
❌ App Store version creation failed: Version 1.3.0 already exists
⏭️  Skipping Google Play (no version codes provided)
```

---

## release-pull-notes

Fetch release notes from App Store/Google Play and save to local cache.

### Parameters

| Parameter     | Type                                   | Required    | Default  | Description                                 |
| ------------- | -------------------------------------- | ----------- | -------- | ------------------------------------------- |
| `app`         | `string`                               | Conditional | -        | Registered app slug                         |
| `bundleId`    | `string`                               | Conditional | -        | App Store bundle ID                         |
| `packageName` | `string`                               | Conditional | -        | Google Play package name                    |
| `store`       | `"appStore" \| "googlePlay" \| "both"` | No          | `"both"` | Target store                                |
| `dryRun`      | `boolean`                              | No          | `false`  | If true, only outputs result without saving |

### Usage Examples

```json
// Pull from both stores
{ "app": "myapp" }

// Pull from Google Play only
{ "app": "myapp", "store": "googlePlay" }

// Dry run
{ "app": "myapp", "dryRun": true }
```

### Data Storage

```
{dataDir}/.aso/pull/{slug}/
├── app-store/
│   └── release-notes.json
└── google-play/
    └── release-notes.json
```

### Response

```
✅ Release notes pulled
   Google Play: 5 versions
   App Store: 3 versions
```

---

## release-update-notes

Update release notes (What's New) for App Store/Google Play versions.

### Parameters

| Parameter      | Type                                   | Required    | Default     | Description                                          |
| -------------- | -------------------------------------- | ----------- | ----------- | ---------------------------------------------------- |
| `app`          | `string`                               | Conditional | -           | Registered app slug                                  |
| `bundleId`     | `string`                               | Conditional | -           | App Store bundle ID                                  |
| `packageName`  | `string`                               | Conditional | -           | Google Play package name                             |
| `store`        | `"appStore" \| "googlePlay" \| "both"` | No          | `"both"`    | Target store                                         |
| `versionId`    | `string`                               | No          | Auto-detect | App Store version ID (auto-detects editable version) |
| `whatsNew`     | `Record<string, string>`               | Conditional | -           | Release notes by locale                              |
| `text`         | `string`                               | Conditional | -           | Source text to translate to all supported languages  |
| `sourceLocale` | `string`                               | No          | `"en-US"`   | Source locale for translation                        |

> **Note:** Provide either `whatsNew` (all translations) or `text` (source to translate).

### Usage Examples

**Option 1: Provide all translations**

```json
{
  "app": "myapp",
  "whatsNew": {
    "en-US": "Bug fixes and improvements",
    "ko": "버그 수정 및 개선",
    "ja": "バグ修正と改善"
  }
}
```

**Option 2: Provide source text for translation**

```json
{
  "app": "myapp",
  "text": "Bug fixes and improvements",
  "sourceLocale": "en-US"
}
```

When using `text`, the tool will return a translation request:

```
🌐 Translation Required

**Source Text** (en-US):
Bug fixes and improvements

**App Store Supported Locales** (3):
en-US, ko, ja

**Google Play Supported Locales** (3):
en-US, ko, ja

**Instructions**:
Please translate the text to all target locales and call this function
again with the `whatsNew` parameter containing all translations.
```

### Response

```
📝 Release Notes Update Results:

**🍎 App Store:**
  ✅ Updated 3 locales
    • en-US: Bug fixes and improvements
    • ko: 버그 수정 및 개선
    • ja: バグ修正と改善

**🤖 Google Play:**
  ✅ Updated 3 locales
    • en-US: Bug fixes and improvements
    • ko: 버그 수정 및 개선
    • ja: バグ修正と改善
```

### Translation Pipeline

When partial translations are provided, the tool guides you through a translation pipeline:

1. **Step 1**: If provided text is not in `sourceLocale`, requests translation to source locale first
2. **Step 2**: Requests translation from source locale to all missing supported locales
3. **Final**: When all translations are provided, updates stores

---

## Version States

### App Store

| State                       | Description                          |
| --------------------------- | ------------------------------------ |
| `PREPARE_FOR_SUBMISSION`    | Editable, not yet submitted          |
| `WAITING_FOR_REVIEW`        | Submitted, awaiting review           |
| `IN_REVIEW`                 | Currently being reviewed             |
| `PENDING_DEVELOPER_RELEASE` | Approved, waiting for manual release |
| `READY_FOR_DISTRIBUTION`    | Live on App Store                    |
| `REJECTED`                  | Review rejected                      |

### Google Play

| Track        | Description            |
| ------------ | ---------------------- |
| `internal`   | Internal testing track |
| `alpha`      | Closed testing track   |
| `beta`       | Open testing track     |
| `production` | Live on Play Store     |

---

## Workflow Example

### Complete Release Workflow

1. **Check current versions:**

   ```json
   { "app": "myapp" }
   ```

2. **Create new version:**

   ```json
   {
     "app": "myapp",
     "version": "1.3.0",
     "versionCodes": [130]
   }
   ```

3. **Update release notes:**

   ```json
   {
     "app": "myapp",
     "whatsNew": {
       "en-US": "• New feature A\n• Bug fixes",
       "ko": "• 새로운 기능 A\n• 버그 수정"
     }
   }
   ```

4. **Verify:**
   ```json
   { "app": "myapp" }
   ```

## See Also

- [apps-add](./apps.md#apps-add) - Register apps before using release tools
- [aso-push](./aso.md#aso-push) - Update full ASO metadata
