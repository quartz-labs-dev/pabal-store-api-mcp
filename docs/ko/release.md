# 릴리스 관리 도구

App Store Connect와 Google Play Console에서 앱 버전과 릴리스 노트를 관리하는 도구입니다.

## release-check-versions

App Store/Google Play에서 최신 버전을 확인합니다.

### 파라미터

| 파라미터      | 타입                                   | 필수   | 기본값   | 설명                 |
| ------------- | -------------------------------------- | ------ | -------- | -------------------- |
| `app`         | `string`                               | 조건부 | -        | 등록된 앱 slug       |
| `bundleId`    | `string`                               | 조건부 | -        | App Store 번들 ID    |
| `packageName` | `string`                               | 조건부 | -        | Google Play 패키지명 |
| `store`       | `"appStore" \| "googlePlay" \| "both"` | 아니오 | `"both"` | 대상 스토어          |

### 사용 예시

```json
// 모든 스토어 확인
{ "app": "myapp" }

// App Store만 확인
{ "app": "myapp", "store": "appStore" }

// 직접 식별자 사용
{ "bundleId": "com.example.app" }
```

### 응답

```
🍎 **App Store**
   Latest: 1.2.0 (READY_FOR_DISTRIBUTION)
   Editable: 1.3.0 (PREPARE_FOR_SUBMISSION)

🤖 **Google Play**
   Production: 1.2.0 (versionCode: 120)
```

---

## release-create

App Store/Google Play에 새 버전을 생성합니다.

### 파라미터

| 파라미터       | 타입                                   | 필수   | 기본값   | 설명                                               |
| -------------- | -------------------------------------- | ------ | -------- | -------------------------------------------------- |
| `app`          | `string`                               | 조건부 | -        | 등록된 앱 slug                                     |
| `bundleId`     | `string`                               | 조건부 | -        | App Store 번들 ID                                  |
| `packageName`  | `string`                               | 조건부 | -        | Google Play 패키지명                               |
| `version`      | `string`                               | 아니오 | -        | 버전 문자열 (예: "1.2.0"). 미제공시 현재 버전 표시 |
| `store`        | `"appStore" \| "googlePlay" \| "both"` | 아니오 | `"both"` | 대상 스토어                                        |
| `versionCodes` | `number[]`                             | 조건부 | -        | Google Play에 필요                                 |

### 사용 예시

```json
// 현재 버전 먼저 확인 (version 미제공)
{ "app": "myapp" }

// App Store 버전 생성
{ "app": "myapp", "store": "appStore", "version": "1.3.0" }

// Google Play 버전 생성 (version codes 포함)
{
  "app": "myapp",
  "store": "googlePlay",
  "version": "1.3.0",
  "versionCodes": [130, 131]
}

// 모든 스토어에 생성
{
  "app": "myapp",
  "version": "1.3.0",
  "versionCodes": [130]
}
```

### 응답

```
📦 Version Creation Results:
✅ App Store version 1.3.0 created (PREPARE_FOR_SUBMISSION)
✅ Google Play production draft created with versionCodes: 130, 131
```

**에러:**

```
📦 Version Creation Results:
❌ App Store version creation failed: Version 1.3.0 already exists
⏭️  Skipping Google Play (no version codes provided)
```

---

## release-pull-notes

App Store/Google Play에서 릴리스 노트를 가져와 로컬 캐시에 저장합니다.

### 파라미터

| 파라미터      | 타입                                   | 필수   | 기본값   | 설명                           |
| ------------- | -------------------------------------- | ------ | -------- | ------------------------------ |
| `app`         | `string`                               | 조건부 | -        | 등록된 앱 slug                 |
| `bundleId`    | `string`                               | 조건부 | -        | App Store 번들 ID              |
| `packageName` | `string`                               | 조건부 | -        | Google Play 패키지명           |
| `store`       | `"appStore" \| "googlePlay" \| "both"` | 아니오 | `"both"` | 대상 스토어                    |
| `dryRun`      | `boolean`                              | 아니오 | `false`  | true이면 저장 없이 결과만 출력 |

### 사용 예시

```json
// 모든 스토어에서 가져오기
{ "app": "myapp" }

// Google Play만 가져오기
{ "app": "myapp", "store": "googlePlay" }

// 미리보기
{ "app": "myapp", "dryRun": true }
```

### 데이터 저장 위치

```
{dataDir}/.aso/pull/{slug}/
├── app-store/
│   └── release-notes.json
└── google-play/
    └── release-notes.json
```

### 응답

```
✅ Release notes pulled
   Google Play: 5 versions
   App Store: 3 versions
```

---

## release-update-notes

App Store/Google Play 버전의 릴리스 노트(What's New)를 업데이트합니다.

### 파라미터

| 파라미터       | 타입                                   | 필수   | 기본값    | 설명                                           |
| -------------- | -------------------------------------- | ------ | --------- | ---------------------------------------------- |
| `app`          | `string`                               | 조건부 | -         | 등록된 앱 slug                                 |
| `bundleId`     | `string`                               | 조건부 | -         | App Store 번들 ID                              |
| `packageName`  | `string`                               | 조건부 | -         | Google Play 패키지명                           |
| `store`        | `"appStore" \| "googlePlay" \| "both"` | 아니오 | `"both"`  | 대상 스토어                                    |
| `versionId`    | `string`                               | 아니오 | 자동 감지 | App Store 버전 ID (편집 가능한 버전 자동 감지) |
| `whatsNew`     | `Record<string, string>`               | 조건부 | -         | 언어별 릴리스 노트                             |
| `text`         | `string`                               | 조건부 | -         | 모든 지원 언어로 번역할 원본 텍스트            |
| `sourceLocale` | `string`                               | 아니오 | `"en-US"` | 번역 원본 언어                                 |

> **참고:** `whatsNew`(모든 번역) 또는 `text`(번역할 원본)를 제공하세요.

### 사용 예시

**옵션 1: 모든 번역 제공**

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

**옵션 2: 번역할 원본 텍스트 제공**

```json
{
  "app": "myapp",
  "text": "Bug fixes and improvements",
  "sourceLocale": "en-US"
}
```

`text` 사용 시 도구가 번역 요청을 반환합니다:

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

### 응답

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

### 번역 파이프라인

일부 번역만 제공된 경우 도구가 번역 파이프라인을 안내합니다:

1. **1단계**: 제공된 텍스트가 `sourceLocale`이 아니면 먼저 원본 언어로 번역 요청
2. **2단계**: 원본 언어에서 누락된 모든 지원 언어로 번역 요청
3. **최종**: 모든 번역이 제공되면 스토어 업데이트

---

## 버전 상태

### App Store

| 상태                        | 설명                          |
| --------------------------- | ----------------------------- |
| `PREPARE_FOR_SUBMISSION`    | 편집 가능, 아직 제출되지 않음 |
| `WAITING_FOR_REVIEW`        | 제출됨, 심사 대기 중          |
| `IN_REVIEW`                 | 심사 중                       |
| `PENDING_DEVELOPER_RELEASE` | 승인됨, 수동 출시 대기 중     |
| `READY_FOR_DISTRIBUTION`    | App Store에 배포됨            |
| `REJECTED`                  | 심사 거부됨                   |

### Google Play

| 트랙         | 설명                 |
| ------------ | -------------------- |
| `internal`   | 내부 테스트 트랙     |
| `alpha`      | 비공개 테스트 트랙   |
| `beta`       | 공개 테스트 트랙     |
| `production` | Play 스토어에 배포됨 |

---

## 워크플로우 예시

### 전체 릴리스 워크플로우

1. **현재 버전 확인:**

   ```json
   { "app": "myapp" }
   ```

2. **새 버전 생성:**

   ```json
   {
     "app": "myapp",
     "version": "1.3.0",
     "versionCodes": [130]
   }
   ```

3. **릴리스 노트 업데이트:**

   ```json
   {
     "app": "myapp",
     "whatsNew": {
       "en-US": "• New feature A\n• Bug fixes",
       "ko": "• 새로운 기능 A\n• 버그 수정"
     }
   }
   ```

4. **확인:**
   ```json
   { "app": "myapp" }
   ```

## 참고

- [apps-add](./apps.md#apps-add) - 릴리스 도구 사용 전 앱 등록
- [aso-push](./aso.md#aso-push) - 전체 ASO 메타데이터 업데이트
