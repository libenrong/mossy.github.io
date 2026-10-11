/* haunt.html 冒烟：验证题号映射、数组长度、关键函数存在 */
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HTML = fs.readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'haunt.html'), 'utf8');
const CODE = HTML.match(/<script>([\s\S]*?)<\/script>/)[1];

/* 最小 DOM 仿真 */
const el = () => ({
  classList: { add(){}, remove(){}, contains(){ return false; } },
  style: {},
  childNodes: [],
  children: [],
  appendChild(){}, removeChild(){}, addEventListener(){},
  querySelector: () => el(),
  querySelectorAll: () => [],
  textContent: '', innerHTML: '', disabled: false, hidden: false,
});
const elements = {};
function getEl(id) {
  if (!elements[id]) { const e = el(); e.id = id; elements[id] = e; }
  return elements[id];
}
globalThis.document = {
  getElementById: getEl,
  createElement: () => el(),
  createTextNode: (t) => ({ nodeValue: t }),
  addEventListener(){}, removeEventListener(){},
  body: Object.assign(el(), { appendChild(){}, removeChild(){}, style: {} }),
  title: '', hidden: false, visibilityState: 'visible',
  documentElement: el(),
  querySelector: () => el(), querySelectorAll: () => [],
};
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.window = globalThis;
globalThis.localStorage = { getItem: () => null, setItem(){}, removeItem(){} };
try {
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent: 'smoke', permissions: { query: async () => ({ state: 'prompt' }) }, vibrate: () => {} },
    configurable: true,
  });
} catch (e) {}
globalThis.location = { href: 'http://localhost/' };
globalThis.performance = { now: () => 0 };
globalThis.SpeechSynthesisUtterance = function () {};
globalThis.speechSynthesis = { speak(){}, cancel(){}, getVoices: () => [], addEventListener(){} };
globalThis.Notification = function () {};
Notification.permission = 'default';
Notification.requestPermission = async () => 'default';
globalThis.getComputedStyle = () => ({ getPropertyValue: () => '' });
globalThis.setTimeout = () => 0;
globalThis.clearTimeout = () => {};
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};

// 注入 IIFE 内部末尾
const probeBody = `
;(function(){
  try {
    if (TOTAL_Q !== 38) throw new Error('TOTAL_Q=' + TOTAL_Q);
    if (CLIMAX_AT !== 35) throw new Error('CLIMAX_AT=' + CLIMAX_AT);
    if (BLANK_AT !== 36) throw new Error('BLANK_AT=' + BLANK_AT);
    if (FINAL_AT !== 37) throw new Error('FINAL_AT=' + FINAL_AT);
    if (QUESTIONS.length !== 38) throw new Error('QLen=' + QUESTIONS.length);
    if (!QUESTIONS[36].blank || QUESTIONS[36].blankSec !== 15) throw new Error('blank');
    if (QUESTIONS[37].t.indexOf('你可以关掉') < 0) throw new Error('final');
    if (QUESTION_OPTIONS.length !== 38) throw new Error('OLen=' + QUESTION_OPTIONS.length);
    for (var i = 0; i < 36; i++) {
      if (!QUESTION_OPTIONS[i] || QUESTION_OPTIONS[i].length !== 4) throw new Error('opt' + i);
    }
    ['applyStage','startClimax','memorialWallShow','scheduleHauntImages','portraitJump','finalJumpFace','subRitual1','subRitual5','fakeFreeze','renderOptions','bindContactQuestion'].forEach(function(n){
      if (typeof eval(n) !== 'function') throw new Error('missing ' + n);
    });
    // 灵异文案抽查
    var all = QUESTIONS.map(function(q){return q.t;}).join('');
    if (all.indexOf('笔仙') < 0) throw new Error('ritual missing');
    if (all.indexOf('削苹果') < 0) throw new Error('apple missing');
    if (all.indexOf('身后') < 0) throw new Error('behind missing');
    if (WAVES[0].text !== '别回头') throw new Error('waves');
    console.log('SMOKE_OK q=' + QUESTIONS.length + ' opts=' + QUESTION_OPTIONS.length);
  } catch (e) {
    console.log('SMOKE_FAIL', e.message);
    process.exitCode = 1;
  }
})();
`;
// CODE 以 })(); 结尾（IIFE），把探针塞进 IIFE 之前
const idx = CODE.lastIndexOf('})();');
if (idx < 0) throw new Error('IIFE end not found');
const PROBE = CODE.slice(0, idx) + probeBody + CODE.slice(idx);
try {
  new Function(PROBE)();
} catch (e) {
  console.error('script error', e);
  process.exit(1);
}
