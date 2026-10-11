/* haunt.html 冒烟：仪式版——验证关键函数、阶段文案、素材引用 */
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HTML = fs.readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'haunt.html'), 'utf8');
const CODE = HTML.match(/<script>([\s\S]*?)<\/script>/)[1];

/* 最小 DOM 仿真（兼容 classList.toggle / insertAdjacentText 等） */
const el = () => {
  const e = {
    classList: {
      _s: new Set(),
      add(...a) { a.forEach(x => this._s.add(x)); },
      remove(...a) { a.forEach(x => this._s.delete(x)); },
      toggle(c, f) {
        if (f === undefined) { if (this._s.has(c)) this._s.delete(c); else this._s.add(c); return; }
        if (f) this._s.add(c); else this._s.delete(c);
      },
      contains(c) { return this._s.has(c); },
    },
    style: {},
    childNodes: [],
    children: [],
    appendChild(c) { this.children.push(c); this.childNodes.push(c); return c; },
    removeChild() {},
    addEventListener() {},
    insertAdjacentText() {},
    querySelector() { return el(); },
    querySelectorAll() { return []; },
    textContent: '', innerHTML: '', disabled: false, hidden: false,
    onclick: null,
  };
  return e;
};
const elements = {};
function getEl(id) {
  if (!elements[id]) { const e = el(); e.id = id; elements[id] = e; }
  return elements[id];
}
globalThis.document = {
  getElementById: getEl,
  createElement: () => el(),
  createTextNode: (t) => ({ nodeValue: t }),
  createDocumentFragment: () => el(),
  addEventListener() {}, removeEventListener() {},
  body: Object.assign(el(), { appendChild() {}, removeChild() {}, style: {} }),
  title: '夜间独处习惯调查', hidden: false, visibilityState: 'visible',
  documentElement: el(),
  querySelector: () => el(), querySelectorAll: () => [],
};
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.window = globalThis;
globalThis.localStorage = {
  _m: {},
  getItem(k) { return this._m[k] ?? null; },
  setItem(k, v) { this._m[k] = String(v); },
  removeItem(k) { delete this._m[k]; },
};
try {
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent: 'smoke', vibrate: () => {}, getBattery: undefined },
    configurable: true,
  });
} catch (e) {}
globalThis.location = { href: 'http://localhost/', pathname: '/haunt.html' };
globalThis.history = { replaceState() {} };
globalThis.performance = { now: () => 0 };
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};
globalThis.setTimeout = (fn) => { /* 不执行异步，只保证同步阶段可跑 */ return 0; };
globalThis.clearTimeout = () => {};
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
globalThis.AudioContext = function () {
  return {
    state: 'running', currentTime: 0, destination: {},
    createOscillator: () => ({ type: '', frequency: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {} }, connect() {}, start() {}, stop() {} }),
    createGain: () => ({ gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} }, connect() {} }),
    createBiquadFilter: () => ({ type: '', frequency: { value: 0, setValueAtTime() {} }, Q: { value: 0 }, connect() {} }),
    createBufferSource: () => ({ buffer: null, connect() {}, start() {}, stop() {}, playbackRate: { value: 1, setValueAtTime() {} } }),
    createBuffer: (ch, len, sr) => ({ getChannelData: () => new Float32Array(len) }),
    createAnalyser: () => ({ fftSize: 0, connect() {}, getByteFrequencyData() {}, getFloatTimeDomainData() {} }),
    createStereoPanner: () => ({ pan: { value: 0, setValueAtTime() {} }, connect() {} }),
    resume() { return Promise.resolve(); },
    suspend() { return Promise.resolve(); },
  };
};
globalThis.webkitAudioContext = globalThis.AudioContext;

const probeBody = `
;(function(){
  try {
    ['actGate','actPrep','actNameDone','actCall','actRespond','actYield','threshold','enter','showWall',
     'startIncomingCall','startLiveCall','startLetterScreen','playRingTone','playBreathLoop',
     'readLetter','writeLetter','say','actHold','actChoice','actName','faceJump','bigWord','flashBlack'
    ].forEach(function(n){
      if (typeof eval(n) !== 'function') throw new Error('missing ' + n);
    });
    if (typeof R !== 'object') throw new Error('missing R');
    if (typeof LETTER_KEY !== 'string' || !LETTER_KEY) throw new Error('LETTER_KEY');
    if (DEFAULT_LETTERS.length < 3) throw new Error('DEFAULT_LETTERS');
    /* 阶段标记齐全 */
    var html = document.title || '';
    var phases = ['门','准','名','唤','应','让','阈','入','书'];
    var src = ${JSON.stringify('')}; /* placeholder */
    /* 从函数源码里抓阶段 */
    var gateSrc = actGate.toString() + actPrep.toString() + actNameDone.toString() + actCall.toString()
      + actRespond.toString() + actYield.toString() + threshold.toString() + enter.toString()
      + (typeof callDone === 'function' ? callDone.toString() : '');
    phases.slice(0,8).forEach(function(p){
      if (gateSrc.indexOf(p) < 0) throw new Error('phase ' + p);
    });
    var letterSrc = startLetterScreen.toString();
    if (letterSrc.indexOf('书') < 0) throw new Error('phase 书');
    /* 素材 */
    var faceSrc = faceJump.toString() + showWall.toString();
    if (faceSrc.indexOf('resource/haunt/') < 0) throw new Error('assets');
    if (faceSrc.indexOf('photo.png') < 0) throw new Error('photo');
    /* 遗书键 */
    if (LETTER_KEY !== 'haunt_letter') throw new Error('letter key');
    console.log('SMOKE_OK ritual phases=9 letter=haunt_letter');
  } catch (e) {
    console.log('SMOKE_FAIL', e.message);
    process.exitCode = 1;
  }
})();
`;

const idx = CODE.lastIndexOf('})();');
if (idx < 0) throw new Error('IIFE end not found');
const PROBE = CODE.slice(0, idx) + probeBody + CODE.slice(idx);
try {
  new Function(PROBE)();
} catch (e) {
  console.error('script error', e);
  process.exit(1);
}
