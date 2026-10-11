/* haunt.html 冒烟：房间探索版（静态） */
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const CODE = fs.readFileSync(join(root, 'haunt.html'), 'utf8');

const fail = (m) => { console.log('SMOKE_FAIL', m); process.exitCode = 1; };
const ok = (m) => { if (!CODE.includes(m)) fail('missing ' + m); };

/* 结构 */
if (!/<script>\s*\(function \(\) \{/.test(CODE)) fail('IIFE');
if (!/buildRoom/.test(CODE)) fail('buildRoom');
if (!/startEnding/.test(CODE)) fail('startEnding');
if (!/triggerCall/.test(CODE)) fail('triggerCall');
if (!/liveCall/.test(CODE)) fail('liveCall');

/* 9+1 物件脚本 */
['window','bed','phone','mirror','photo','screen','door','chair','ceil','under']
  .forEach((k) => ok('script.' + k));

/* 房间热区 HTML */
['hWindow','hDoor','hChair','hPhone','hScreen','hMirror','hPhoto','hBed','hCeil','hUnder']
  .forEach((k) => ok(k));

/* 素材 */
['resource/haunt/photo.png','resource/haunt/portrait.png','resource/haunt/chair.png']
  .forEach((k) => ok(k));

/* 恐怖源标记 */
ok('speechSynthesis');   // 语音
ok('StereoPanner');      // 左右耳
ok('S.facts');           // 知道你
ok('haunt_v');           // 回访
ok('scream');            // 白噪
ok('vibrate');           // 震动
ok('letter');            // 无 letter 了——确认没有遗书残留
if (CODE.includes('haunt_letter')) fail('old letter system still present');
if (CODE.includes('actGate')) fail('old ritual flow still present');

/* 时长结构：8 物件核心 + 2 后期 */
if (!/CORE\s*=\s*\[/.test(CODE)) fail('CORE list');
if (!/LATE\s*=\s*\[/.test(CODE)) fail('LATE list');

const bytes = Buffer.byteLength(CODE, 'utf8');
if (process.exitCode) {
  console.log('bytes', bytes);
} else {
  console.log('SMOKE_OK room objects=10 core=8 late=2 bytes=' + bytes);
}
