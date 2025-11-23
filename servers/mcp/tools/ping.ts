/**
 * Simple health check tool
 */
export async function handlePing() {
  return {
    content: [{ type: "text" as const, text: "pong" }],
  };
}


