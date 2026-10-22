/**
 * Core handler — processes every incoming message or callback_query.
 * Rule-based: keyword matching + button callbacks only. No LLM calls.
 */

import {
  getSession,
  getFlow,
  setFlow,
  incrementFallback,
  resetFallback,
  isPaused,
  pauseSession,
  startQuiz,
  getQuiz,
  advanceQuiz,
  endQuiz,
} from "./session.js";

import { CONCEPTS, KEYWORD_TOPIC_MAP } from "./concepts.js";
import { QUIZ_MELAKA, QUIZ_PEMBENTUKAN_MALAYSIA } from "./quizData.js";
import {
  buildKeyboard,
  MAIN_MENU,
  TOPIC_MENU,
  QUIZ_MENU,
  YA_TIDAK,
  YA_TERANGKAN_KUIZ,
} from "./keyboards.js";

// ─── Guardrail trigger patterns ───────────────────────────────────────────────
const HOMEWORK_PATTERNS = [
  /buatkan\s+(karangan|esei|essay)/i,
  /homework\s+saya/i,
  /jawapan\s+soalan/i,
  /tolong\s+buat\s+(esei|karangan)/i,
  /siapkan\s+kerja/i,
];

const PERSONAL_PATTERNS = [
  /saya\s+(sedih|takut|risau|stress|bosan|marah)/i,
  /i\s+(am\s+)?(sad|stressed|scared|worried)/i,
];

// Greeting triggers
const GREET_PATTERNS = /^(hi|hai|hello|start|helo|hye)$/i;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function matchesHomework(text) {
  return HOMEWORK_PATTERNS.some((r) => r.test(text));
}

function matchesPersonal(text) {
  return PERSONAL_PATTERNS.some((r) => r.test(text));
}

/**
 * Detect slot-fill keyword in free text.
 * Returns topic key or null.
 */
function detectKeywordTopic(text) {
  const lower = text.toLowerCase().trim();
  for (const [kw, topic] of Object.entries(KEYWORD_TOPIC_MAP)) {
    if (lower.includes(kw)) return topic;
  }
  return null;
}

/**
 * Format a quiz question with answer buttons.
 */
function formatQuestion(q, index, total) {
  const optionLines = q.options.map((o) => `${o.label}. ${o.text}`).join("\n");
  return {
    text:
      `⚡ Soalan ${index + 1}/${total}:\n\n` +
      `${q.question}\n\n` +
      `${optionLines}`,
    keyboard: buildKeyboard(
      q.options.map((o) => `${o.label}: ${o.text}`),
      2
    ),
  };
}

// ─── Main dispatch ────────────────────────────────────────────────────────────

/**
 * @param {Object} bot   - node-telegram-bot-api instance
 * @param {number} chatId
 * @param {string} text  - normalised input text (could come from message or callback)
 * @param {boolean} isCallback - true when triggered by a button click
 */
export async function handleInput(bot, chatId, text, isCallback = false) {
  const trimmed = text.trim();

  // ── Paused check ──────────────────────────────────────────────────────────
  if (isPaused(chatId)) {
    await bot.sendMessage(
      chatId,
      "⏳ Bot sedang berehat sebentar. Cuba lagi dalam beberapa minit ya!"
    );
    return;
  }

  // ── Guardrail: homework ───────────────────────────────────────────────────
  if (!isCallback && matchesHomework(trimmed)) {
    setFlow(chatId, "guardrail_homework");
    await bot.sendMessage(
      chatId,
      "Waduh! 🛑 Saya tak boleh buat kerja sekolah awak.\n" +
        "Tapi saya boleh ajar awak macam mana nak faham topik ni. Nak cuba?",
      { reply_markup: YA_TIDAK }
    );
    return;
  }

  // ── Guardrail: personal ───────────────────────────────────────────────────
  if (!isCallback && matchesPersonal(trimmed)) {
    setFlow(chatId, "guardrail_personal");
    await bot.sendMessage(
      chatId,
      "Saya bot Sejarah, bukan kaunselor. Tapi saya doakan awak okay! 💙\n" +
        "Jom sambung belajar?",
      { reply_markup: YA_TIDAK }
    );
    return;
  }

  // ── Routing table ─────────────────────────────────────────────────────────
  const flow = getFlow(chatId);

  // Greeting / start
  if (GREET_PATTERNS.test(trimmed) || trimmed === "/start") {
    resetFallback(chatId);
    setFlow(chatId, "main_menu");
    await bot.sendMessage(
      chatId,
      "Hai! Saya SejarahMate 🇲🇾. Jom belajar Sejarah!\nApa yang awak nak buat hari ni?",
      { reply_markup: MAIN_MENU }
    );
    return;
  }

  // Help
  if (trimmed === "🆘 Bantuan" || trimmed === "/help") {
    resetFallback(chatId);
    await bot.sendMessage(
      chatId,
      "📚 *SejarahMate AI* boleh:\n" +
        "• Terangkan topik Sejarah Form 4 & 5\n" +
        "• Uji pengetahuan awak dengan kuiz\n\n" +
        "_Saya tak boleh buat karangan atau homework ya!_",
      { parse_mode: "Markdown", reply_markup: MAIN_MENU }
    );
    return;
  }

  // ── Terangkan Topik ───────────────────────────────────────────────────────
  if (trimmed === "📖 Terangkan Topik") {
    resetFallback(chatId);
    setFlow(chatId, "topic_menu");
    await bot.sendMessage(chatId, "Boleh! Topik mana yang awak nak saya terangkan?", {
      reply_markup: TOPIC_MENU,
    });
    return;
  }

  if (trimmed === "🏰 Kesultanan Melayu Melaka") {
    resetFallback(chatId);
    setFlow(chatId, "concept_melaka");
    await sendConcept(bot, chatId, "melaka");
    return;
  }

  if (trimmed === "📖 Lagi Fakta Melaka") {
    resetFallback(chatId);
    await sendConcept(bot, chatId, "melaka_lagi");
    return;
  }

  if (trimmed === "🤝 Pembentukan Malaysia") {
    resetFallback(chatId);
    setFlow(chatId, "concept_pembentukan");
    await sendConcept(bot, chatId, "pembentukan_malaysia");
    return;
  }

  if (trimmed === "📖 Faktor Pembentukan") {
    resetFallback(chatId);
    await sendConcept(bot, chatId, "pembentukan_faktor");
    return;
  }

  if (trimmed === "⚔️ Zaman Pendudukan Jepun") {
    resetFallback(chatId);
    setFlow(chatId, "concept_jepun");
    await sendConcept(bot, chatId, "jepun");
    return;
  }

  if (trimmed === "📖 Kesan Pendudukan Jepun") {
    resetFallback(chatId);
    await sendConcept(bot, chatId, "jepun_kesan");
    return;
  }

  // ── Mula Kuiz ─────────────────────────────────────────────────────────────
  if (trimmed === "🧠 Mula Kuiz" || trimmed === "🧠 Bagi Kuiz") {
    resetFallback(chatId);
    setFlow(chatId, "quiz_menu");
    await bot.sendMessage(chatId, "Jom test minda! 🧠 Pilih topik kuiz:", {
      reply_markup: QUIZ_MENU,
    });
    return;
  }

  if (trimmed === "🏰 Kuiz Melaka" || trimmed === "🧠 Kuiz Melaka") {
    resetFallback(chatId);
    await beginQuiz(bot, chatId, "melaka", QUIZ_MELAKA);
    return;
  }

  if (
    trimmed === "🤝 Kuiz Pembentukan Malaysia" ||
    trimmed === "🧠 Kuiz Pembentukan Malaysia"
  ) {
    resetFallback(chatId);
    await beginQuiz(bot, chatId, "pembentukan", QUIZ_PEMBENTUKAN_MALAYSIA);
    return;
  }

  // ── Active quiz: answer buttons ───────────────────────────────────────────
  if (flow === "quiz_active") {
    const quiz = getQuiz(chatId);
    if (quiz) {
      const currentQ = quiz.questions[quiz.index];
      const selectedLabel = trimmed.split(":")[0].trim(); // "A", "B", etc.
      const correct = selectedLabel === currentQ.options[currentQ.correctIndex].label;

      const resultMsg = correct
        ? `✅ Betul! 🎉 ${currentQ.explanation}`
        : `❌ Salah. Jawapan betul: ${currentQ.options[currentQ.correctIndex].label}. ${currentQ.explanation}`;

      await bot.sendMessage(chatId, resultMsg);

      const updated = advanceQuiz(chatId, correct);

      if (updated.index >= updated.questions.length) {
        // Quiz done
        const result = endQuiz(chatId);
        setFlow(chatId, "quiz_done");
        await bot.sendMessage(
          chatId,
          `🏆 Tamat! Skor awak: ${result.score}/${result.total}.\n` +
            (result.score === result.total
              ? "Sempurna! Awak memang History Champion! 📚🏆"
              : result.score >= result.total / 2
              ? "Bagus! Teruskan usaha ya! 💪"
              : "Jangan putus asa! Ulangkaji lagi dan cuba semula. 📖"),
          {
            reply_markup: buildKeyboard(
              ["🔁 Cuba Lagi", "📖 Terangkan Topik", "🏠 Menu Utama"],
              3
            ),
          }
        );
      } else {
        // Next question
        const next = updated.questions[updated.index];
        const { text: qText, keyboard } = formatQuestion(
          next,
          updated.index,
          updated.questions.length
        );
        await bot.sendMessage(chatId, qText, { reply_markup: keyboard });
      }
      return;
    }
  }

  // ── Guardrail callbacks ───────────────────────────────────────────────────
  if (flow === "guardrail_homework" || flow === "guardrail_personal") {
    if (trimmed === "✅ Ya" || trimmed === "✅ Ya, Terangkan") {
      resetFallback(chatId);
      setFlow(chatId, "topic_menu");
      await bot.sendMessage(chatId, "Awesome! 🇲🇾 Pilih topik yang awak nak faham:", {
        reply_markup: TOPIC_MENU,
      });
      return;
    }
    if (trimmed === "❌ Tidak" || trimmed === "❌ Tak, Terima Kasih") {
      resetFallback(chatId);
      setFlow(chatId, "main_menu");
      await bot.sendMessage(
        chatId,
        "Okay! Jika ada apa-apa, saya sedia membantu. 👋",
        { reply_markup: MAIN_MENU }
      );
      return;
    }
  }

  // ── Quiz done callbacks ───────────────────────────────────────────────────
  if (flow === "quiz_done") {
    if (trimmed === "🔁 Cuba Lagi") {
      resetFallback(chatId);
      setFlow(chatId, "quiz_menu");
      await bot.sendMessage(chatId, "Semangat! 🔥 Pilih topik kuiz:", {
        reply_markup: QUIZ_MENU,
      });
      return;
    }
  }

  // ── Navigation: Kembali / Menu Utama ─────────────────────────────────────
  if (trimmed === "⬅️ Kembali" || trimmed === "⬅️ Kembali ke Topik") {
    resetFallback(chatId);
    setFlow(chatId, "topic_menu");
    await bot.sendMessage(chatId, "Boleh! Topik mana yang awak nak saya terangkan?", {
      reply_markup: TOPIC_MENU,
    });
    return;
  }

  if (trimmed === "🏠 Menu Utama") {
    resetFallback(chatId);
    setFlow(chatId, "main_menu");
    await bot.sendMessage(
      chatId,
      "Jom! Apa yang awak nak buat seterusnya? 😊",
      { reply_markup: MAIN_MENU }
    );
    return;
  }

  // ── Slot follow-up: Ya, Terangkan (button callback or typed) ─────────────
  if (trimmed === "✅ Ya, Terangkan" && flow.startsWith("slot_")) {
    const topic = flow.replace("slot_", "");
    resetFallback(chatId);
    setFlow(chatId, `concept_${topic}`);
    await sendConcept(bot, chatId, topic);
    return;
  }

  // ── Slot-filling: free text keyword detection (typed messages only) ───────
  if (!isCallback) {
    const detectedTopic = detectKeywordTopic(trimmed);
    if (detectedTopic) {
      resetFallback(chatId);
      const topicName = getTopicDisplayName(detectedTopic);
      await bot.sendMessage(
        chatId,
        `Oh, awak nak tahu pasal ${topicName}! ` +
          `Nak saya terangkan lanjut atau terus buat kuiz?`,
        { reply_markup: YA_TERANGKAN_KUIZ }
      );
      // Pre-set so next Ya button shows the right topic
      setFlow(chatId, `slot_${detectedTopic}`);
      return;
    }
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  const count = incrementFallback(chatId);

  if (count === 1) {
    await bot.sendMessage(
      chatId,
      "Maaf, saya tak faham 😅. Sila pilih dari menu di bawah ya:",
      { reply_markup: MAIN_MENU }
    );
  } else {
    // 2nd failure → pause
    resetFallback(chatId);
    pauseSession(chatId, 5 * 60 * 1000);
    await bot.sendMessage(
      chatId,
      "Alamak, sistem saya tersangkut sikit. 😓 Jom kita rehat sekejap.\n" +
        "Sila rujuk guru Sejarah awak untuk bantuan lanjut ya! 👩‍🏫\n\n" +
        "_Bot akan aktif semula dalam 5 minit._",
      { parse_mode: "Markdown" }
    );
  }
}

// ─── Private helpers ──────────────────────────────────────────────────────────

async function sendConcept(bot, chatId, key) {
  const concept = CONCEPTS[key];
  if (!concept) return;
  await bot.sendMessage(chatId, concept.text, {
    reply_markup: buildKeyboard(concept.buttons, 2),
  });
}

async function beginQuiz(bot, chatId, topic, questions) {
  // Shuffle a copy so each session gets a different order
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  startQuiz(chatId, topic, shuffled);
  setFlow(chatId, "quiz_active");

  await bot.sendMessage(
    chatId,
    `Jom test! ⚡ ${shuffled.length} soalan menanti. Sila jawab dengan tekan butang!\n` +
      "Siap? Mari kita mulakan! 🚀"
  );

  const first = shuffled[0];
  const { text, keyboard } = formatQuestion(first, 0, shuffled.length);
  await bot.sendMessage(chatId, text, { reply_markup: keyboard });
}

function getTopicDisplayName(topicKey) {
  const names = {
    melaka: "Kesultanan Melayu Melaka",
    pembentukan_malaysia: "Pembentukan Malaysia",
    jepun: "Pendudukan Jepun",
  };
  return names[topicKey] ?? topicKey;
}
