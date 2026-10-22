/**
 * Session state store (in-memory).
 * For production, swap with Redis or a DB.
 */

const sessions = new Map();

const DEFAULT_STATE = () => ({
  flow: "idle",
  fallbackCount: 0,
  pausedUntil: 0,
  quiz: null,
});

export function getSession(chatId) {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, DEFAULT_STATE());
  }
  return sessions.get(chatId);
}

export function resetSession(chatId) {
  sessions.set(chatId, DEFAULT_STATE());
}

export function setFlow(chatId, flow) {
  getSession(chatId).flow = flow;
}

export function getFlow(chatId) {
  return getSession(chatId).flow;
}

export function incrementFallback(chatId) {
  const s = getSession(chatId);
  s.fallbackCount += 1;
  return s.fallbackCount;
}

export function resetFallback(chatId) {
  getSession(chatId).fallbackCount = 0;
}

export function pauseSession(chatId, durationMs = 5 * 60 * 1000) {
  getSession(chatId).pausedUntil = Date.now() + durationMs;
}

export function isPaused(chatId) {
  const s = getSession(chatId);
  return Date.now() < s.pausedUntil;
}

export function startQuiz(chatId, topic, questions) {
  getSession(chatId).quiz = { topic, questions, index: 0, score: 0 };
}

export function getQuiz(chatId) {
  return getSession(chatId).quiz;
}

export function advanceQuiz(chatId, correct) {
  const q = getSession(chatId).quiz;
  if (!q) return null;
  if (correct) q.score += 1;
  q.index += 1;
  return q;
}

export function endQuiz(chatId) {
  const s = getSession(chatId);
  const result = s.quiz ? { score: s.quiz.score, total: s.quiz.questions.length } : null;
  s.quiz = null;
  return result;
}
