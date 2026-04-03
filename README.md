# Stellar Playground

An in-browser JavaScript playground for the Stellar SDK — built as a drop-in replacement for RunKit embeds in [StellarQuest](https://quest.stellar.org).

**Live demo:** https://kaankacar.github.io/stellar-playground/

---

## Files

| File | Purpose |
|------|---------|
| `playground.html` | The actual playground (editor + console). Loads in an iframe. |
| `embed.js` | Drop-in script that auto-converts placeholder divs into iframes. |
| `index.html` | Demo quest page showing the full Register → Fund → Run → Verify flow. |

---

## How to embed the playground in a quest page

### Step 1 — Include the embed script

Add this script tag to the quest page, ideally just before `</body>`:

```html
<script src="https://kaankacar.github.io/stellar-playground/embed.js"></script>
```

---

### Step 2 — Add a placeholder div where the playground should appear

Place this div wherever RunKit used to be embedded — at the bottom of the Manual Code quest instructions:

```html
<div class="stellar-embed" data-code="BASE64_ENCODED_CODE" data-height="500"></div>
```

`embed.js` will automatically replace this div with an iframe pointing to the playground, pre-filled with the quest code.

---

### Step 3 — Encode the quest code as base64

Each quest has its own JavaScript code. Encode it as base64 so it can be passed in the URL.

**In JavaScript (on the quest page):**
```js
const questCode = `
const { Keypair, Horizon } = require('@stellar/stellar-sdk')
const questKeypair = Keypair.fromSecret('SECRET_KEY_HERE')
// ... rest of quest code
`
const encoded = btoa(unescape(encodeURIComponent(questCode)))
document.querySelector('.stellar-embed').dataset.code = encoded
```

**Or pre-compute it once** using Node.js and hardcode the result:
```js
// Run this once in Node.js to get the base64 string
const code = require('fs').readFileSync('quest-code.js', 'utf8')
console.log(Buffer.from(code).toString('base64'))
```

Then paste the output directly into `data-code="..."`.

---

### Step 4 — Inject the Quest Keypair secret key after Register

This is the key integration step. When the user clicks **Register**, the StellarQuest backend generates a unique Quest Keypair for that user. After decoding the keypair from the JWT (`checkToken`), send the secret key to the playground iframe:

```js
// After decoding the checkToken and extracting the keypair:
const questKeypairSecret = decodedToken.sk  // the secret key from the JWT

// Find the playground iframe and send it the secret key
const iframe = document.querySelector('.stellar-embed-iframe') // embed.js adds this class
iframe.contentWindow.postMessage({
  type: 'stellar-quest-inject',
  secret: questKeypairSecret
}, '*')
```

The playground will automatically replace `'SECRET_KEY_HERE'` in the code editor with the real secret key. The user doesn't need to copy-paste anything.

**In the React codebase (`useQuest.ts`), this should happen in the `SET_ACTIVE` case** of the state reducer, right after the keypair is decoded from the checkToken.

---

### Full example (vanilla HTML)

```html
<!DOCTYPE html>
<html>
<body>

  <!-- Quest instructions -->
  <p>Use the script below to complete this quest:</p>

  <!-- Playground embed placeholder -->
  <div class="stellar-embed" data-height="500"></div>

  <script>
    // 1. Define the quest code (with SECRET_KEY_HERE placeholder)
    const QUEST_CODE = `
const { Keypair, Horizon } = require('@stellar/stellar-sdk')
const questKeypair = Keypair.fromSecret('SECRET_KEY_HERE')
const server = new Horizon.Server('https://horizon-testnet.stellar.org')
const account = await server.loadAccount(questKeypair.publicKey())
console.log('Balance:', account.balances[0].balance, 'XLM')
`
    // 2. Set the encoded code on the div before embed.js runs
    document.querySelector('.stellar-embed').dataset.code =
      btoa(unescape(encodeURIComponent(QUEST_CODE)))
  </script>

  <!-- 3. Load embed.js — this replaces the div with an iframe -->
  <script src="https://kaankacar.github.io/stellar-playground/embed.js"></script>

  <script>
    // 4. After Register: inject the quest keypair secret into the playground
    function onRegister(secretKey) {
      const iframe = document.querySelector('iframe')
      iframe.contentWindow.postMessage({
        type: 'stellar-quest-inject',
        secret: secretKey
      }, '*')
    }
  </script>

</body>
</html>
```

---

## URL parameters (direct links)

The playground also accepts code via URL parameters, useful for sharing or deep-linking:

| Parameter | Description |
|-----------|-------------|
| `?code=BASE64` | Pre-fills the editor with the decoded code |
| `?embed=1` | Activates compact embed layout (no header, stacked editor/console) |

Example:
```
https://kaankacar.github.io/stellar-playground/playground.html?embed=1&code=BASE64
```

This is the same URL that `embed.js` generates internally for each iframe.

---

## postMessage API reference

Messages the playground **receives** from the parent page:

| `event.data.type` | Fields | Effect |
|-------------------|--------|--------|
| `stellar-quest-inject` | `secret: string` | Replaces `'SECRET_KEY_HERE'` in the editor with the given secret key |

Messages the playground **sends** to the parent page:

| `event.data.type` | Fields | Effect |
|-------------------|--------|--------|
| `stellar-playground` | `height: number` | Reports current content height so the parent can resize the iframe |

Listen for resize events in the parent:
```js
window.addEventListener('message', (event) => {
  if (event.data?.type === 'stellar-playground') {
    const iframe = /* find the right iframe */
    iframe.height = event.data.height
  }
})
```

`embed.js` handles this automatically when used.

---

## How it works

- `@stellar/stellar-sdk` is loaded from CDN into the iframe
- The Run button is disabled until the SDK finishes loading
- User code is executed using `AsyncFunction` — so top-level `await` works
- `require('@stellar/stellar-sdk')` and `require('stellar-sdk')` both work (via a fake `require`)
- `console.log/error/warn/info` are captured and shown in the output panel
- No server required — everything runs in the browser

---

## Soroban / Rust support

Not currently supported. Running Rust in the browser requires server-side compilation infrastructure. This is tracked for a future version when Soroban Quest content is addressed.
