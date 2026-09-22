// Runs the network call off-thread so the main thread can block on it. Branching must be synchronous.
import { workerData, parentPort } from 'node:worker_threads';

const { port, flag } = workerData;
parentPort.on('message', async ({ body, key }) => {
  try {
    let r;
    for (let attempt = 0; attempt < 4; attempt++) {
      if (attempt) await new Promise((ok) => setTimeout(ok, 1000 * 2 ** (attempt - 1))); // Jev is busy deciding other people's if statements
      r = await fetch('https://ai-gateway.vercel.sh/v4/ai/evaluation-model', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${key}`,
          'content-type': 'application/json',
          'ai-model-id': 'typesafe-ai/jev',
          'ai-evaluation-model-specification-version': '4',
          'ai-gateway-auth-method': 'api-key',
          'ai-gateway-protocol-version': '0.0.1',
        },
        body: JSON.stringify(body),
      });
      if (r.status !== 429) break;
    }
    const text = await r.text();
    if (!r.ok) throw new Error(`jev said ${r.status}: ${text}`);
    port.postMessage({ probability: JSON.parse(text).answers.answer.probability });
  } catch (e) {
    port.postMessage({ error: e.message });
  }
  Atomics.store(flag, 0, 1);
  Atomics.notify(flag, 0);
});
