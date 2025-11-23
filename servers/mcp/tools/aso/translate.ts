/**
 * ASO 번역 요청 툴
 *
 * 이 툴은 번역이 필요한 텍스트와 대상 로케일 목록을 반환합니다.
 * LLM이 직접 번역을 수행한 후, 결과를 다른 ASO 툴에 전달합니다.
 */

import { APP_STORE_SUPPORTED_LOCALES, GOOGLE_PLAY_SUPPORTED_LANGUAGES } from "../../../../packages/aso-core";

type StoreType = "googlePlay" | "appStore" | "both";

interface AsoTranslateOptions {
  text: string;
  sourceLocale?: string;
  targetLocales?: string[];
  store?: StoreType;
}

interface TranslationRequest {
  sourceText: string;
  sourceLocale: string;
  targetLocales: string[];
  instructions: string;
}

/**
 * 스토어 타입에 따른 기본 로케일 목록 반환
 */
function getDefaultLocales(store: StoreType): string[] {
  switch (store) {
    case "appStore":
      return [...APP_STORE_SUPPORTED_LOCALES];
    case "googlePlay":
      return [...GOOGLE_PLAY_SUPPORTED_LANGUAGES];
    case "both":
      const combined = new Set([
        ...APP_STORE_SUPPORTED_LOCALES,
        ...GOOGLE_PLAY_SUPPORTED_LANGUAGES,
      ]);
      return Array.from(combined);
  }
}

/**
 * 번역 요청 생성
 */
export async function handleAsoTranslate(options: AsoTranslateOptions) {
  const {
    text,
    sourceLocale = "en-US",
    targetLocales,
    store = "both"
  } = options;

  if (!text || text.trim().length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: "❌ 번역할 텍스트가 필요합니다.",
        },
      ],
    };
  }

  const locales = targetLocales && targetLocales.length > 0
    ? targetLocales
    : getDefaultLocales(store);

  const filteredLocales = locales.filter(locale => locale !== sourceLocale);

  const request: TranslationRequest = {
    sourceText: text,
    sourceLocale,
    targetLocales: filteredLocales,
    instructions: `다음 텍스트를 각 로케일에 맞게 번역해주세요.
앱 스토어 릴리즈 노트/What's New에 적합한 톤을 유지하세요.
각 로케일의 문화적 맥락을 고려하여 자연스럽게 번역해주세요.

번역 결과는 다음 JSON 형식으로 제공해주세요:
{
  "translations": {
    "ko": "번역된 텍스트",
    "ja": "翻訳されたテキスト",
    ...
  }
}`,
  };

  return {
    content: [
      {
        type: "text" as const,
        text: `🌐 번역 요청

**원본 텍스트** (${sourceLocale}):
${text}

**대상 로케일** (${filteredLocales.length}개):
${filteredLocales.join(", ")}

**지침**:
${request.instructions}

---
번역을 완료한 후, \`release:update-notes\` 툴을 사용하여 각 로케일의 릴리즈 노트를 업데이트하세요.`,
      },
    ],
    _meta: {
      translationRequest: request,
    },
  };
}
