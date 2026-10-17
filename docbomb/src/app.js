import {
  generateChallenge,
  getSampleDocs,
  gradeResult,
  hashString,
  makeSerial,
  pickSnark,
} from './engine.js';
import { createChallengeUrl, decodeChallenge, readChallengeCode, clearChallengeHash } from './share.js';
import { store } from './storage.js';
import { SoundKit } from './audio.js';
import { downloadCertificate } from './certificate.js';

const TOTAL_TIME = 180;
const QUESTION_TIME = 15;
const OPTION_COLORS = ['#9fdc95', '#6cb6e0', '#d6a0c2', '#e8b04b'];
const WIRE_COLORS = ['#9fdc95', '#6cb6e0', '#d6a0c2', '#a99be0', '#e06c5c'];
const DANGER_WORDS = ['一', '二', '三', '四', '五'];
const SAMPLES = getSampleDocs();

const state = {
  view: 'home',
  mode: 'solo',
  sender: '',
  challenge: null,
  serial: '',
  game: null,
  result: null,
  callsign: store.getCallsign(),
  muted: store.getMuted(),
  activeSampleId: null,
  shareCache: null,
  toastTimer: 0,
  snarkTimer: 0,
  analysisToken: 0,
};

const sound = new SoundKit({ muted: state.muted });
const el = {};

function byId(id) {
  return document.getElementById(id);
}

function cacheElements() {
  const ids = [
    'materialInput',
    'generateBtn',
    'charCount',
    'sampleChips',
    'dropZone',
    'uploadTrigger',
    'fileInput',
    'consoleStatus',
    'payloadConsole',
    'siteHeader',
    'analysisOverlay',
    'analysisPct',
    'analysisBar',
    'analysisLines',
    'analysisStatus',
    'briefingBack',
    'briefingTag',
    'briefingSerial',
    'briefingTitle',
    'briefingSummary',
    'briefingConcepts',
    'briefingChars',
    'briefingRead',
    'briefingDangerText',
    'briefingDanger',
    'briefingQuestions',
    'briefingSenderBanner',
    'startMissionBtn',
    'gameMissionTitle',
    'deviceSerial',
    'mobileMasterTimer',
    'mobileSpeed',
    'mobileCut',
    'bombState',
    'masterTimer',
    'speedLabel',
    'cutCount',
    'wireHint',
    'wireList',
    'gaugeProgress',
    'speedBars',
    'questionLevel',
    'questionTag',
    'questionClock',
    'questionSeconds',
    'levelProgress',
    'questionInstruction',
    'questionPrompt',
    'optionList',
    'questionIdle',
    'feedbackArea',
    'feedbackCard',
    'feedbackKicker',
    'feedbackTitle',
    'feedbackText',
    'feedbackMeta',
    'continueBtn',
    'gameCorrect',
    'gameWrong',
    'gameSpeed',
    'questionPanel',
    'quitGameBtn',
    'failOverlay',
    'failText',
    'failCorrect',
    'failWrong',
    'failTime',
    'retryBtn',
    'failHomeBtn',
    'resultTitleText',
    'resultSub',
    'resultByline',
    'resultGrade',
    'resultRank',
    'certSerial',
    'certNumber',
    'certCallsign',
    'certTitle',
    'certBombCount',
    'certCorrect',
    'certTime',
    'certScore',
    'certGrade',
    'certDate',
    'resultScore',
    'resultStats',
    'callsignInput',
    'shareChallengeBtn',
    'downloadCertBtn',
    'replayBtn',
    'newMissionBtn',
    'reviewCards',
    'flipAllBtn',
    'shareDialog',
    'shareLink',
    'copyShareBtn',
    'shareHint',
    'nativeShareBtn',
    'quitDialog',
    'confirmQuitBtn',
    'cancelQuitBtn',
    'helpDialog',
    'toast',
    'snarkToast',
    'snarkText',
    'damageFlash',
    'challengeSender',
    'challengeTitle',
    'challengeTag',
    'challengeMeta',
    'challengeConcepts',
    'acceptChallengeBtn',
    'declineChallengeBtn',
  ];
  for (const id of ids) el[id] = byId(id);
  el.gaugeWrap = document.querySelector('.gauge-wrap');
  el.views = [...document.querySelectorAll('.view')];
  el.homeView = byId('view-home');
  el.historySection = byId('history');
  el.historyList = byId('historyList');
  el.feedbackContinueLabel = el.continueBtn ? el.continueBtn.querySelector('span') : null;
}

/* --------------------------------------------------------------------------
   Small utilities
   -------------------------------------------------------------------------- */

function textChars(value) {
  return Array.from(String(value || '')).length;
}

function pad(value, size = 2) {
  return String(value).padStart(size, '0');
}

function formatClock(seconds) {
  const total = Math.max(0, Math.ceil(Number(seconds) || 0));
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

function formatElapsed(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

function formatDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '2026.01.01';
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${formatDate(date)} / ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function currentCallsign() {
  return state.callsign.trim() || '匿名拆弹员';
}

function elMaker(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function svgUse(id, className = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  if (className) svg.setAttribute('class', className);
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#${id}`);
  svg.appendChild(use);
  return svg;
}

function setStatusHTML(target, text) {
  if (!target) return;
  target.replaceChildren();
  const dot = document.createElement('i');
  target.append(dot, document.createTextNode(` ${text}`));
}

function showToast(message, kind = 'info', duration = 3200) {
  if (!el.toast) return;
  window.clearTimeout(state.toastTimer);
  el.toast.hidden = false;
  el.toast.className = `toast${kind === 'error' ? ' is-error' : kind === 'success' ? ' is-success' : ''}`;
  el.toast.textContent = message;
  // Restart the entrance animation for consecutive messages.
  el.toast.style.animation = 'none';
  void el.toast.offsetWidth;
  el.toast.style.animation = '';
  state.toastTimer = window.setTimeout(() => {
    el.toast.hidden = true;
  }, duration);
}

function showSnark(message) {
  if (!el.snarkToast) return;
  window.clearTimeout(state.snarkTimer);
  el.snarkToast.hidden = false;
  el.snarkText.textContent = message;
  el.snarkToast.style.animation = 'none';
  void el.snarkToast.offsetWidth;
  el.snarkToast.style.animation = '';
  state.snarkTimer = window.setTimeout(() => {
    el.snarkToast.hidden = true;
  }, 4300);
}

function triggerDamage() {
  if (!el.damageFlash) return;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.damageFlash.classList.remove('is-active');
  void el.damageFlash.offsetWidth;
  el.damageFlash.classList.add('is-active');
  if (!reduce) {
    document.body.classList.remove('is-shaking');
    void document.body.offsetWidth;
    document.body.classList.add('is-shaking');
    window.setTimeout(() => document.body.classList.remove('is-shaking'), 560);
  }
  window.setTimeout(() => el.damageFlash.classList.remove('is-active'), 650);
}

function hideSnark() {
  window.clearTimeout(state.snarkTimer);
  if (el.snarkToast) el.snarkToast.hidden = true;
}

function updateBodyLock() {
  const dialogOpen = Boolean(document.querySelector('dialog[open]'));
  const overlayOpen = (el.analysisOverlay && !el.analysisOverlay.hidden) || (el.failOverlay && !el.failOverlay.hidden);
  document.body.classList.toggle('modal-open', dialogOpen || overlayOpen);
}

async function copyText(value) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the textarea method.
  }
  const area = document.createElement('textarea');
  area.value = value;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.left = '-9999px';
  area.style.top = '0';
  document.body.appendChild(area);
  area.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }
  area.remove();
  return copied;
}

/* --------------------------------------------------------------------------
   Sound / modals / navigation
   -------------------------------------------------------------------------- */

function updateSoundUI() {
  document.body.classList.toggle('is-muted', state.muted);
  sound.setMuted(state.muted);
  document.querySelectorAll('[data-sound-toggle]').forEach((button) => {
    button.setAttribute('aria-label', state.muted ? '开启音效' : '关闭音效');
    button.setAttribute('aria-pressed', String(!state.muted));
  });
}

function toggleSound() {
  state.muted = !state.muted;
  store.setMuted(state.muted);
  updateSoundUI();
  if (!state.muted) {
    sound.ensureContext();
    sound.click();
    showToast('音效已开启。引信会开始说话了。', 'success', 1800);
  } else {
    showToast('音效已关闭。世界安静了。', 'info', 1800);
  }
}

function openDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.showModal === 'function') {
    if (!dialog.open) dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }
  updateBodyLock();
}

function closeDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
  updateBodyLock();
}

function bindDialogCloseButtons() {
  document.querySelectorAll('dialog').forEach((dialog) => {
    dialog.addEventListener('close', () => {
      updateBodyLock();
      if (dialog === el.quitDialog && state.game && state.game.running) {
        state.game.paused = false;
        state.game.lastNow = performance.now();
      }
    });
    dialog.addEventListener('cancel', () => {
      window.setTimeout(updateBodyLock, 0);
    });
  });
}

function showView(name) {
  state.view = name;
  el.views.forEach((view) => {
    view.classList.toggle('is-active', view.id === `view-${name}`);
  });
  document.body.classList.toggle('game-mode', name === 'game');
  document.body.classList.toggle('challenge-mode', name === 'challenge');
  if (name !== 'game') {
    el.failOverlay.hidden = true;
    hideSnark();
  }
  updateBodyLock();
  window.scrollTo({ top: 0, behavior: 'auto' });
  if (name === 'home') {
    renderHistory();
    updateMaterialUI();
  }
}

function goHome() {
  if (state.game && state.game.running) {
    openQuitDialog();
    return;
  }
  if (state.game) {
    state.game.running = false;
    if (state.game.raf) cancelAnimationFrame(state.game.raf);
    state.game = null;
  }
  state.mode = 'solo';
  state.sender = '';
  state.challenge = null;
  state.shareCache = null;
  el.failOverlay.hidden = true;
  el.analysisOverlay.hidden = true;
  clearChallengeHash();
  document.title = '拆弹笔记 DocBomb — 把无聊文档拆成 3 分钟游戏';
  showView('home');
}

function requestHome() {
  if (state.view === 'game' && state.game && state.game.running) {
    openQuitDialog();
    return;
  }
  goHome();
}

function focusPayload() {
  if (state.view !== 'home') goHome();
  window.setTimeout(() => {
    el.payloadConsole.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.materialInput.focus({ preventScroll: true });
  }, 70);
}

function goToHistory() {
  if (state.view !== 'home') goHome();
  window.setTimeout(() => {
    const top = el.historySection.getBoundingClientRect().top + window.scrollY - 92;
    window.scrollTo({ top, behavior: 'smooth' });
  }, 90);
}

function openHelp() {
  sound.ensureContext();
  sound.click();
  openDialog(el.helpDialog);
}

function openQuitDialog() {
  if (!state.game || !state.game.running) {
    goHome();
    return;
  }
  state.game.paused = true;
  sound.click();
  openDialog(el.quitDialog);
}

function confirmQuit() {
  closeDialog(el.quitDialog);
  if (state.game) {
    state.game.running = false;
    if (state.game.raf) cancelAnimationFrame(state.game.raf);
    state.game = null;
  }
  document.body.classList.remove('modal-open');
  goHome();
}

/* --------------------------------------------------------------------------
   Home / material
   -------------------------------------------------------------------------- */

function renderSampleChips() {
  el.sampleChips.replaceChildren();
  SAMPLES.forEach((sample) => {
    const button = elMaker('button', 'sample-chip', sample.label);
    button.type = 'button';
    button.dataset.sampleId = sample.id;
    button.addEventListener('click', () => {
      sound.ensureContext();
      sound.click();
      state.activeSampleId = sample.id;
      setMaterial(sample.content);
      showToast(`已装填「${sample.label}」样例。点「开始拆解」。`, 'success', 2200);
    });
    el.sampleChips.appendChild(button);
  });
}

function setMaterial(value) {
  el.materialInput.value = String(value || '').slice(0, 30000);
  updateMaterialUI();
}

function updateMaterialUI() {
  const count = textChars(el.materialInput.value.trim());
  const ready = count >= 60;
  el.charCount.textContent = `${count.toLocaleString('zh-CN')} 字 / 至少 60 字`;
  el.charCount.classList.toggle('is-ready', ready);
  setStatusHTML(el.consoleStatus, ready ? 'LOADED' : 'READY');
  if (state.activeSampleId) {
    const active = SAMPLES.find((sample) => sample.id === state.activeSampleId);
    if (!active || active.content !== el.materialInput.value) {
      state.activeSampleId = null;
    }
  }
  el.sampleChips.querySelectorAll('.sample-chip').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.sampleId === state.activeSampleId);
  });
}

async function handleFile(file) {
  if (!file) return;
  if (!/\.(txt|md|markdown|text)$/i.test(file.name) && !/^text\//.test(file.type)) {
    showToast('目前只吃 .txt / .md 这类纯文本。PDF 先把字复制出来。', 'error');
    return;
  }
  if (file.size > 600 * 1024) {
    showToast('文件有点大。先节选最重要的部分，再装填。', 'error');
    return;
  }
  try {
    const text = await file.text();
    if (textChars(text.trim()) < 60) {
      showToast('这份文件太短，凑不够五枚炸弹。', 'error');
      return;
    }
    state.activeSampleId = null;
    setMaterial(text);
    showToast(`已装入「${file.name}」。`, 'success');
  } catch {
    showToast('读取文件失败。试试直接粘贴文本。', 'error');
  }
}

function bindDropZone() {
  let dragDepth = 0;
  const zone = el.dropZone;
  zone.addEventListener('dragenter', (event) => {
    event.preventDefault();
    dragDepth += 1;
    zone.classList.add('is-dragging');
  });
  zone.addEventListener('dragover', (event) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  });
  zone.addEventListener('dragleave', (event) => {
    event.preventDefault();
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) zone.classList.remove('is-dragging');
  });
  zone.addEventListener('drop', async (event) => {
    event.preventDefault();
    dragDepth = 0;
    zone.classList.remove('is-dragging');
    const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    if (file) {
      await handleFile(file);
      return;
    }
    const text = event.dataTransfer ? event.dataTransfer.getData('text/plain') : '';
    if (text.trim()) {
      state.activeSampleId = null;
      setMaterial(text);
      showToast('材料已入舱。', 'success');
    }
  });
}

async function handleGenerate() {
  const raw = el.materialInput.value;
  const count = textChars(raw.trim());
  if (count < 60) {
    showToast('再塞点材料。至少 60 字，才够埋五枚炸弹。', 'error');
    el.materialInput.focus();
    return;
  }
  if (count > 30000) {
    showToast('材料超过 30,000 字。先节选最想记住的部分。', 'error');
    return;
  }
  if (el.generateBtn.disabled) return;

  sound.ensureContext();
  sound.click();
  const label = el.generateBtn.querySelector('.primary-label');
  const originalLabel = label ? label.textContent : '开始拆解';
  el.generateBtn.disabled = true;
  if (label) label.textContent = '正在埋雷…';

  try {
    const challenge = generateChallenge(raw, {
      seed: (hashString(raw) ^ (Date.now() & 0xffffffff)) >>> 0,
      createdAt: new Date().toISOString(),
    });
    state.challenge = challenge;
    state.mode = 'solo';
    state.sender = '';
    state.serial = makeSerial(challenge.seed, challenge.createdAt);
    state.shareCache = null;
    await runAnalysis(challenge);
    renderBriefing(challenge);
    showView('briefing');
    document.title = `任务简报 · ${challenge.title}`;
  } catch (error) {
    el.analysisOverlay.hidden = true;
    updateBodyLock();
    showToast(error instanceof Error ? error.message : '拆解失败，换段材料试试。', 'error', 4200);
  } finally {
    el.generateBtn.disabled = false;
    if (label) label.textContent = originalLabel;
  }
}

function runAnalysis(challenge) {
  const token = (state.analysisToken += 1);
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = reduce ? 180 : 1950;
  const lines = [
    { at: 0.04, text: `材料入舱 / ${challenge.stats.chars.toLocaleString('zh-CN')} 字 · ${challenge.stats.sentences} 句` },
    { at: 0.25, text: `语义扫描 / 捕获 ${challenge.concepts.length} 个关键概念` },
    { at: 0.48, text: `干扰项生成 / ${challenge.stats.numbers} 个数字参与埋雷` },
    { at: 0.68, text: '炸弹布设 / 5 枚知识炸弹已就位' },
    { at: 0.86, text: '引信校准 / 03:00 · 15 SEC / 每关' },
    { at: 0.96, text: '拆弹协议就绪。请进入任务简报。' },
  ];
  const shown = new Set();
  el.analysisOverlay.hidden = false;
  updateBodyLock();
  el.analysisPct.textContent = '00%';
  el.analysisBar.style.width = '0%';
  el.analysisLines.replaceChildren();
  el.analysisStatus.textContent = '扫描材料中…';

  return new Promise((resolve) => {
    const started = performance.now();
    const frame = (now) => {
      if (token !== state.analysisToken) {
        resolve();
        return;
      }
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.analysisPct.textContent = `${pad(Math.round(eased * 100))}%`;
      el.analysisBar.style.width = `${eased * 100}%`;
      for (const line of lines) {
        if (progress >= line.at && !shown.has(line.text)) {
          shown.add(line.text);
          const row = elMaker('div', 'analysis-line', line.text);
          el.analysisLines.appendChild(row);
          if (line.at === 0.25) el.analysisStatus.textContent = '提炼关键概念…';
          if (line.at === 0.48) el.analysisStatus.textContent = '布置干扰项…';
          if (line.at === 0.68) el.analysisStatus.textContent = '给炸弹接线…';
          if (line.at === 0.86) el.analysisStatus.textContent = '校准倒计时…';
          if (line.at === 0.96) el.analysisStatus.textContent = '准备完毕。';
        }
      }
      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        window.setTimeout(() => {
          if (token !== state.analysisToken) {
            resolve();
            return;
          }
          el.analysisOverlay.hidden = true;
          updateBodyLock();
          resolve();
        }, reduce ? 10 : 220);
      }
    };
    requestAnimationFrame(frame);
  });
}

/* --------------------------------------------------------------------------
   Briefing
   -------------------------------------------------------------------------- */

function renderBriefing(challenge) {
  if (!challenge || !Array.isArray(challenge.questions) || challenge.questions.length !== 5) {
    showToast('任务数据不完整，重新装填一次吧。', 'error');
    showView('home');
    return;
  }
  state.challenge = challenge;
  state.serial = state.serial || makeSerial(challenge.seed || challenge.title, challenge.createdAt);
  el.briefingTag.textContent = challenge.tag || '综合材料';
  el.briefingSerial.textContent = String(state.serial).split('-').pop() || '00000';
  el.briefingTitle.textContent = challenge.title || '未命名材料';
  el.briefingSummary.textContent = challenge.summary || '已从材料中提炼出 5 个值得记住的关键点。';
  el.briefingChars.textContent = `${(challenge.stats?.chars || 0).toLocaleString('zh-CN')} 字`;
  el.briefingRead.textContent = `约 ${challenge.stats?.readingSeconds || 40} 秒`;
  const danger = Math.min(5, Math.max(1, Number(challenge.stats?.danger) || 3));
  el.briefingDangerText.textContent = `${DANGER_WORDS[danger - 1]}级`;
  [...el.briefingDanger.children].forEach((bar, index) => {
    bar.classList.toggle('is-on', index < danger);
  });
  el.briefingQuestions.textContent = String(challenge.questions.length);
  el.briefingConcepts.replaceChildren();
  (challenge.concepts || []).slice(0, 8).forEach((concept, index) => {
    const chip = elMaker('span', 'concept-chip');
    chip.append(elMaker('i', '', pad(index + 1)), document.createTextNode(concept));
    el.briefingConcepts.appendChild(chip);
  });

  if (state.mode === 'challenge') {
    el.briefingSenderBanner.hidden = false;
    el.briefingSenderBanner.textContent = `来自 ${state.sender || '神秘拆弹员'} 的挑战 · 题目完全相同`;
  } else {
    el.briefingSenderBanner.hidden = true;
  }

  const strong = el.startMissionBtn.querySelector('.start-copy strong');
  const small = el.startMissionBtn.querySelector('.start-copy small');
  if (strong) strong.textContent = state.mode === 'challenge' ? '应战拆弹' : '开始拆弹';
  if (small) small.textContent = state.mode === 'challenge' ? 'ACCEPT THE CHALLENGE. CUT THE WIRE.' : 'PRESS THE BUTTON. CUT THE WIRE.';
  el.failOverlay.hidden = true;
}

/* --------------------------------------------------------------------------
   Game setup and rendering
   -------------------------------------------------------------------------- */

function startGame(challenge) {
  hideSnark();
  if (!challenge || !challenge.questions || challenge.questions.length !== 5) {
    showToast('这局没有可用的题目。', 'error');
    return;
  }
  sound.ensureContext();
  state.challenge = challenge;
  state.serial = state.serial || makeSerial(challenge.seed || challenge.title, challenge.createdAt);
  el.failOverlay.hidden = true;
  updateBodyLock();
  el.gameMissionTitle.textContent = challenge.title || '未命名材料';
  el.deviceSerial.textContent = state.serial;
  el.masterTimer.textContent = formatClock(TOTAL_TIME);
  if (el.mobileMasterTimer) el.mobileMasterTimer.textContent = formatClock(TOTAL_TIME);
  if (el.mobileSpeed) el.mobileSpeed.textContent = '×1.00';
  if (el.mobileCut) el.mobileCut.textContent = '0 / 5';
  el.questionPanel.scrollTop = 0;
  el.optionList.replaceChildren();
  el.feedbackArea.hidden = true;

  const game = {
    challenge,
    questions: challenge.questions,
    index: 0,
    timeLeft: TOTAL_TIME,
    qTimeLeft: QUESTION_TIME,
    speed: 1,
    correctCount: 0,
    wrongCount: 0,
    statuses: Array(challenge.questions.length).fill('pending'),
    answered: false,
    selectedIndex: null,
    running: true,
    paused: false,
    finishing: false,
    failed: false,
    raf: 0,
    lastNow: performance.now(),
    lastQSecond: QUESTION_TIME,
    wireRows: [],
    startedAt: Date.now(),
  };
  state.game = game;

  renderWires();
  renderQuestion();
  syncGameHud();
  showView('game');
  document.title = `拆弹中 · ${challenge.title}`;
  sound.click();
  game.lastNow = performance.now();
  game.raf = requestAnimationFrame(gameLoop);
}

function renderWires() {
  const game = state.game;
  if (!game) return;
  el.wireList.replaceChildren();
  game.wireRows = [];
  game.questions.forEach((question, index) => {
    const row = elMaker('div', 'wire-row');
    row.dataset.index = String(index);
    row.style.setProperty('--wire-color', WIRE_COLORS[index % WIRE_COLORS.length]);
    row.append(
      elMaker('span', 'wire-no', pad(index + 1)),
      (() => {
        const info = elMaker('span', 'wire-info');
        info.append(
          elMaker('b', '', question.tag || '材料核对'),
          elMaker('small', '', String(question.concept || '关键概念').slice(0, 18))
        );
        return info;
      })(),
      (() => {
        const cable = elMaker('span', 'wire-cable');
        cable.append(
          elMaker('i', 'wire-left'),
          elMaker('i', 'wire-right'),
          elMaker('i', 'wire-spark')
        );
        return cable;
      })(),
      elMaker('span', 'wire-state', 'STANDBY')
    );
    row.setAttribute('aria-label', `第 ${index + 1} 根线：${question.tag || '题目'}`);
    game.wireRows.push(row);
    el.wireList.appendChild(row);
  });
  syncWires();
}

function syncWires() {
  const game = state.game;
  if (!game) return;
  let cut = 0;
  game.wireRows.forEach((row, index) => {
    const status = game.statuses[index];
    const isLive = !game.answered && index === game.index && status === 'pending';
    row.classList.toggle('is-live', isLive);
    row.classList.toggle('is-cut', status === 'cut');
    row.classList.toggle('is-burnt', status === 'burnt');
    if (status === 'cut') cut += 1;
    const label = row.querySelector('.wire-state');
    if (label) {
      label.textContent =
        status === 'cut' ? 'CUT' : status === 'burnt' ? 'BURNT' : isLive ? 'LIVE' : 'STANDBY';
    }
  });
  el.cutCount.textContent = `已剪 ${cut} / 5`;
  if (el.wireHint) {
    el.wireHint.textContent =
      game.speed > 1 ? `引信加速 ×${game.speed.toFixed(2)}` : `当前第 ${game.index + 1} 根`;
  }
}

function renderQuestion() {
  const game = state.game;
  if (!game) return;
  const question = game.questions[game.index];
  if (!question) return;

  game.answered = false;
  game.selectedIndex = null;
  game.qTimeLeft = QUESTION_TIME;
  game.lastQSecond = QUESTION_TIME;

  el.questionLevel.textContent = pad(game.index + 1);
  el.questionTag.textContent = question.tag || '材料核对';
  el.questionInstruction.textContent = question.instruction || '选择正确答案';
  el.questionPrompt.textContent = question.prompt;
  el.feedbackArea.hidden = true;
  el.questionIdle.hidden = false;
  el.feedbackCard.classList.remove('is-wrong');
  el.questionClock.classList.remove('is-critical');
  el.questionPanel.scrollTop = 0;

  el.optionList.replaceChildren();
  question.options.forEach((option, index) => {
    const button = elMaker('button', 'option-button');
    button.type = 'button';
    button.style.setProperty('--wire-color', OPTION_COLORS[index % OPTION_COLORS.length]);
    button.dataset.index = String(index);
    const key = elMaker('span', 'option-key', String(index + 1));
    const text = elMaker('span', 'option-text', option);
    const mark = elMaker('span', 'option-wire-mark');
    const stateMark = elMaker('span', 'option-state');
    button.append(key, text, mark, stateMark);
    button.setAttribute('aria-label', `选项 ${index + 1}：${option}`);
    button.addEventListener('click', () => handleAnswer(index, false));
    el.optionList.appendChild(button);
  });

  el.levelProgress.replaceChildren();
  for (let i = 0; i < 5; i += 1) el.levelProgress.appendChild(document.createElement('i'));
  syncProgressDots();
  syncWires();
  updateTimerUI();
  updateSpeedUI();
}

function syncProgressDots() {
  const game = state.game;
  if (!game) return;
  [...el.levelProgress.children].forEach((dot, index) => {
    dot.className = '';
    if (game.statuses[index] === 'cut') dot.classList.add('is-done');
    else if (game.statuses[index] === 'burnt') dot.classList.add('is-burnt');
    else if (index === game.index && !game.answered) dot.classList.add('is-current');
  });
}

function updateTimerUI() {
  const game = state.game;
  if (!game) return;
  const mainPercent = Math.max(0, Math.min(100, (game.timeLeft / TOTAL_TIME) * 100));
  const qPercent = Math.max(0, Math.min(100, (game.qTimeLeft / QUESTION_TIME) * 100));
  el.masterTimer.textContent = formatClock(game.timeLeft);
  if (el.mobileMasterTimer) el.mobileMasterTimer.textContent = formatClock(game.timeLeft);
  el.gaugeProgress.style.setProperty('--main-progress', mainPercent.toFixed(2));
  const critical = game.timeLeft <= 30;
  el.gaugeWrap.classList.toggle('is-critical', critical);
  const bombLabel = critical || game.speed >= 1.75 ? 'CRITICAL' : game.speed > 1 ? 'UNSTABLE' : 'ARMED';
  if (el.bombState.dataset.state !== bombLabel) {
    setStatusHTML(el.bombState, bombLabel);
    el.bombState.dataset.state = bombLabel;
    el.bombState.classList.toggle('is-critical', bombLabel === 'CRITICAL');
  }

  const qSeconds = Math.max(0, Math.ceil(game.qTimeLeft));
  el.questionSeconds.textContent = String(qSeconds);
  el.questionClock.style.setProperty('--q-progress', qPercent.toFixed(2));
  const qCritical = qSeconds <= 5 && !game.answered;
  el.questionClock.classList.toggle('is-critical', qCritical);
  if (!game.answered && qSeconds !== game.lastQSecond) {
    game.lastQSecond = qSeconds;
    if (qSeconds > 0 && qSeconds <= 5) sound.tick(qSeconds <= 3);
  }
}

function updateSpeedUI() {
  const game = state.game;
  if (!game) return;
  el.speedLabel.textContent = `速度 ×${game.speed.toFixed(2)}`;
  el.gameSpeed.textContent = `×${game.speed.toFixed(2)}`;
  if (el.mobileSpeed) el.mobileSpeed.textContent = `×${game.speed.toFixed(2)}`;
  if (el.mobileCut) el.mobileCut.textContent = `${game.correctCount} / 5`;
  el.gameCorrect.textContent = String(game.correctCount);
  el.gameWrong.textContent = String(game.wrongCount);
  const active = Math.max(1, Math.min(5, Math.round((game.speed - 1) / 0.25) + 1));
  [...el.speedBars.children].forEach((bar, index) => {
    bar.className = '';
    if (index < active) {
      if (active >= 5) bar.className = 'danger';
      else if (active >= 3) bar.className = 'warn';
      else bar.className = 'on';
    }
  });
}

function syncGameHud() {
  syncWires();
  syncProgressDots();
  updateSpeedUI();
}

function gameLoop(now) {
  const game = state.game;
  if (!game || !game.running) return;
  const dt = Math.min(0.25, Math.max(0, (now - game.lastNow) / 1000));
  game.lastNow = now;
  if (!game.paused && !game.answered) {
    game.timeLeft = Math.max(0, game.timeLeft - dt * game.speed);
    game.qTimeLeft = Math.max(0, game.qTimeLeft - dt);
    updateTimerUI();
    if (game.timeLeft <= 0.01) {
      failGame();
      return;
    }
    if (game.qTimeLeft <= 0) {
      handleAnswer(-1, true);
    }
  }
  if (game.running) game.raf = requestAnimationFrame(gameLoop);
}

/* --------------------------------------------------------------------------
   Answering
   -------------------------------------------------------------------------- */

function handleAnswer(index, timedOut = false) {
  const game = state.game;
  if (!game || !game.running || game.answered || game.paused) return;
  const question = game.questions[game.index];
  if (!question) return;
  const correct = !timedOut && index === question.answerIndex;
  game.answered = true;
  game.selectedIndex = timedOut ? null : index;
  game.qTimeLeft = timedOut ? 0 : game.qTimeLeft;

  const buttons = [...el.optionList.querySelectorAll('.option-button')];
  buttons.forEach((button, buttonIndex) => {
    button.disabled = true;
    const mark = button.querySelector('.option-state');
    if (buttonIndex === question.answerIndex) {
      button.classList.add('is-correct');
      if (mark) mark.textContent = '✓';
    } else if (!timedOut && buttonIndex === index) {
      button.classList.add('is-wrong');
      if (mark) mark.textContent = '×';
    } else {
      button.classList.add('is-dimmed');
    }
  });

  if (correct) {
    game.correctCount += 1;
    game.statuses[game.index] = 'cut';
    sound.cut();
  } else {
    game.wrongCount += 1;
    game.statuses[game.index] = 'burnt';
    game.speed = Math.min(2, Math.round((game.speed + 0.25) * 100) / 100);
    sound.wrong();
    triggerDamage();
    showSnark(pickSnark(`${question.id}-${game.index}-${game.timeLeft.toFixed(1)}-${Date.now()}`));
  }

  syncWires();
  syncProgressDots();
  updateSpeedUI();
  updateTimerUI();

  const isLast = game.index >= game.questions.length - 1;
  const correctText = question.options[question.answerIndex];
  el.questionIdle.hidden = true;
  el.feedbackArea.hidden = false;
  el.feedbackCard.classList.toggle('is-wrong', !correct);
  el.feedbackKicker.textContent = correct
    ? 'WIRE CUT / 线路切断'
    : timedOut
      ? 'FUSE BURNED / 引信烧尽'
      : 'WRONG WIRE / 剪错线路';
  el.feedbackTitle.textContent = correct
    ? '+1 知识已拆除'
    : timedOut
      ? '这一根，没来得及剪。'
      : `引信速度提升至 ×${game.speed.toFixed(2)}`;
  el.feedbackText.textContent = correct
    ? question.explanation || `正确。${correctText}`
    : `正确答案是「${correctText}」。${question.explanation || ''}`;
  el.feedbackMeta.textContent = correct
    ? `引信已暂停 · 剩余 ${formatClock(game.timeLeft)}`
    : `引信已加速 ×${game.speed.toFixed(2)} · 剩余 ${formatClock(game.timeLeft)}`;
  if (el.feedbackContinueLabel) {
    el.feedbackContinueLabel.textContent = isLast ? '领取拆弹证书' : '剪下一根线';
  }
  window.setTimeout(() => {
    if (el.questionPanel.scrollHeight > el.questionPanel.clientHeight + 20) {
      el.questionPanel.scrollTo({ top: el.questionPanel.scrollHeight, behavior: 'smooth' });
    }
    el.continueBtn.focus({ preventScroll: true });
  }, 90);
}

function continueGame() {
  const game = state.game;
  if (!game || !game.running || !game.answered) return;
  sound.click();
  if (game.index >= game.questions.length - 1) {
    finishGame();
    return;
  }
  game.index += 1;
  game.answered = false;
  game.selectedIndex = null;
  el.feedbackArea.hidden = true;
  renderQuestion();
  el.questionPanel.scrollTop = 0;
}

function finishGame() {
  const game = state.game;
  if (!game || game.finishing) return;
  game.finishing = true;
  game.running = false;
  if (game.raf) cancelAnimationFrame(game.raf);
  const result = gradeResult(game.correctCount, game.questions.length, game.timeLeft, game.wrongCount);
  const completedAt = new Date();
  const serial = state.serial || makeSerial(game.challenge.seed || game.challenge.title, completedAt);
  const outcome = {
    ...result,
    correctCount: game.correctCount,
    wrongCount: game.wrongCount,
    total: game.questions.length,
    timeLeft: game.timeLeft,
    serial,
    challenge: game.challenge,
    mode: state.mode,
    sender: state.sender,
    completedAt: completedAt.toISOString(),
    elapsed: TOTAL_TIME - game.timeLeft,
  };
  state.result = outcome;
  state.serial = serial;

  const historyEntry = {
    id: `${serial}-${Date.now()}`,
    title: game.challenge.title,
    tag: game.challenge.tag,
    correctCount: game.correctCount,
    wrongCount: game.wrongCount,
    total: game.questions.length,
    secondsLeft: game.timeLeft,
    score: result.score,
    grade: result.grade,
    createdAt: completedAt.toISOString(),
    challenge: game.challenge,
  };
  store.addHistory(historyEntry);
  store.saveLastChallenge(game.challenge);
  store.setCallsign(state.callsign);

  renderResult(outcome);
  showView('result');
  document.title = `拆弹证书 · ${game.challenge.title}`;
  sound.win();
}

function failGame() {
  const game = state.game;
  if (!game || game.finishing || game.failed) return;
  game.failed = true;
  game.running = false;
  if (game.raf) cancelAnimationFrame(game.raf);
  sound.lose();
  hideSnark();
  el.failCorrect.textContent = `${game.correctCount} / 5`;
  el.failWrong.textContent = String(game.wrongCount);
  el.failTime.textContent = formatElapsed(Math.max(0, TOTAL_TIME - game.timeLeft));
  el.failText.textContent =
    game.wrongCount >= 3
      ? '主引信烧到了头。材料赢了这一局，但它也没剩多少尊严。'
      : '主引信烧到了头。知识没炸，但你的面子可能有点。';
  el.failOverlay.hidden = false;
  updateBodyLock();
  window.setTimeout(() => el.retryBtn.focus({ preventScroll: true }), 50);
}

/* --------------------------------------------------------------------------
   Result
   -------------------------------------------------------------------------- */

function titleForResult(result) {
  if (result.correctCount === 5) return '拆弹成功';
  if (result.correctCount >= 3) return '活着出来了';
  return '拆完了';
}

function subtitleForResult(result) {
  if (result.correctCount === 5) return '五根线，五次判断。你从这份材料里活着走了出来。';
  if (result.correctCount >= 3) {
    return `你带着 ${result.wrongCount} 处灼伤完成了拆弹。材料没赢，但也没完全输。`;
  }
  return '拆完了，但知识显然还留在材料里。建议认真翻翻下面那五张卡片。';
}

function assessmentFor(result) {
  if (result.grade === 'S') return '全对通关，材料已被彻底拆解。建议立刻炫耀，并重读一遍以确认不是运气。';
  if (result.grade === 'A') return '判断稳定，引信只被擦伤了一点点。可以出师，但别忘了复习。';
  if (result.grade === 'B') return '有惊无险。知识的大部分已经搬进脑子，剩下的小部分在卡片背面。';
  if (result.grade === 'C') return '活着出来了。建议翻完五张复习卡，再拆一次，看看能不能拆得体面一点。';
  return '完成拆弹，但知识基本全身而退。材料没记住，至少记住了拆弹失败的手感。';
}

function renderResult(result) {
  const challenge = result.challenge;
  state.shareCache = null;
  el.resultTitleText.textContent = titleForResult(result);
  el.resultSub.textContent = subtitleForResult(result);
  el.resultGrade.textContent = result.grade;
  el.resultRank.textContent = result.rank;
  el.resultScore.textContent = pad(result.score, 3);

  el.resultByline.replaceChildren();
  const bylineItems = [challenge.tag || '综合材料', `${(challenge.stats?.chars || 0).toLocaleString('zh-CN')} 字材料`];
  if (result.mode === 'challenge' && result.sender) bylineItems.push(`应战 ${result.sender} 的挑战`);
  bylineItems.forEach((text) => el.resultByline.appendChild(elMaker('span', '', text)));

  el.certSerial.textContent = result.serial;
  el.certNumber.textContent = String(result.serial).split('-').pop() || '00000';
  el.certCallsign.textContent = currentCallsign();
  el.certTitle.textContent = challenge.title || '未命名材料';
  el.certBombCount.textContent =
    result.correctCount === result.total
      ? `${result.total} 枚知识炸弹`
      : `${result.correctCount} / ${result.total} 枚知识炸弹`;
  el.certCorrect.textContent = `${result.correctCount} / ${result.total}`;
  el.certTime.textContent = formatClock(result.timeLeft);
  el.certScore.textContent = String(result.score);
  el.certGrade.textContent = result.grade;
  el.certDate.textContent = formatDate(result.completedAt);

  el.callsignInput.value = state.callsign;
  el.callsignInput.placeholder = '匿名拆弹员';

  el.resultStats.replaceChildren();
  const breakdown = [
    ['正确拆除', `${result.correctCount} / ${result.total}`],
    ['失误加速', `${result.wrongCount} 次`],
    ['剩余时间', formatClock(result.timeLeft)],
    ['引信速度', `×${Math.min(2, 1 + result.wrongCount * 0.25).toFixed(2)}`],
  ];
  breakdown.forEach(([label, value]) => {
    const block = elMaker('div');
    block.append(elMaker('span', '', label), elMaker('strong', '', value));
    el.resultStats.appendChild(block);
  });

  renderReviewCards(challenge.questions);
  el.flipAllBtn.textContent = '全部翻面';
  el.shareHint.textContent = '生成挑战链接后，对方会拿到完全相同的题目。';
  el.shareLink.value = '';
  el.copyShareBtn.disabled = true;
  el.failOverlay.hidden = true;
  updateBodyLock();
}

function renderReviewCards(questions) {
  el.reviewCards.replaceChildren();
  questions.forEach((question, index) => {
    const card = elMaker('button', 'review-card');
    card.type = 'button';
    card.setAttribute('aria-pressed', 'false');
    card.setAttribute('aria-label', `第 ${index + 1} 张复习卡，点击翻面查看答案`);
    const inner = elMaker('span', 'review-inner');

    const front = elMaker('span', 'review-face review-front');
    front.dataset.card = pad(index + 1);
    const frontTop = elMaker('span', 'review-card-top');
    frontTop.append(elMaker('span', '', `CARD ${pad(index + 1)}`), elMaker('span', 'review-type', question.tag || '材料核对'));
    const concept = elMaker('span', 'review-concept', `CONCEPT / ${question.concept || '关键概念'}`);
    const prompt = elMaker('span', 'review-question', question.prompt);
    const options = elMaker('span', 'review-options');
    question.options.forEach((option, optionIndex) => {
      const row = elMaker('span', 'review-option');
      row.append(elMaker('i', '', String.fromCharCode(65 + optionIndex)), elMaker('span', '', option));
      options.appendChild(row);
    });
    const hint = elMaker('span', 'review-flip-hint', '点击翻面看答案');
    front.append(frontTop, concept, prompt, options, hint);

    const back = elMaker('span', 'review-face review-back');
    const backTop = elMaker('span', 'review-card-top');
    backTop.append(elMaker('span', '', `ANSWER ${pad(index + 1)}`), elMaker('span', 'review-type', '原文出处'));
    const answer = elMaker('span', 'review-answer');
    answer.append(
      elMaker('span', '', '正确接线 / CORRECT WIRE'),
      elMaker('strong', '', question.correctText)
    );
    const explanation = elMaker('span', 'review-explanation', question.explanation || '答案是材料里的原话。');
    const source = elMaker('span', 'review-source', `SOURCE / ${question.source || question.prompt}`);
    const footer = elMaker('span', 'review-footer');
    footer.append(elMaker('span', '', '点击翻回'), elMaker('span', '', `DB / ${pad(index + 1)}`));
    back.append(backTop, answer, explanation, source, footer);

    inner.append(front, back);
    card.appendChild(inner);
    card.addEventListener('click', () => {
      card.classList.toggle('is-flipped');
      card.setAttribute('aria-pressed', String(card.classList.contains('is-flipped')));
      updateFlipAllLabel();
    });
    el.reviewCards.appendChild(card);
  });
}

function updateFlipAllLabel() {
  const cards = [...el.reviewCards.querySelectorAll('.review-card')];
  if (!cards.length) return;
  const allFlipped = cards.every((card) => card.classList.contains('is-flipped'));
  el.flipAllBtn.textContent = allFlipped ? '全部翻回' : '全部翻面';
}

function flipAllCards() {
  const cards = [...el.reviewCards.querySelectorAll('.review-card')];
  const allFlipped = cards.length > 0 && cards.every((card) => card.classList.contains('is-flipped'));
  cards.forEach((card) => {
    card.classList.toggle('is-flipped', !allFlipped);
    card.setAttribute('aria-pressed', String(!allFlipped));
  });
  updateFlipAllLabel();
}

async function handleDownloadCertificate() {
  if (!state.result) return;
  const button = el.downloadCertBtn;
  if (button.disabled) return;
  button.disabled = true;
  try {
    await downloadCertificate({
      callsign: currentCallsign(),
      title: state.result.challenge.title,
      serial: state.result.serial,
      date: formatDate(state.result.completedAt),
      correctCount: state.result.correctCount,
      correct: `${state.result.correctCount} / ${state.result.total}`,
      timeLeft: formatClock(state.result.timeLeft),
      score: state.result.score,
      grade: state.result.grade,
      rank: state.result.rank,
      assessment: assessmentFor(state.result),
    });
    showToast('证书已盖章并下载。建议打印出来贴在工位上。', 'success', 4200);
  } catch (error) {
    showToast(error instanceof Error ? error.message : '证书生成失败。', 'error');
  } finally {
    button.disabled = false;
  }
}

async function handleShareChallenge() {
  if (!state.result || !state.result.challenge) return;
  openDialog(el.shareDialog);
  el.shareLink.value = '正在压缩题目，装进信封…';
  el.copyShareBtn.disabled = true;
  el.shareHint.textContent = '生成挑战链接后，对方会拿到完全相同的五道题。';
  el.nativeShareBtn.hidden = typeof navigator.share !== 'function';

  try {
    if (!state.shareCache || state.shareCache.by !== currentCallsign()) {
      const shareChallenge = {
        ...state.result.challenge,
        by: currentCallsign(),
      };
      const generated = await createChallengeUrl(shareChallenge);
      state.shareCache = { ...generated, by: currentCallsign() };
    }
    el.shareLink.value = state.shareCache.url;
    el.copyShareBtn.disabled = false;
    const local =
      window.location.protocol === 'file:' ||
      ['localhost', '127.0.0.1', '::1', '[::1]'].includes(window.location.hostname);
    if (local) {
      el.shareHint.textContent = '当前是本机预览地址。把网站部署到公网后，朋友才能打开这个链接。';
    } else if (state.shareCache.size > 10000) {
      el.shareHint.textContent = '题目已装进链接，但材料较长，链接也偏长。复制后发送即可。';
    } else {
      el.shareHint.textContent = `链接已包含全部题目（${state.shareCache.size.toLocaleString('zh-CN')} 字符），不需要服务器。`;
    }
  } catch (error) {
    closeDialog(el.shareDialog);
    showToast(error instanceof Error ? error.message : '挑战链接生成失败。', 'error');
  }
}

async function shareNative() {
  const url = el.shareLink.value;
  if (!url || !navigator.share) return;
  try {
    await navigator.share({
      title: `来拆这枚知识炸弹：${state.result?.challenge?.title || 'DocBomb'}`,
      text: '同样的材料，同样的五道题。看看你能不能活着拆完。',
      url,
    });
  } catch (error) {
    if (error && error.name !== 'AbortError') showToast('系统分享没有成功，复制链接也一样。', 'error');
  }
}

async function copyShareLink() {
  const value = el.shareLink.value;
  if (!value || value.startsWith('正在')) return;
  const copied = await copyText(value);
  if (copied) {
    showToast('挑战链接已复制。去丢给一个朋友吧。', 'success', 2800);
  } else {
    el.shareLink.focus();
    el.shareLink.select();
    showToast('自动复制被拦住，链接已选中，按 ⌘/Ctrl+C。', 'error', 3500);
  }
}

/* --------------------------------------------------------------------------
   History
   -------------------------------------------------------------------------- */

function renderHistory() {
  if (!el.historyList) return;
  const records = store.getHistory();
  el.historyList.replaceChildren();
  if (!records.length) {
    const wrapper = elMaker('div', 'history-empty');
    const copy = elMaker('div', 'history-empty-copy');
    copy.append(
      elMaker('strong', '', '还没有爆过的材料。'),
      elMaker('p', '', '第一次拆弹，通常从一份你早就想忘掉的 PDF 开始。记录只留在这台设备上。')
    );
    const action = elMaker('button', 'text-button', '装填第一份材料 →');
    action.type = 'button';
    action.addEventListener('click', focusPayload);
    copy.appendChild(action);
    const stack = elMaker('div', 'redacted-stack');
    stack.append(
      elMaker('span', 'redacted-label', 'NO RECORDS / 暂无档案'),
      document.createElement('i'),
      document.createElement('i'),
      document.createElement('i'),
      document.createElement('i')
    );
    wrapper.append(copy, stack);
    el.historyList.appendChild(wrapper);
    return;
  }

  records.slice(0, 8).forEach((record) => {
    const row = elMaker('button', 'history-row');
    row.type = 'button';
    row.title = '重新查看这份材料的任务简报';
    row.append(
      elMaker('span', 'history-date', formatDateTime(record.createdAt)),
      (() => {
        const main = elMaker('span', 'history-main');
        main.append(elMaker('strong', '', record.title || '未命名材料'), elMaker('span', '', record.tag || '综合材料'));
        return main;
      })(),
      (() => {
        const stats = elMaker('span', 'history-stats');
        const correct = elMaker('span');
        correct.append(document.createTextNode('正确 '), elMaker('b', '', `${record.correctCount}/${record.total || 5}`));
        const remaining = elMaker('span');
        remaining.append(elMaker('b', '', formatClock(record.secondsLeft)), document.createTextNode(' 剩余'));
        stats.append(correct, remaining);
        return stats;
      })(),
      elMaker('span', 'history-grade', record.grade || '—'),
      elMaker('span', 'history-arrow', '↗')
    );
    row.addEventListener('click', () => {
      if (!record.challenge || !Array.isArray(record.challenge.questions) || record.challenge.questions.length !== 5) {
        showToast('这条记录只保存了摘要，重新装填材料才能再拆一次。', 'error');
        return;
      }
      sound.ensureContext();
      sound.click();
      state.challenge = record.challenge;
      state.mode = 'solo';
      state.sender = '';
      state.serial = makeSerial(record.challenge.seed || record.challenge.title, record.challenge.createdAt);
      renderBriefing(record.challenge);
      showView('briefing');
      document.title = `任务简报 · ${record.challenge.title}`;
    });
    el.historyList.appendChild(row);
  });

  if (records.length > 8) {
    const more = elMaker('p', 'history-more', `还有 ${records.length - 8} 条旧记录没有展开。历史只保存在本机。`);
    el.historyList.appendChild(more);
  }
}

/* --------------------------------------------------------------------------
   Challenge links
   -------------------------------------------------------------------------- */

function renderChallenge(challenge) {
  const sender = challenge.by || '神秘拆弹员';
  el.challengeSender.textContent = sender;
  el.challengeTitle.textContent = challenge.title || '未命名材料';
  el.challengeTag.textContent = challenge.tag || '综合材料';
  el.challengeMeta.textContent = `${challenge.questions.length} 道题 · 3 分钟`;
  el.challengeConcepts.replaceChildren();
  (challenge.concepts || []).slice(0, 6).forEach((concept, index) => {
    const chip = elMaker('span', 'concept-chip');
    chip.append(elMaker('i', '', pad(index + 1)), document.createTextNode(concept));
    el.challengeConcepts.appendChild(chip);
  });
  el.acceptChallengeBtn.onclick = () => {
    sound.ensureContext();
    sound.click();
    state.challenge = challenge;
    state.mode = 'challenge';
    state.sender = sender;
    state.serial = makeSerial(challenge.seed || challenge.title, challenge.createdAt);
    renderBriefing(challenge);
    showView('briefing');
    document.title = `应战简报 · ${challenge.title}`;
  };
  el.declineChallengeBtn.onclick = () => {
    sound.click();
    clearChallengeHash();
    state.mode = 'solo';
    state.sender = '';
    state.challenge = null;
    showView('home');
    document.title = '拆弹笔记 DocBomb — 把无聊文档拆成 3 分钟游戏';
  };
}

async function bootChallengeFromHash() {
  const code = readChallengeCode();
  if (!code) {
    showView('home');
    return;
  }
  // A challenge can arrive as a same-document hash change while another game
  // (or its result screen) is still open. Stop the old run before swapping in
  // the incoming challenge.
  if (state.game) {
    state.game.running = false;
    if (state.game.raf) cancelAnimationFrame(state.game.raf);
    state.game = null;
  }
  hideSnark();
  try {
    const decoded = await decodeChallenge(code);
    state.mode = 'challenge';
    state.sender = decoded.by;
    state.challenge = decoded;
    state.serial = makeSerial(decoded.seed || decoded.title, decoded.createdAt);
    renderChallenge(decoded);
    showView('challenge');
    document.title = `${decoded.by || '神秘拆弹员'} 向你发起挑战 · DocBomb`;
  } catch (error) {
    clearChallengeHash();
    showView('home');
    showToast(error instanceof Error ? error.message : '挑战链接读不出来。', 'error', 4200);
  }
}

/* --------------------------------------------------------------------------
   Bind everything
   -------------------------------------------------------------------------- */

function bindEvents() {
  el.materialInput.addEventListener('input', updateMaterialUI);
  el.generateBtn.addEventListener('click', handleGenerate);
  el.uploadTrigger.addEventListener('click', () => el.fileInput.click());
  el.fileInput.addEventListener('change', async () => {
    const file = el.fileInput.files && el.fileInput.files[0];
    await handleFile(file);
    el.fileInput.value = '';
  });
  bindDropZone();

  document.querySelectorAll('[data-nav-home]').forEach((node) => {
    node.addEventListener('click', (event) => {
      event.preventDefault();
      requestHome();
    });
  });
  document.querySelectorAll('[data-focus-payload]').forEach((node) => {
    node.addEventListener('click', () => {
      sound.click();
      focusPayload();
    });
  });
  document.querySelectorAll('[data-go-history]').forEach((node) => {
    node.addEventListener('click', () => {
      sound.click();
      goToHistory();
    });
  });
  document.querySelectorAll('[data-open-help]').forEach((node) => {
    node.addEventListener('click', openHelp);
  });
  document.querySelectorAll('[data-sound-toggle]').forEach((node) => {
    node.addEventListener('click', toggleSound);
  });

  el.briefingBack.addEventListener('click', goHome);
  el.startMissionBtn.addEventListener('click', () => {
    sound.ensureContext();
    sound.click();
    startGame(state.challenge);
  });
  el.quitGameBtn.addEventListener('click', openQuitDialog);
  el.retryBtn.addEventListener('click', () => {
    sound.click();
    el.failOverlay.hidden = true;
    updateBodyLock();
    startGame(state.challenge);
  });
  el.failHomeBtn.addEventListener('click', () => {
    el.failOverlay.hidden = true;
    updateBodyLock();
    goHome();
  });
  el.cancelQuitBtn.addEventListener('click', () => closeDialog(el.quitDialog));
  el.confirmQuitBtn.addEventListener('click', confirmQuit);

  el.continueBtn.addEventListener('click', continueGame);
  el.downloadCertBtn.addEventListener('click', handleDownloadCertificate);
  el.shareChallengeBtn.addEventListener('click', handleShareChallenge);
  el.replayBtn.addEventListener('click', () => {
    if (!state.result) return;
    sound.click();
    startGame(state.result.challenge);
  });
  el.newMissionBtn.addEventListener('click', () => {
    goHome();
    window.setTimeout(() => el.materialInput.focus(), 120);
  });
  el.flipAllBtn.addEventListener('click', flipAllCards);
  el.copyShareBtn.addEventListener('click', copyShareLink);
  el.nativeShareBtn.addEventListener('click', shareNative);

  el.callsignInput.addEventListener('input', () => {
    const value = el.callsignInput.value.slice(0, 20);
    if (el.callsignInput.value !== value) el.callsignInput.value = value;
    state.callsign = value;
    store.setCallsign(value);
    state.shareCache = null;
    el.certCallsign.textContent = currentCallsign();
  });
  el.callsignInput.addEventListener('blur', () => {
    const trimmed = el.callsignInput.value.trim();
    el.callsignInput.value = trimmed;
    state.callsign = trimmed;
    store.setCallsign(trimmed);
    el.certCallsign.textContent = currentCallsign();
  });

  document.addEventListener('click', (event) => {
    const closeButton = event.target.closest('[data-close-dialog]');
    if (closeButton) {
      const dialog = closeButton.closest('dialog');
      closeDialog(dialog);
    }
  });

  document.addEventListener('keydown', handleKeydown);

  window.addEventListener('hashchange', () => {
    const code = readChallengeCode();
    if (code) {
      bootChallengeFromHash();
    } else if (state.view === 'challenge') {
      state.mode = 'solo';
      state.sender = '';
      state.challenge = null;
      showView('home');
      document.title = '拆弹笔记 DocBomb · 苔石工具';
    }
  });

  bindDialogCloseButtons();
}

function handleKeydown(event) {
  if (document.querySelector('dialog[open]')) return;
  if (state.view !== 'game' || !state.game || !state.game.running) return;
  const target = event.target;
  if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    openQuitDialog();
    return;
  }
  if (state.game.answered) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      continueGame();
    }
    return;
  }
  const number = Number(event.key);
  if (Number.isInteger(number) && number >= 1 && number <= 4) {
    const buttons = [...el.optionList.querySelectorAll('.option-button')];
    const button = buttons[number - 1];
    if (button && !button.disabled) {
      event.preventDefault();
      button.click();
    }
  }
}

/* --------------------------------------------------------------------------
   Boot
   -------------------------------------------------------------------------- */

function init() {
  cacheElements();
  updateSoundUI();
  renderSampleChips();
  updateMaterialUI();
  bindEvents();
  renderHistory();
  bootChallengeFromHash();
}

init();
