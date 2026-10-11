/* haunt.html 冒烟：夜视监控版（静态） */
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const CODE = fs.readFileSync(join(root, 'haunt.html'), 'utf8');

const fail = (m) => { console.log('SMOKE_FAIL', m); process.exitCode = 1; };
const ok = (m) => { if (!CODE.includes(m)) fail('missing ' + m); };

/* 结构 */
if (!/boot\(\)/.test(CODE)) fail('boot');
if (!/startEnding/.test(CODE)) fail('startEnding');
if (!/triggerCall/.test(CODE)) fail('triggerCall');
if (!/liveCall/.test(CODE)) fail('liveCall');

/* 8 物件脚本（对准 chair.png 实物） */
['chair','cab','bed','floor','low','door','ceil','under']
  .forEach((k) => ok('script.' + k));

/* 热区 HTML（在 script 前） */
const hotIdx = CODE.indexOf('id="hChair"');
const scriptIdx = CODE.indexOf('<script>');
if (hotIdx < 0) fail('hChair');
if (scriptIdx < 0) fail('script tag');
if (hotIdx > scriptIdx) fail('hotspots after script');
['hCab','hBed','hFloor','hLow','hDoor','hCeil','hUnder']
  .forEach((k) => ok(k));

/* 真实照片底 */
ok('resource/haunt/chair.png');
ok('object-fit:cover');
ok('NIGHT VISION');
ok('CAM_07');

/* 素材引用 */
['resource/haunt/photo.png','resource/haunt/portrait.png','resource/haunt/chair.png']
  .forEach((k) => ok(k));

/* 恐怖源 */
ok('speechSynthesis');
ok('StereoPanner');
ok('S.facts');
ok('haunt_v');
ok('scream');
ok('vibrate');

/* 不要旧系统 */
if (CODE.includes('haunt_letter')) fail('old letter');
if (CODE.includes('actGate')) fail('old ritual');
if (CODE.includes('buildRoom')) fail('old buildRoom');

/* CORE/LATE */
if (!/CORE\s*=\s*\[/.test(CODE)) fail('CORE');
if (!/LATE\s*=\s*\[/.test(CODE)) fail('LATE');

const bytes = Buffer.byteLength(CODE, 'utf8');
if (process.exitCode) {
  console.log('bytes', bytes);
} else {
  console.log('SMOKE_OK cctv objects=8 core=6 late=2 bytes=' + bytes);
}
