/* docbomb.html 冒烟：本地拆弹引擎 + 挑战链接 + 静态资源接线 */
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateChallenge, SAMPLE_DOCS, normalizeDocument } from './docbomb/src/engine.js';
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

/* 同一份材料多次生成时，不应总是同一套题 */
const variedPrompts = new Set();
for (let seed = 1; seed <= 8; seed += 1) {
  const attempt = generateChallenge(SAMPLE_DOCS[0].content, { seed });
  const prompts = attempt.questions.map((question) => question.prompt);
  const sources = attempt.questions.map((question) => question.source);
  if (new Set(prompts).size !== 5) fail(`seed ${seed}: duplicate prompt in one set`);
  if (new Set(sources).size < 5) fail(`seed ${seed}: repeated source in one set`);
  prompts.forEach((prompt) => variedPrompts.add(prompt));
}
if (variedPrompts.size < 18) fail('same material returns too little variation: ' + variedPrompts.size);

/* 列表序号是结构，不是考点 */
const LIST_DOC = `采购流程
第一步：需求部门填写采购申请单，并附上至少三家供应商的报价。
第二步：财务部在三个工作日内审核预算。
第三步：采购金额超过五万元时，必须由总经理签字。
第四步：到货后由仓库和申请部门共同验收。`;
const normalized = normalizeDocument(LIST_DOC);
if (/第[一二三四五六七八九十百\d]+步/.test(normalized)) fail('list labels not normalized');
if (normalizeDocument('流程：第一步：收集材料 第二步：开会').includes('第一步')) fail('inline list labels not normalized');
const listChallenge = generateChallenge(LIST_DOC, { seed: 99 });
if (new Set(listChallenge.questions.map((question) => question.source)).size < 5) {
  fail('list material: repeated source in one set');
}
for (const question of listChallenge.questions) {
  const haystack = [question.prompt, ...question.options, question.explanation].join('\n');
  if (/第[一二三四五六七八九十百\d]+(?:步|条|项|章|节)/.test(haystack)) {
    fail('ordinal/list label leaked into a question: ' + question.prompt);
  }
}

/* 括号序号 （1）/(1) 与圈号 ① 同样只是结构，不能当考点或答案 */
const ENUM_DOC = `研发流程如下。（1）先确认需求并记录项目编号。（2）评估技术可行性与整体成本。（3）制定详细的开发计划与里程碑。（4）最后安排人员开始实施并跟踪进度。
巡检要点：①检查电源连接是否牢固可靠。②核对设备编号是否正确无误。③记录初始读数并对准仪表拍照。④关闭设备电源并填写巡检记录表。`;
for (let seed = 1; seed <= 12; seed += 1) {
  const enumChallenge = generateChallenge(ENUM_DOC, { seed });
  for (const question of enumChallenge.questions) {
    const haystack = [question.prompt, ...question.options, question.explanation].join('\n');
    if (/[①-⑳]|[（(]\s*____\s*[）)]/.test(haystack)) {
      fail('enumeration marker leaked into a question: ' + question.prompt);
    }
    if (/^[0-9]{1,3}$/.test(question.correctText || '')) {
      fail('enumeration index used as answer: ' + question.prompt + ' => ' + question.correctText);
    }
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
  console.log(`SMOKE_OK docbomb views=5 samples=${SAMPLE_DOCS.length} variants=${variedPrompts.size} link=${code.length}b bytes=${Buffer.byteLength(HTML, 'utf8')}`);
}
