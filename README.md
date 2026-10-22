# SejarahMate AI 🇲🇾

**A rule-based Telegram History tutor bot for Malaysian secondary school students (Form 4 & 5).**

No LLM. No AI API costs. Pure keyword matching + button-driven flows — keeping your running costs at zero.

> 🤖 **Try it now:** [@SejarahMate_bot](https://t.me/SejarahMate_bot)

---

## Features

| Feature | Description |
|---|---|
| 📖 Concept Explanations | Kesultanan Melayu Melaka, Pembentukan Malaysia, Pendudukan Jepun |
| 🧠 Interactive Quizzes | Multiple-choice, shuffled, scored — with instant feedback |
| 🔍 Keyword Slot-Filling | Detects free-text keywords like "Parameswara" and responds smartly |
| 🛑 Homework Guardrail | Politely rejects essay/homework requests |
| ⏳ Fallback Loop Guard | Auto-pauses bot for 5 min after 2 consecutive unrecognised inputs |
| 💬 Button-First UX | All flows use Inline Keyboards — minimises free-text inputs |

---

## Quick Start

### 1. Prerequisites

- Node.js ≥ 18
- A Telegram Bot token from [@BotFather](https://t.me/BotFather)

### 2. Clone and install

```bash
git clone https://github.com/tarypianys2007-arch/sejarahmate-ai-bot.git
cd sejarahmate-ai-bot
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and paste your token:

```
TELEGRAM_BOT_TOKEN=123456:ABC-your-token-here
```

> ⚠️ **Never commit `.env`** — it is in `.gitignore`.

### 4. Run

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

Expected startup output:
```
🇲🇾  SejarahMate AI is running as @SejarahMate_bot (id: 123456789)
    Link: https://t.me/SejarahMate_bot
```

---

## Project Structure

```
sejarahmate-ai-bot/
├── src/
│   ├── index.js        # Bot entry point — polling + event wiring
│   ├── handler.js      # Core dispatch logic (all intents & guardrails)
│   ├── session.js      # In-memory per-user state store
│   ├── keyboards.js    # Inline keyboard builder helpers
│   ├── concepts.js     # Topic explanations + keyword→topic map
│   └── quizData.js     # Quiz question bank
├── .env.example        # Template — copy to .env and fill in your token
├── .gitignore
├── package.json
└── README.md
```

---

## Conversation Flow

```
/start or "Hi"
    └── Main Menu
         ├── 📖 Terangkan Topik
         │    ├── 🏰 Kesultanan Melayu Melaka  → explanation → more facts / quiz
         │    ├── 🤝 Pembentukan Malaysia       → explanation → factors / quiz
         │    └── ⚔️ Zaman Pendudukan Jepun     → explanation → effects
         ├── 🧠 Mula Kuiz
         │    ├── 🏰 Kuiz Melaka               → 3 MCQ → score
         │    └── 🤝 Kuiz Pembentukan Malaysia  → 3 MCQ → score
         └── 🆘 Bantuan                        → help text
```

---

## Adding More Topics / Questions

**Add a concept** in `src/concepts.js` — follow the existing `CONCEPTS` object shape:

```js
my_topic: {
  text: "Short ≤50 word explanation here.",
  buttons: ["📖 More Info", "🧠 Quiz", "⬅️ Kembali"],
}
```

Then add the button handlers in `src/handler.js`.

**Add quiz questions** in `src/quizData.js` — follow the existing array structure.

---

## Deployment (Optional)

For 24/7 uptime, deploy to any Node.js host:

- **Railway / Render / Fly.io** — push repo, set `TELEGRAM_BOT_TOKEN` as an env var, run `npm start`.
- **VPS (PM2)** — `pm2 start npm --name sejarahmate -- start`

> ⚠️ For multi-server deployment, replace the in-memory session store in `src/session.js` with Redis.

---

## Design Decisions

1. **Button-first** — every response ends with an Inline Keyboard, guiding users away from free-typing.
2. **Short messages** — all responses are ≤ 50 words (3 sentences max).
3. **Strict 2-strike fallback** — bot pauses for 5 minutes after 2 consecutive unrecognised inputs, preventing infinite fallback loops.
4. **Zero LLM calls** — pure `String.includes` / `RegExp` matching. Running cost = hosting only.
5. **Polling safety** — `getMe()` runs before polling starts; 409 Conflict exits cleanly if a duplicate instance is detected.

---

## License

MIT
