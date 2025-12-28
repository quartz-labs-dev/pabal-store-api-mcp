# 앱 관리 도구

App Store Connect와 Google Play Console에서 앱을 등록하고 관리하는 도구입니다.

## apps-init

스토어 API에서 앱을 가져와 자동 등록합니다.

### 파라미터

| 파라미터      | 타입                         | 필수   | 기본값       | 설명                               |
| ------------- | ---------------------------- | ------ | ------------ | ---------------------------------- |
| `store`       | `"appStore" \| "googlePlay"` | 아니오 | `"appStore"` | 대상 스토어                        |
| `packageName` | `string`                     | 조건부 | -            | `store`가 `"googlePlay"`일 때 필수 |

### 사용 예시

```json
// App Store 앱 자동 등록
{ "store": "appStore" }

// Google Play 앱 등록 (packageName 필수)
{ "store": "googlePlay", "packageName": "com.example.app" }
```

### 동작 방식

- **App Store**: 출시된 모든 앱을 조회하여 자동 등록
- **Google Play**: 앱 목록 조회를 지원하지 않으므로 `packageName`을 명시해야 함
- 각 앱에 대해 bundleId/packageName의 마지막 부분으로 slug 생성 (예: `com.example.myapp` → `myapp`)
- 두 스토어가 설정된 경우, App Store 앱에 대해 Google Play 존재 여부도 확인

### 응답

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

bundleId 또는 packageName으로 단일 앱을 등록합니다.

### 파라미터

| 파라미터     | 타입                                   | 필수   | 기본값    | 설명                                  |
| ------------ | -------------------------------------- | ------ | --------- | ------------------------------------- |
| `identifier` | `string`                               | **예** | -         | 앱 식별자 (bundleId 또는 packageName) |
| `slug`       | `string`                               | 아니오 | 자동 생성 | 앱의 커스텀 slug                      |
| `store`      | `"appStore" \| "googlePlay" \| "both"` | 아니오 | `"both"`  | 검색할 스토어                         |

### 사용 예시

```json
// 앱 등록 (모든 스토어 검색)
{ "identifier": "com.example.app" }

// 커스텀 slug로 등록
{ "identifier": "com.example.app", "slug": "myapp" }

// Google Play만 등록
{ "identifier": "com.example.app", "store": "googlePlay" }
```

### 동작 방식

- 지정된 스토어에서 앱 검색
- slug가 제공되지 않으면 identifier의 마지막 부분으로 자동 생성
- 각 스토어의 지원 언어 정보를 가져와 저장
- 앱이 이미 존재하면 언어 정보 업데이트

### 응답

**신규 등록:**

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

**이미 등록됨:**

```
⏭️ App is already registered.

• Slug: `myapp`
• Name: My App
• App Store: ✅ com.example.app
• Google Play: ✅ com.example.app
```

---

## apps-search

등록된 앱을 검색합니다.

### 파라미터

| 파라미터 | 타입                                  | 필수   | 기본값  | 설명                                                                |
| -------- | ------------------------------------- | ------ | ------- | ------------------------------------------------------------------- |
| `query`  | `string`                              | 아니오 | -       | 검색어 (slug, bundleId, packageName, 이름). 비어있으면 모든 앱 반환 |
| `store`  | `"all" \| "appStore" \| "googlePlay"` | 아니오 | `"all"` | 스토어 필터                                                         |

### 사용 예시

```json
// 모든 등록된 앱 조회
{}

// 이름 또는 slug로 검색
{ "query": "myapp" }

// 스토어로 필터링
{ "store": "appStore" }

// 검색어와 스토어 필터 함께 사용
{ "query": "example", "store": "googlePlay" }
```

### 응답

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

**결과 없음:**

```
❌ No apps found matching "query".

💡 Register apps using apps-add or apps-init tools.
```

---

## 등록된 앱 저장소

앱은 `~/.config/pabal-mcp/registered-apps.json`에 저장됩니다:

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

## 참고

- [auth-check](./auth.md) - 스토어 자격 증명 확인
- [aso-pull](./aso.md#aso-pull) - 등록된 앱의 ASO 데이터 가져오기
