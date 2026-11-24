import test from "node:test";
import assert from "node:assert/strict";
import { createServer, request } from "node:http";
import { explain } from "../api.mjs";

function post(port, body, contentType = "application/json") {
  return new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, method: "POST", path: "/api/explain", headers: { "Content-Type": contentType } }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    });
    req.on("error", reject);
    req.end(body);
  });
}

test("AI endpoint validates input and forwards valid questions without exposing the key", async () => {
  const oldKey = process.env.OPENAI_API_KEY;
  const oldFetch = globalThis.fetch;
  const server = createServer(explain);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  try {
    delete process.env.OPENAI_API_KEY;
    assert.equal((await post(port, "{}")).status, 503);
    process.env.OPENAI_API_KEY = "test-key";
    assert.equal((await post(port, "{")).status, 400);
    assert.equal((await post(port, JSON.stringify({ orbital: "bogus", question: "なぜ？" }))).status, 400);
    assert.equal((await post(port, JSON.stringify({ orbital: "1s", question: "x".repeat(501) }))).status, 400);
    assert.equal((await post(port, "x".repeat(4097))).status, 413);
    globalThis.fetch = async (url, options) => {
      assert.equal(url, "https://api.openai.com/v1/responses");
      assert.equal(options.headers.Authorization, "Bearer test-key");
      assert.match(JSON.parse(options.body).input, /2p/);
      return { ok: true, json: async () => ({ status: "completed", output: [{ content: [{ type: "output_text", text: "解説です。" }] }] }) };
    };
    const result = await post(port, JSON.stringify({ orbital: "2p", question: "節とは？" }));
    assert.equal(result.status, 200);
    assert.deepEqual(result.data, { answer: "解説です。" });
    globalThis.fetch = async () => ({ ok: false, status: 401 });
    assert.equal((await post(port, JSON.stringify({ orbital: "1s", question: "なぜ？" }))).status, 502);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = oldKey;
    await new Promise((resolve) => server.close(resolve));
  }
});
