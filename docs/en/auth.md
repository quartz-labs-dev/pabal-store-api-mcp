# Authentication Tools

## auth-check

Check authentication status for App Store Connect and Google Play Console.

### Parameters

| Parameter | Type                                   | Required | Default  | Description           |
| --------- | -------------------------------------- | -------- | -------- | --------------------- |
| `store`   | `"appStore" \| "googlePlay" \| "both"` | No       | `"both"` | Target store to check |

### Usage Examples

```json
// Check both stores
{}

// Check App Store only
{ "store": "appStore" }

// Check Google Play only
{ "store": "googlePlay" }
```

### Response

Returns authentication status for each store:

**Success:**

```
✅ **App Store Connect**
   Issuer ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   Key ID: XXXXXXXXXX
   JWT created successfully

✅ **Google Play Console**
   Project: your-project-id
   Service Account: your-service-account@project.iam.gserviceaccount.com
```

**Failure:**

```
❌ **App Store Connect**
   Authentication failed

❌ **Google Play Console**
   Authentication failed
```

### Prerequisites

Before using this tool, ensure you have configured credentials in `~/.config/pabal-mcp/config.json`:

```json
{
  "appStore": {
    "issuerId": "<your-issuer-id>",
    "keyId": "<your-key-id>",
    "privateKeyPath": "./app-store-key.p8"
  },
  "googlePlay": {
    "serviceAccountKeyPath": "./google-play-service-account.json"
  }
}
```

### See Also

- [Configure Credentials](../../README.md#-configure-credentials)
