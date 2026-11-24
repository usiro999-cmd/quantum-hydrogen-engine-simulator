import { orbitals } from "./src/physics.mjs";

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}

export async function explain(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "POSTを使用してください。" });
  if (!req.headers["content-type"]?.startsWith("application/json")) return sendJson(res, 415, { error: "JSONを送信してください。" });
  if (!process.env.OPENAI_API_KEY) return sendJson(res, 503, { error: "サーバーにOPENAI_API_KEYが設定されていません。" });
  try {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (Buffer.byteLength(body) > 4096) return sendJson(res, 413, { error: "リクエストが大きすぎます。" });
    }
    let input;
    try { input = JSON.parse(body); } catch { return sendJson(res, 400, { error: "JSONを解析できません。" }); }
    if (!input || typeof input.orbital !== "string" || !Object.hasOwn(orbitals, input.orbital) ||
      typeof input.question !== "string" || !input.question.trim() || input.question.length > 500) {
      return sendJson(res, 400, { error: "軌道と500文字以内の質問を入力してください。" });
    }
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        instructions: "あなたは水素原子の量子力学を教える日本語の教師です。正確に簡潔に答え、不確かな点は明記してください。電子雲は確率分布であり電子の軌道運動ではありません。",
        input: `選択中の軌道: ${input.orbital} (n=${orbitals[input.orbital].n}, l=${orbitals[input.orbital].l}, m=${orbitals[input.orbital].m})\n質問: ${input.question.trim()}`,
        max_output_tokens: 600
      }),
      signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) return sendJson(res, 502, { error: `OpenAI APIからエラーが返されました（HTTP ${response.status}）。APIキーと利用設定を確認してください。` });
    const data = await response.json();
    if (data.status !== "completed") return sendJson(res, 502, { error: "AI解説が完了しませんでした。もう一度お試しください。" });
    const answer = data.output?.flatMap((item) => item.content || []).filter((item) => item.type === "output_text").map((item) => item.text).join("\n");
    if (!answer) return sendJson(res, 502, { error: "OpenAI APIから解説テキストを取得できませんでした。" });
    return sendJson(res, 200, { answer });
  } catch (error) {
    console.error("AI explanation request failed:", error.message);
    return sendJson(res, 502, { error: "AI解説に接続できませんでした。サーバーのログを確認してください。" });
  }
}
