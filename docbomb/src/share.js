/**
 * Challenge links: the generated quiz is compressed into a URL fragment.
 * Fragments are never sent to the server, so a static host is enough.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64Url(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deflate(text) {
  if (typeof CompressionStream === 'undefined') return null;
  try {
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const buffer = await new Response(stream).arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

async function inflate(bytes) {
  if (typeof DecompressionStream === 'undefined') throw new Error('浏览器不支持解压挑战链接');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const buffer = await new Response(stream).arrayBuffer();
  return decoder.decode(buffer);
}

function cleanText(value, max = 2000) {
  return String(value == null ? '' : value).slice(0, max);
}

function cleanNonNegativeInt(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return fallback;
  return Math.round(number);
}

export function validateChallenge(input) {
  if (!input || typeof input !== 'object') throw new Error('挑战内容无效');
  const questions = Array.isArray(input.questions) ? input.questions : [];
  if (questions.length !== 5) throw new Error('挑战题目数量不对');

  const sanitizedQuestions = questions.map((question, index) => {
    if (!question || typeof question !== 'object') throw new Error('题目格式无效');
    const kind = question.kind === 'boolean' ? 'boolean' : 'choice';
    const options = (Array.isArray(question.options) ? question.options : [])
      .slice(0, 4)
      .map((option) => cleanText(option, 500))
      .filter(Boolean);
    if (kind === 'boolean' && options.length !== 2) throw new Error('判断题选项无效');
    if (kind === 'choice' && options.length !== 4) throw new Error('选择题选项无效');
    const answerIndex = cleanNonNegativeInt(question.answerIndex, -1);
    if (answerIndex < 0 || answerIndex >= options.length) throw new Error('题目答案无效');
    const prompt = cleanText(question.prompt, 2000).trim();
    if (!prompt) throw new Error('题目内容为空');
    return {
      id: cleanText(question.id, 40) || `q${index + 1}`,
      level: index + 1,
      kind,
      tag: cleanText(question.tag, 30) || '材料核对',
      instruction: cleanText(question.instruction, 100) || '选择正确答案',
      prompt,
      options,
      answerIndex,
      correctText: cleanText(question.correctText || options[answerIndex], 500),
      concept: cleanText(question.concept, 60) || '关键概念',
      explanation: cleanText(question.explanation, 2000),
      source: cleanText(question.source, 2000),
    };
  });

  return {
    version: 1,
    kind: 'docbomb-challenge',
    title: cleanText(input.title, 120) || '未命名材料',
    tag: cleanText(input.tag, 30) || '综合材料',
    summary: cleanText(input.summary, 300),
    concepts: (Array.isArray(input.concepts) ? input.concepts : [])
      .slice(0, 10)
      .map((concept) => cleanText(concept, 60))
      .filter(Boolean),
    questions: sanitizedQuestions,
    stats: {
      chars: cleanNonNegativeInt(input.stats?.chars, 0),
      sentences: cleanNonNegativeInt(input.stats?.sentences, 0),
      numbers: cleanNonNegativeInt(input.stats?.numbers, 0),
      readingSeconds: cleanNonNegativeInt(input.stats?.readingSeconds, 40),
      danger: Math.min(5, Math.max(1, cleanNonNegativeInt(input.stats?.danger, 3))),
    },
    by: cleanText(input.by, 20),
    createdAt: cleanText(input.createdAt, 40) || new Date().toISOString(),
  };
}

function compactChallenge(challenge) {
  const sanitized = validateChallenge(challenge);
  return {
    v: 1,
    t: sanitized.title,
    g: sanitized.tag,
    s: sanitized.summary,
    c: sanitized.concepts,
    q: sanitized.questions.map((question) => ({
      k: question.kind,
      t: question.tag,
      i: question.instruction,
      p: question.prompt,
      o: question.options,
      a: question.answerIndex,
      c: question.concept,
      e: question.explanation,
      s: question.source,
    })),
    st: sanitized.stats,
    b: sanitized.by,
    d: sanitized.createdAt,
  };
}

function expandCompact(input) {
  if (!input || typeof input !== 'object') throw new Error('挑战内容无效');
  if (input.v !== 1 || !Array.isArray(input.q)) throw new Error('不支持的挑战版本');
  return validateChallenge({
    version: 1,
    title: input.t,
    tag: input.g,
    summary: input.s,
    concepts: input.c,
    by: input.b,
    createdAt: input.d,
    stats: input.st,
    questions: input.q.map((question, index) => ({
      id: `q${index + 1}`,
      kind: question.k === 'boolean' ? 'boolean' : 'choice',
      tag: question.t,
      instruction: question.i,
      prompt: question.p,
      options: question.o,
      answerIndex: question.a,
      concept: question.c,
      explanation: question.e,
      source: question.s,
    })),
  });
}

export async function encodeChallenge(challenge) {
  const payload = compactChallenge(challenge);
  const json = JSON.stringify(payload);
  const compressed = await deflate(json);
  if (compressed) return `z${bytesToBase64Url(compressed)}`;
  return `u${bytesToBase64Url(encoder.encode(json))}`;
}

export async function decodeChallenge(code) {
  const value = String(code || '').trim();
  if (!value) throw new Error('挑战链接是空的');
  const prefix = value[0];
  const body = value.slice(1);
  if (!body) throw new Error('挑战链接缺少内容');
  let json;
  try {
    if (prefix === 'z') json = await inflate(base64UrlToBytes(body));
    else if (prefix === 'u') json = decoder.decode(base64UrlToBytes(body));
    else json = decoder.decode(base64UrlToBytes(value));
  } catch {
    throw new Error('挑战链接损坏了');
  }

  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('挑战链接损坏了');
  }
  if (parsed && parsed.v === 1 && Array.isArray(parsed.q)) return expandCompact(parsed);
  return validateChallenge(parsed);
}

export function buildChallengeUrl(code) {
  const url = new URL(window.location.href);
  url.hash = '';
  url.search = '';
  return `${url.toString()}#c=${code}`;
}

export async function createChallengeUrl(challenge) {
  const code = await encodeChallenge(challenge);
  return {
    code,
    url: buildChallengeUrl(code),
    size: code.length,
  };
}

export function readChallengeCode() {
  const hash = window.location.hash || '';
  if (hash.startsWith('#c=')) return hash.slice(3);
  const params = new URLSearchParams(window.location.search);
  return params.get('c') || '';
}

export function clearChallengeHash() {
  const url = new URL(window.location.href);
  url.hash = '';
  url.searchParams.delete('c');
  window.history.replaceState({}, '', `${url.pathname}${url.search}`);
}
