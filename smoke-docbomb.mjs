/* docbomb.html 冒烟：本地拆弹引擎 + 挑战链接 + 静态资源接线 */
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateChallenge, SAMPLE_DOCS } from './docbomb/src/engine.js';
import { encodeChallenge, decodeChallenge } from './docbomb/src/share.js';

const root = dirname(fileURLToPath(import.meta.url));
const HTML = fs.readFileSync(join(root, 'docbomb.html'), 'utf8');
const fail = (message) => { console.log('SMOKE_FAIL', message); process.exitCode = 1; };
const requireText = (text) => { if (!HTML.includes(text)) fail('missing ' + text); };

/* 页面入口与资源接线 */
['docbomb/styles.css', 'docbomb/src/app.js', 'docbomb/assets/logo.svg', 'ui.css', 'tools.html']
  .forEach(requireText);
if (!HTML.includes('href="tools.html"')) fail('tools backlink');

/* 五个核心视图与主交互点 */
['view-home', 'view-briefing', 'view-game', 'view-result', 'view-challenge',
 'materialInput', 'generateBtn', 'startMissionBtn', 'optionList', 'reviewCards',
 'shareChallengeBtn', 'downloadCertBtn'].forEach(requireText);

/* 页面内 id 唯一 */
const ids = [...HTML.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
if (duplicates.length) fail('duplicate ids: ' + duplicates.join(','));

/* 五类样例都必须能生成 5 道有效题 */
for (const sample of SAMPLE_DOCS) {
  const challenge = generateChallenge(sample.content, { seed: 20261017 });
  if (challenge.questions.length !== 5) fail(`${sample.label}: expected 5 questions`);
  if (!challenge.title || !challenge.concepts.length) fail(`${sample.label}: missing metadata`);
  for (const question of challenge.questions) {
    if (!question.prompt) fail(`${sample.label}: empty prompt`);
    if (![2, 4].includes(question.options.length)) fail(`${sample.label}: option count`);
    if (question.answerIndex < 0 || question.answerIndex >= question.options.length) {
      fail(`${sample.label}: invalid answer index`);
    }
    if (new Set(question.options).size !== question.options.length) fail(`${sample.label}: duplicate options`);
  }
}

/* 挑战链接必须可压缩、可还原 */
const challenge = generateChallenge(SAMPLE_DOCS[0].content, { seed: 7 });
challenge.by = '冒烟测试员';
const code = await encodeChallenge(challenge);
if (!/^[zu][A-Za-z0-9_-]+$/.test(code)) fail('unexpected link prefix');
const decoded = await decodeChallenge(code);
if (decoded.title !== challenge.title) fail('challenge title mismatch');
if (decoded.by !== '冒烟测试员') fail('challenge sender mismatch');
if (decoded.questions.length !== 5) fail('challenge question mismatch');

/* 挑战链接过长不适合 URL 时不至于悄悄截断 */
if (code.length > 20000) fail('challenge code unexpectedly large: ' + code.length);

if (!process.exitCode) {
  console.log(`SMOKE_OK docbomb views=5 samples=${SAMPLE_DOCS.length} link=${code.length}b bytes=${Buffer.byteLength(HTML, 'utf8')}`);
}
