/* notice.html 冒烟：VHS 住户分类版（三分岔路线） */
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const CODE = fs.readFileSync(join(root, 'notice.html'), 'utf8');

const fail = (m) => { console.log('SMOKE_FAIL', m); process.exitCode = 1; };
const ok = (m) => { if (!CODE.includes(m)) fail('missing ' + m); };

/* 共享开场结构 */
['sceneIdent', 'sceneGuideA', 'sceneRoutine', 'sceneKnock'].forEach((f) => ok(f));
if (!/async function play\s*\(/.test(CODE)) fail('play()');
ok('boot');

/* 引导型恐怖（互动指令层） */
['sceneGuideLight', 'guideStep', 'guideLog', 'guideObey',
 'askTarget', 'askStill', 'askQ', 'askLight',
 'id="guideBar"', 'id="gTarget"', 'id="gStill"', 'id="gQ"',
 'guide.violations', 'guide.obeyed', '未检测到配合', '连同颤抖，已记录',
 '超时。系统已按「是」为您记录', '此刻，门外有人吗', '请勿移动',
 '请关闭，您身后的灯', '光照，没有任何变化', '您没有关。已记录',
 '引导 · 步骤', '未遵从 · 已记录', '引导结束。请留原地',
 '请全程按照屏幕指示操作', '开始分类'].forEach((k) => ok(k));

/* 分类与分岔 */
['classifyRoute', 'sceneFork', 'forceDifferentRoute', 'routeBadge',
 '正在根据您的配合情况', '分类完成。本户', 'ROUTES', 'lastRoute',
 'notice_route', '分配住户类型', 'A 类', 'B 类', 'C 类'].forEach((k) => ok(k));
if (!/function classifyRoute\s*\(/.test(CODE)) fail('classifyRoute def');
if (!/function forceDifferentRoute\s*\(/.test(CODE)) fail('forceDifferentRoute def');

/* 路线 A · 模范户 */
['sceneRouteA1', 'sceneRouteA2', 'sceneRouteA3', 'endRouteA',
 '模范户', '住户档案 · 第 0404 号', '建档日期：1998-04-04',
 '您入住的时间，晚于建档时间', '上期模范户已完成面导',
 '步骤 5', '永远', '引导员已在楼道内', '已登记'].forEach((k) => ok(k));

/* 路线 B · 待核查 */
['sceneRouteB1', 'sceneRouteB2', 'endRouteB',
 '待核查', '启动核查程序', '本次标准加倍', '核查员，已经上楼了',
 '核查结论：未通过', '核查员已在敲门', '请配合',
 '核查静止'].forEach((k) => ok(k));

/* 路线 C · 空置房 */
['sceneRouteC1', 'sceneRouteC2', 'sceneRouteC3', 'endRouteC',
 '空置房', '经核实：本户为空置房屋', '房屋回收通知',
 '该地址查无此人', '空置房，不需要开灯', '空置房，无需敲门',
 '清退程序已启动', '工作人员正在开锁', '已清退',
 'lockpick', 'footstep'].forEach((k) => ok(k));

/* 共享尾招（按路线变化） */
['sceneAfter', '有人在吗', '还想跑吗', '还在看吗',
 '本录像将自动倒带', '门开了', '核查员。请开门',
 '请开门', '已进入'].forEach((k) => ok(k));

/* VHS 载体 */
['▶ PLAY', 'SP', 'osdDate', 'osdCount', 'trackRoll', 'noiseShift', 'scanRoll', 'barsOn', 'rewindAnim']
  .forEach((k) => ok(k));

/* 细思极恐核心文案（保留在共享/专属场景中） */
['不存在 4 号柜', '不存在 4 楼', '您不需要下楼', '它们不喜欢被照亮',
 '请不要开门', '214 / 215', '共 215 户',
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

/* 场景画面 */
['id="vRoutine"', 'id="vCorridor"', 'id="vLockers"', 'id="vStats"',
 'id="vElev"', 'id="vHall"', 'id="vRoom"', 'id="ticker"', 'id="statGrid"']
  .forEach((k) => ok(k));
['function visual(', 'tickerOn', 'buildStats', 'elevLights', 'windowReveal',
 'lampLit', 'doorSlit', 'gap4', 'hallWin', 'resource/haunt/chair.png',
 '4 楼住户请勿应答'].forEach((k) => ok(k));
if (!/withCard/.test(CODE)) fail('withCard card/visual split');

/* 二刷换线 */
if (!/visits >= 2/.test(CODE)) fail('rewatch branches');
if (!/forceDifferentRoute/.test(CODE)) fail('route cycling');

/* 现实交互层 */
['id="homeQ"', 'id="homeA"', '独自在家', '他们也会收到本期通知',
 'mouseleave', "'offline'", 'getBattery', 'fullscreenchange',
 'pointerdown', 'figPar', '--gx', '有人应声', '视线回来了就好'].forEach((k) => ok(k));
if (!/addEventListener\('offline'/.test(CODE)) fail('offline listener');

/* 引导型恐怖强化 */
['配合度', '您几乎是在等着这一步', '请再靠近一些', '眨眼 21 次',
 '正在补引导', '引导开始后，您的每一次配合与偏离',
 '我们这边的光线', 'doorKnocks', 'id="hs"', 'hsJit', 'audioDrop',
 'guidePct', 'guideRefresh'].forEach((k) => ok(k));

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

/* play() 分岔调用 */
const playBlock = CODE.slice(CODE.indexOf('async function play'));
if (!/sceneFork/.test(playBlock)) fail('play calls sceneFork');
if (!/sceneRouteA1/.test(playBlock)) fail('play calls routeA');
if (!/sceneRouteB1/.test(playBlock)) fail('play calls routeB');
if (!/sceneRouteC1/.test(playBlock)) fail('play calls routeC');
if (!/endRouteA/.test(playBlock)) fail('play calls endRouteA');
if (!/endRouteB/.test(playBlock)) fail('play calls endRouteB');
if (!/endRouteC/.test(playBlock)) fail('play calls endRouteC');

const bytes = Buffer.byteLength(CODE, 'utf8');
if (process.exitCode) {
  console.log('bytes', bytes);
} else {
  console.log('SMOKE_OK vhs-notice branching=3 shared=4 fork=1 bytes=' + bytes);
}
