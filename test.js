import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { jif, transform, variables } from './index.js';

const call = (e) => `if (__jif(${JSON.stringify(e)}, (__n) => eval(__n)))`;

test('rewrites jif statements', () => {
  assert.equal(transform('jif (x > 5) {}'), `${call('x > 5')} {}`);
  assert.equal(transform('if (a) {} else jif (b) {}'), `if (a) {} else ${call('b')} {}`);
  assert.equal(transform('jif (f(a, (b)) && c) {}'), `${call('f(a, (b)) && c')} {}`);
  assert.equal(transform('jif (s === ")") {}'), `${call('s === ")"')} {}`);
  assert.equal(transform('const s = "jif (x)"; // jif (y)'), 'const s = "jif (x)"; // jif (y)');
  assert.equal(transform('const ok = jif(`x`); obj.jif (1)'), 'const ok = jif(`x`); obj.jif (1)'); // not a statement
  const multi = transform('jif (a &&\n  b) {}\nboom');
  assert.equal(multi.split('\n').length, 3);
  assert.equal(multi.split('\n')[2], 'boom'); // line numbers preserved
  new Function(transform(readFileSync('examples/demo.js', 'utf8'))); // demo parses
});

test('captures variables from lexical scope', () => {
  const user = { age: 21 }, country = 'CH', fn = () => 1;
  assert.deepEqual(variables("user.age >= 18 && country === 'CH' && fn() && Math.PI && nope", (n) => eval(n)),
    { 'user.age': '21', country: "'CH'" });
});

const live = { skip: !process.env.AI_GATEWAY_API_KEY && 'no AI_GATEWAY_API_KEY' };

test('asks Jev', live, () => {
  let x = 10;
  assert.equal(jif('x > 5', (n) => eval(n)), true);
  x = 2;
  assert.equal(jif('x > 5', (n) => eval(n)), false);
  const message = "I WANT MY MONEY BACK. THIS IS THE THIRD TIME I'M ASKING.";
  assert.equal(jif('customer_is_angry based on message', (n) => eval(n)), true);
  assert.equal(jif`${message} is a calm message`, false);
});

test('demo runs through the loader', live, () => {
  const out = execFileSync(process.execPath, ['--import', './register.js', 'examples/demo.js'], { encoding: 'utf8' });
  console.log(out);
  for (const s of ['hot', 'snickers', 'escalate']) assert.match(out, new RegExp(s));
});
