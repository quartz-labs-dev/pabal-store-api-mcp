# 인증 도구

## auth-check

App Store Connect 및 Google Play Console 인증 상태를 확인합니다.

### 파라미터

| 파라미터 | 타입                                   | 필수   | 기본값   | 설명          |
| -------- | -------------------------------------- | ------ | -------- | ------------- |
| `store`  | `"appStore" \| "googlePlay" \| "both"` | 아니오 | `"both"` | 확인할 스토어 |

### 사용 예시

```json
// 모든 스토어 확인
{}

// App Store만 확인
{ "store": "appStore" }

// Google Play만 확인
{ "store": "googlePlay" }
```

### 응답

각 스토어의 인증 상태를 반환합니다:

**성공:**

```
✅ **App Store Connect**
   Issuer ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   Key ID: XXXXXXXXXX
   JWT created successfully

✅ **Google Play Console**
   Project: your-project-id
   Service Account: your-service-account@project.iam.gserviceaccount.com
```

**실패:**

```
❌ **App Store Connect**
   Authentication failed

❌ **Google Play Console**
   Authentication failed
```

### 사전 요구사항

이 도구를 사용하기 전에 `~/.config/pabal-mcp/config.json`에 자격 증명이 설정되어 있어야 합니다:

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

### 참고

- [자격 증명 설정](../../i18n/README.ko.md#-자격-증명-설정)
