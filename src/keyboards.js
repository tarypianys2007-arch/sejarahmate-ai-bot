/**
 * Keyboard builder helpers.
 * Returns Telegram InlineKeyboardMarkup objects.
 */

export function buildKeyboard(labels, cols = 2) {
  const rows = [];
  for (let i = 0; i < labels.length; i += cols) {
    rows.push(
      labels.slice(i, i + cols).map((label) => ({
        text: label,
        callback_data: label.trim(),
      }))
    );
  }
  return { inline_keyboard: rows };
}

export const MAIN_MENU = buildKeyboard(
  ["📖 Terangkan Topik", "🧠 Mula Kuiz", "🆘 Bantuan"],
  3
);

export const TOPIC_MENU = buildKeyboard(
  ["🏰 Kesultanan Melayu Melaka", "🤝 Pembentukan Malaysia", "⚔️ Zaman Pendudukan Jepun", "⬅️ Kembali"],
  2
);

export const QUIZ_MENU = buildKeyboard(
  ["🏰 Kuiz Melaka", "🤝 Kuiz Pembentukan Malaysia", "⬅️ Kembali"],
  2
);

export const YA_TIDAK = buildKeyboard(["✅ Ya", "❌ Tidak"], 2);

export const YA_TERANGKAN_KUIZ = buildKeyboard(
  ["✅ Ya, Terangkan", "🧠 Bagi Kuiz", "❌ Tak, Terima Kasih"],
  2
);
