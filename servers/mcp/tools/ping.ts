/**
 * 간단한 헬스체크용 도구
 */
export async function handlePing() {
  return {
    content: [{ type: "text" as const, text: "pong" }],
  };
}

