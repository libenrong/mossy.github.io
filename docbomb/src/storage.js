/**
 * Tiny, privacy-friendly persistence layer.
 * Only generated quizzes and local play history are stored; the source document
 * is never persisted. If localStorage is unavailable, everything stays in memory.
 */

const KEYS = {
  callsign: 'docbomb.callsign.v1',
  history: 'docbomb.history.v1',
  muted: 'docbomb.muted.v1',
  last: 'docbomb.lastChallenge.v1',
};

const memory = new Map();
let available = true;

try {
  const probe = '__docbomb_probe__';
  window.localStorage.setItem(probe, '1');
  window.localStorage.removeItem(probe);
} catch {
  available = false;
}

function readRaw(key) {
  if (!available) return memory.get(key) ?? null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key, value) {
  memory.set(key, value);
  if (!available) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Quota or private mode — keep the in-memory copy and move on.
  }
}

function readJson(key, fallback) {
  const raw = readRaw(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  writeRaw(key, JSON.stringify(value));
}

export const store = {
  isAvailable: () => available,

  getCallsign() {
    const value = readRaw(KEYS.callsign);
    return typeof value === 'string' ? value.slice(0, 20) : '';
  },

  setCallsign(value) {
    const clean = String(value || '').trim().slice(0, 20);
    if (clean) writeRaw(KEYS.callsign, clean);
    else writeRaw(KEYS.callsign, '');
  },

  getMuted() {
    return readRaw(KEYS.muted) === '1';
  },

  setMuted(muted) {
    writeRaw(KEYS.muted, muted ? '1' : '0');
  },

  getHistory() {
    const list = readJson(KEYS.history, []);
    return Array.isArray(list) ? list.slice(0, 12) : [];
  },

  addHistory(entry) {
    const list = this.getHistory().filter((item) => item && item.id !== entry.id);
    list.unshift(entry);
    writeJson(KEYS.history, list.slice(0, 12));
  },

  clearHistory() {
    writeJson(KEYS.history, []);
  },

  saveLastChallenge(challenge) {
    if (!challenge || !Array.isArray(challenge.questions)) return;
    writeJson(KEYS.last, challenge);
  },

  getLastChallenge() {
    const value = readJson(KEYS.last, null);
    if (!value || !Array.isArray(value.questions) || value.questions.length < 5) return null;
    return value;
  },
};
