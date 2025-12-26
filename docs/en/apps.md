# App Management Tools

Tools for registering and managing apps from App Store Connect and Google Play Console.

## apps-init

Fetch apps from the store API and auto-register them.

### Parameters

| Parameter     | Type                         | Required    | Default      | Description                             |
| ------------- | ---------------------------- | ----------- | ------------ | --------------------------------------- |
| `store`       | `"appStore" \| "googlePlay"` | No          | `"appStore"` | Target store                            |
| `packageName` | `string`                     | Conditional | -            | Required when `store` is `"googlePlay"` |

### Usage Examples

```json
// Auto-register all App Store apps
{ "store": "appStore" }

// Register a Google Play app (packageName required)
{ "store": "googlePlay", "packageName": "com.example.app" }
```

### Behavior

- **App Store**: Lists all released apps and auto-registers them
- **Google Play**: Does not support listing; requires explicit `packageName`
- For each app, generates a slug from the last part of bundleId/packageName (e.g., `com.example.myapp` → `myapp`)
- If both stores are configured, checks Google Play availability for App Store apps

### Response

```
📱 **App Setup Complete**

✅ **Registered** (2):
  • My App (🍎+🤖) → slug: "myapp"
    🍎 App Store: en-US, ko, ja
    🤖 Google Play: en-US, ko, ja

⏭️ **Skipped** (1):
  • Other App (com.example.other) - already registered
```

---

## apps-add

Register a single app by bundleId or packageName.

### Parameters

| Parameter    | Type                                   | Required | Default        | Description                              |
| ------------ | -------------------------------------- | -------- | -------------- | ---------------------------------------- |
| `identifier` | `string`                               | **Yes**  | -              | App identifier (bundleId or packageName) |
| `slug`       | `string`                               | No       | Auto-generated | Custom slug for the app                  |
| `store`      | `"appStore" \| "googlePlay" \| "both"` | No       | `"both"`       | Store to search                          |

### Usage Examples

```json
// Register app (searches both stores)
{ "identifier": "com.example.app" }

// Register with custom slug
{ "identifier": "com.example.app", "slug": "myapp" }

// Register Google Play only
{ "identifier": "com.example.app", "store": "googlePlay" }
```

### Behavior

- Searches specified store(s) for the app
- Auto-generates slug from the last part of identifier if not provided
- Fetches and stores supported locales for each store
- If app already exists, updates locale information

### Response

**New Registration:**

```
✅ App registration complete (🍎+🤖)

**Registration Info:**
• Slug: `myapp`
• Name: My App
• App Store: com.example.app (ID: 123456789)
• Google Play: com.example.app

**Supported Languages:**
  • App Store locales: en-US, ko, ja
  • Google Play locales: en-US, ko, ja

**Search Results:**
  • 🍎 App Store: ✅ Found (My App) (3 locales)
  • 🤖 Google Play: ✅ Found (My App) (3 locales)

You can now reference this app in other tools using the `app: "myapp"` parameter.
```

**Already Registered:**

```
⏭️ App is already registered.

• Slug: `myapp`
• Name: My App
• App Store: ✅ com.example.app
• Google Play: ✅ com.example.app
```

---

## apps-search

Search registered apps.

### Parameters

| Parameter | Type                                  | Required | Default | Description                                                                |
| --------- | ------------------------------------- | -------- | ------- | -------------------------------------------------------------------------- |
| `query`   | `string`                              | No       | -       | Search term (slug, bundleId, packageName, name). Returns all apps if empty |
| `store`   | `"all" \| "appStore" \| "googlePlay"` | No       | `"all"` | Filter by store                                                            |

### Usage Examples

```json
// List all registered apps
{}

// Search by name or slug
{ "query": "myapp" }

// Filter by store
{ "store": "appStore" }

// Search with store filter
{ "query": "example", "store": "googlePlay" }
```

### Response

```
📋 Registered app list: 2

📱 **My App** (`myapp`)
   🍎 App Store: `com.example.myapp`
      App ID: 123456789
   🤖 Google Play: `com.example.myapp`

📱 **Other App** (`other`)
   🍎 App Store: `com.example.other`
      App ID: 987654321
```

**No Results:**

```
❌ No apps found matching "query".

💡 Register apps using apps-add or apps-init tools.
```

---

## Registered Apps Storage

Apps are stored in `~/.config/pabal-mcp/registered-apps.json`:

```json
{
  "apps": [
    {
      "slug": "myapp",
      "name": "My App",
      "appStore": {
        "bundleId": "com.example.myapp",
        "appId": "123456789",
        "name": "My App",
        "supportedLocales": ["en-US", "ko", "ja"]
      },
      "googlePlay": {
        "packageName": "com.example.myapp",
        "name": "My App",
        "supportedLocales": ["en-US", "ko", "ja"]
      }
    }
  ]
}
```

## See Also

- [auth-check](./auth.md) - Verify store credentials
- [aso-pull](./aso.md#aso-pull) - Pull ASO data for registered apps
