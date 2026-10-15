/* notice.html 冒烟：VHS 社区通告版（静态） */
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const CODE = fs.readFileSync(join(root, 'notice.html'), 'utf8');

const fail = (m) => { console.log('SMOKE_FAIL', m); process.exitCode = 1; };
const ok = (m) => { if (!CODE.includes(m)) fail('missing ' + m); };

/* 结构：11 段场景 + 引导互动 */
['sceneIdent', 'sceneRoutine', 'sceneKnock', 'sceneRulesA', 'sceneStats',
 'sceneRulesB', 'sceneJump1', 'scenePersonal', 'scenePeak', 'sceneEndcard',
 'sceneAfter'].forEach((f) => ok(f));
if (!/async function play\s*\(/.test(CODE)) fail('play()');
ok('boot');

/* 引导型恐怖（互动指令层） */
['sceneGuideA', 'sceneGuideLight', 'guideStep', 'guideLog', 'guideObey',
 'askTarget', 'askStill', 'askQ', 'askLight',
 'id="guideBar"', 'id="gTarget"', 'id="gStill"', 'id="gQ"',
 'guide.violations', 'guide.obeyed', '未检测到配合', '连同颤抖，已记录',
 '超时。系统已按「是」为您记录', '此刻，门外有人吗', '请勿移动',
 '请关闭，您身后的灯', '光照，没有任何变化', '您没有关。已记录',
 '引导 · 步骤', '未遵从 · 已记录', '引导结束。请留原地',
 '请全程按照屏幕指示操作', '开始引导'].forEach((k) => ok(k));

/* VHS 载体 */
['▶ PLAY', 'SP', 'osdDate', 'osdCount', 'trackRoll', 'noiseShift', 'scanRoll', 'barsOn', 'rewindAnim']
  .forEach((k) => ok(k));

/* 细思极恐核心文案 */
['不存在 4 号柜', '不存在 4 楼', '您不需要下楼', '它们不喜欢被照亮',
 '请不要开门', '214 / 215', '共 215 户', '还亮着',
 '正在收看本通知的这位居民', '灯关了吗', '本录像将自动倒带',
 '8888 - 0404'].forEach((t) => ok(t));

/* 恐怖源 */
['speechSynthesis', 'faceJump', 'flashFrame', 'scream', 'thud', 'chime',
 'resource/ghost1.jpeg', 'resource/ghost2.jpg', 'resource/ghost3.jpg',
 'visibilitychange', 'localStorage', 'notice_v', 'vibrate']
  .forEach((k) => ok(k));

/* ESC 跳吓机制 */
ok('S.inClimax');
ok('S.skip');
if (!/Escape/.test(CODE)) fail('Escape');

/* 尾招 */
ok('请关灯');
ok('BAD_TITLES');

/* 场景画面（视觉升级） */
['id="vRoutine"', 'id="vCorridor"', 'id="vLockers"', 'id="vStats"',
 'id="vElev"', 'id="vHall"', 'id="vRoom"', 'id="ticker"', 'id="statGrid"']
  .forEach((k) => ok(k));
['function visual(', 'tickerOn', 'buildStats', 'elevLights', 'windowReveal',
 'lampLit', 'doorSlit', 'gap4', 'hallWin', 'resource/haunt/chair.png',
 '4 楼住户请勿应答'].forEach((k) => ok(k));
if (!/withCard/.test(CODE)) fail('withCard card/visual split');

/* 细思极恐强化层（监控元信息 / 二刷差异 / 4 楼按键 / 窗后人影） */
['id="statNum"', 'id="elevDisp"', 'hallFig', 'figEyes', 'recmode',
 '● REC', '· 本户', 'statsShow', '查无此户', '上一期播出结束后',
 '请配合开门', '请勿关闭电视', '上次收看至 04:04', '这次，关了吗'].forEach((k) => ok(k));
if (!/visits >= 2/.test(CODE)) fail('rewatch branches');

/* 现实交互层 */
['id="homeQ"', 'id="homeA"', '独自在家', '他们也会收到本期通知',
 'mouseleave', "'offline'", 'getBattery', 'fullscreenchange',
 'pointerdown', 'figPar', '--gx', '有人应声', '视线回来了就好'].forEach((k) => ok(k));
if (!/addEventListener\('offline'/.test(CODE)) fail('offline listener');

/* 开场在 script 前，且只有一个播放入口 */
const bootIdx = CODE.indexOf('id="playBtn"');
const scriptIdx = CODE.indexOf('<script>');
if (bootIdx < 0) fail('playBtn');
if (scriptIdx < 0) fail('script tag');
if (bootIdx > scriptIdx) fail('playBtn after script');
if ((CODE.match(/addEventListener\('click', start\)/g) || []).length !== 1) fail('start bind count');

/* HTML id 唯一性 */
const ids = [...CODE.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const dup = ids.filter((v, i) => ids.indexOf(v) !== i);
if (dup.length) fail('duplicate ids: ' + [...new Set(dup)].join(','));

const bytes = Buffer.byteLength(CODE, 'utf8');
if (process.exitCode) {
  console.log('bytes', bytes);
} else {
  console.log('SMOKE_OK vhs-notice scenes=11 guided=4 bytes=' + bytes);
}
