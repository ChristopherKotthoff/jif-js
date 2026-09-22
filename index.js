// jif: the if statement, finally powered by AI.
import { Worker, MessageChannel, receiveMessageOnPort } from 'node:worker_threads';
import { inspect } from 'node:util';

export let lastProbability = null; // calibrated confidence of the most recent branch. Enterprise observability.

const NOT_VARS = new Set(['true', 'false', 'null', 'undefined', 'typeof', 'instanceof', 'in', 'new', 'void', 'delete', 'this']);
const show = (v) => inspect(v, { depth: 2, breakLength: Infinity }).slice(0, 500); // ponytail: truncated, the model doesn't need your whole array

export function variables(expr, lookup) {
  const out = {};
  for (const chain of new Set(expr.match(/[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*/g) ?? [])) {
    const head = chain.split('.')[0];
    if (NOT_VARS.has(head) || head in globalThis) continue;
    try {
      const v = lookup(chain);
      if (typeof v !== 'function') out[chain] = show(v);
    } catch {} // not a variable, just vibes
  }
  return out;
}

let worker, port, flag;
function ask(expr, vars) {
  const key = process.env.AI_GATEWAY_API_KEY;
  if (!key) throw new Error('jif needs AI_GATEWAY_API_KEY. Branching is a premium feature.');
  if (!worker) {
    const ch = new MessageChannel();
    port = ch.port1;
    flag = new Int32Array(new SharedArrayBuffer(4));
    worker = new Worker(new URL('./worker.js', import.meta.url), { workerData: { port: ch.port2, flag }, transferList: [ch.port2] });
    worker.unref();
  }
  const state = 'Variables:\n' + Object.entries(vars).map(([k, v]) => `${k} = ${v}\n`).join('') + `Expression: ${expr}`;
  const body = { state, questions: { answer: { type: 'boolean', instructions: 'Given the variable values, is the expression true?' } } };
  Atomics.store(flag, 0, 0);
  worker.postMessage({ body, key });
  if (Atomics.wait(flag, 0, 0, 30_000) === 'timed-out') throw new Error('jev took longer than 30s to decide. Truly thinking.');
  const { message } = receiveMessageOnPort(port);
  if (message.error) throw new Error(message.error);
  return (lastProbability = message.probability);
}

// jif('x > 5', n => eval(n))   or   jif`${cart.total} is a lot of money`
export function jif(expr, ...rest) {
  let vars = {};
  if (Array.isArray(expr) && 'raw' in expr) expr = expr.reduce((s, part, i) => s + show(rest[i - 1]) + part);
  else if (rest[0]) vars = variables(expr, rest[0]);
  return ask(expr, vars) >= Number(process.env.JIF_THRESHOLD ?? 0.5);
}

// --- source rewrite: `jif (expr) {` -> `if (__jif("expr", (__n) => eval(__n))) {` ---
// ponytail: hand-rolled scanner, not a parser. Regex literals containing quotes and backticks inside ${} can confuse it.
function skipString(src, i) {
  const q = src[i];
  for (i++; i < src.length; i++) {
    if (src[i] === '\\') i++;
    else if (src[i] === q) return i + 1;
  }
  return i;
}

function matchParen(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') { i = skipString(src, i) - 1; continue; }
    if (c === '(') depth++;
    else if (c === ')' && --depth === 0) return i;
  }
  return -1;
}

export function transform(src) {
  let out = '';
  for (let i = 0; i < src.length; ) {
    const c = src[i], n = src[i + 1];
    let end = -1;
    if (c === '/' && n === '/') end = src.indexOf('\n', i);
    else if (c === '/' && n === '*') end = src.indexOf('*/', i) + 2;
    else if (c === '"' || c === "'" || c === '`') end = skipString(src, i);
    if (end !== -1) {
      if (end <= i) end = src.length;
      out += src.slice(i, end);
      i = end;
      continue;
    }
    const m = /^jif\s*\(/.exec(src.slice(i, i + 20));
    const atStatement = /([;{}\n]|\belse)[ \t]*$/.test(out.slice(-30)) || !out.trim();
    if (m && atStatement && !/[\w$.]/.test(src[i - 1] ?? '')) {
      const open = i + m[0].length - 1, close = matchParen(src, open);
      if (close !== -1) {
        const expr = src.slice(open + 1, close);
        const pad = '\n'.repeat(expr.split('\n').length - 1); // keep line numbers stable
        out += `if (__jif(${JSON.stringify(expr.replace(/\s+/g, ' ').trim())}, (__n) => eval(__n))${pad})`;
        i = close + 1;
        continue;
      }
    }
    out += c;
    i++;
  }
  return out;
}
