# jif

The `if` statement, finally powered by AI.

For 70 years, conditional branching has been held back by a primitive technology: the CPU.
`jif` replaces it with [Jev](https://www.datacamp.com/blog/system-one-models-jev), a frontier *System One* model
that returns calibrated, typed decisions. Every branch in your program is now evaluated by a model.

```js
jif (cart.total > 100 && user.isVip) {
  applyDiscount();
} else jif (user.vibe === 'immaculate') {
  applyDiscount();
}
```

Yes, that's real syntax. No, you don't need to import anything. It is also synchronous, so it works anywhere
a normal `if` does and never needs an `await`.

## Why jif?

| | `if` (legacy) | `jif` |
|---|---|---|
| Latency | ~1 ns | 70 to 500 ms (enterprise grade) |
| Cost per branch | $0 | ~$0.0004 |
| Accuracy | 100% (boring) | 67.8%\* |
| Understands intent | no | yes |
| Calibrated confidence | no | yes, `lastProbability` |
| Needs internet to branch | no | yes |
| Deterministic | yes | we don't talk about that |

\* Jev's reported score on TypeSafe's benchmark, statistically indistinguishable from GPT-5.6 Terra.

### It understands natural language

Legacy `if` makes you write *code*. `jif` just gets it:

```js
const message = 'I have been waiting 3 weeks for my refund. This is unacceptable.';

jif (message sounds like the customer is angry) {
  escalateToHuman();
}
```

Your PM can now write conditions. Should they? Not our problem.

### Zero type errors, guaranteed

Jev *mathematically cannot* return anything but a probability. That's more type safety than TypeScript gives you.

## Install

```bash
npm i github:ChristopherKotthoff/jif-js
node --env-file=.env --import jif/register app.js   # .env holds AI_GATEWAY_API_KEY (Vercel AI Gateway)
```

Requires Node ≥ 22.15.

Not ready to commit to a new keyword? Tagged templates work in plain JS:

```js
import { jif } from 'jif';

if (jif`${cart.total} dollars is a lot of money for socks`) { ... }
```

Feeling risky? `JIF_THRESHOLD=0.3` makes your program more optimistic.

## How it works

1. `--import jif/register` installs a module load hook that rewrites `jif (expr)` into
   `if (__jif("expr", n => eval(n)))`. That little `eval` closure lets jif read your local variables. Yes, really.
2. jif pulls out every variable the expression mentions, looks up its value, and sends the expression text plus
   the values to `typesafe-ai/jev` via the Vercel AI Gateway.
3. The call runs in a worker thread while the main thread blocks on `Atomics.wait`, because branching should never
   be async. We turned an if statement into a threading problem so you don't have to.
4. Jev returns the probability that the condition is true, and we branch on it.
   JavaScript never evaluates your expression itself. That's what the AI is for.

## FAQ

**Is this production ready?** It has tests.

**Should I use this?** Your cloud bill says yes.

**Is it deterministic?** No.

**Isn't this shooting pigeons with a cannon?** The pigeons have never been shot this accurately, at least 67.8% of the time.

## Tests

```bash
node --env-file-if-exists=.env --test  # offline checks; with AI_GATEWAY_API_KEY set it also asks Jev for real
```

MIT. Also available for Python: [jif-py](https://github.com/ChristopherKotthoff/jif-py).
