/**
 * DOCBOMB — local challenge engine.
 *
 * Turns a boring document into five defusal questions without a network call.
 * The generator is deliberately deterministic: the same text + seed produces the
 * same ammunition, which keeps challenge links and demos reproducible.
 */

const CJK = /[\u3400-\u9fff]/u;
const CJK_ONLY = /^[\u3400-\u9fff]+$/u;
const LATIN = /[A-Za-z]/;

const NUMBER_RE =
  /(?<![\d.])(\d{1,5}(?:[.,]\d+)?)(\s*(?:%|％|摄氏度|分钟|小时|个月|天|周|年|次|人|位|名|元|万元|克|千克|公斤|毫升|升|米|厘米|毫米|GB|MB|KB|kg|mg|g|ml|mL|L|℃|°C|瓦|W|V|A|倍|岁|分|秒))?/g;

const ZH_STOPWORDS = new Set(
  `
  的 了 和 是 在 有 与 及 或 而 被 把 对 为 等 中 上 下 内 外 后 前 由 从 到 每 个 种 次 项 条 款
  并 且 也 都 就 又 再 还 但 如果 因为 所以 因此 通过 进行 实现 确保 需要 必须 应当 应该 可以 不得
  不能 禁止 相关 有关 以下 上述 其中 以及 对于 关于 根据 按照 包括 例如 主要 重要 基本 进一步
  同时 方面 情况 问题 工作 内容 要求 规定 管理 这个 那个 这些 那些 一些 一种 一类 一样 一般
  什么 怎么 如何 其中 其他 另外 此外 目前 现在 已经 正在 将会 可能 能够 具有 拥有 使用 利用
  处理 完成 开始 结束 出现 发生 存在 属于 作为 成为 不是 没有 就是 还是 只是 但是 而且 并且
  我们 你们 他们 她们 它们 自己 大家 有人 没有 可以 应该 不能 不会 不要 不能 不得 无须 无需
  第一 第二 第三 第四 第五 首先 其次 最后 总之 例如 比如 即 则 若 如 若 之 其 此 该 各 本
  一个 两个 三个 这项 那项 本次 本产品 本材料 本文 本研究 材料 文档 笔记 课程 内容 部分
  所有 一次 只能 以上 以下 中的 之后 之前 表示 显示 结果 认为 发现 建议 提醒 指出 最后 连续
  达到 具有 使用 利用 支持 包括 位于 属于 作为 成为 保持 提供 完成 出现 发生 需要 确保 应该
  进行 通过 根据 按照 对于 关于 以及 其中 例如 主要 重要 基本 同时 方面 情况 问题 工作
  将 于 须 名 请勿 输出 随附 整机 表明 未 未发现 一项 两项 三项 这种 这些 那种 每个 每天 每周
  时 首次 适合 第 步骤 阶段 环节 序号 顺便 其中 此外
  `.split(/\s+/).filter(Boolean)
);

const EN_STOPWORDS = new Set(
  `a an the and or but if then else of to in on at for from by with without into onto over under
  is are was were be been being am do does did have has had can could should would may might must
  will shall this that these those it its their our your his her they we you i as not no yes
  more most less least very also than about between during after before while because through
  which who whom whose what when where why how all any each both few many some such only own same
  than too so just now up down out off again further once here there
  document material text note course content using used use make makes made within into per`
    .split(/\s+/)
    .filter(Boolean)
);

const GENERIC_TERMS = new Set([
  '公司',
  '员工',
  '用户',
  '产品',
  '系统',
  '方式',
  '方法',
  '时候',
  '地方',
  '东西',
  '事情',
  '要求',
  '规定',
  '注意事项',
  '说明',
  '介绍',
  '特点',
  '优势',
]);

const TAG_RULES = [
  {
    tag: '组织制度',
    family: 'policy',
    words: ['制度', '规定', '守则', '办法', '流程', '审批', '员工', '公司', '部门', '违规', '处罚', '绩效', '岗位', '责任'],
  },
  {
    tag: '课程笔记',
    family: 'study',
    words: ['课程', '学习', '笔记', '概念', '定义', '公式', '实验', '知识点', '复习', '考试', '章节', '原理', '光合作用', '记忆'],
  },
  {
    tag: '产品说明',
    family: 'product',
    words: ['产品', '功能', '使用', '安装', '规格', '操作', '设备', '保修', '充电', '模式', '重量', '容量', '指示灯', '咖啡'],
  },
  {
    tag: '论文摘要',
    family: 'paper',
    words: ['研究', '实验', '数据', '样本', '假设', '结论', '文献', '分析', '变量', '参与者', '显著', '相关性', '论文'],
  },
  {
    tag: '汇报材料',
    family: 'deck',
    words: ['汇报', '项目', '目标', '进展', '计划', '预算', '会议', '季度', '路线图', '里程碑', '复盘', 'PPT'],
  },
];

const MODALITY_PAIRS = [
  ['必须', '无需'],
  ['应当', '不必'],
  ['需要', '无须'],
  ['可以', '不得'],
  ['允许', '禁止'],
  ['禁止', '允许'],
  ['不得', '可以'],
  ['严禁', '允许'],
  ['不支持', '支持'],
  ['支持', '不支持'],
  ['超过', '少于'],
  ['少于', '超过'],
  ['高于', '低于'],
  ['低于', '高于'],
  ['延长', '缩短'],
  ['缩短', '延长'],
  ['包括', '不包括'],
  ['包含', '不包含'],
  ['直接影响', '完全不影响'],
  ['显著', '不显著'],
  ['主要', '次要'],
  ['吸收', '释放'],
  ['释放', '吸收'],
  ['产生', '消耗'],
  ['消耗', '产生'],
  ['增加', '减少'],
  ['减少', '增加'],
  ['提高', '降低'],
  ['降低', '提高'],
  ['上升', '下降'],
  ['下降', '上升'],
  ['包含', '排除'],
  ['排除', '包含'],
  ['所有', '部分'],
  ['全部', '部分'],
  ['一定', '不一定'],
  ['通常', '从不'],
];

const PREFIX_CHARS = new Set('暗光冷热云双单多高低大小新旧总分子母正负内外前后上下中主副软硬快慢远近轻重长短全半反超微意式佩腕基'.split(''));
const SUFFIX_CHARS = new Set('者员性化度力量率器机灯盘网线站库表卡证书法学药病期层膜体质类物品场店区端键屏池芯板门窗杯壶锅带戴统'.split(''));

const NEGATION_PAIRS = [
  ['具有', '不具备'],
  ['存在', '不存在'],
  ['依靠', '完全不依靠'],
  ['导致', '不会导致'],
  ['说明', '无法说明'],
  ['证明', '无法证明'],
  ['影响', '不影响'],
  ['会', '不会'],
  ['能', '不能'],
  ['认为', '不认为'],
  ['发现', '未发现'],
  ['指出', '未指出'],
  ['分为', '不分为'],
  ['利用', '完全不利用'],
];

export const SAMPLE_DOCS = [
  {
    id: 'policy',
    label: '公司制度',
    meta: '组织制度',
    content: `员工信息安全守则
一、所有员工必须每90天更换一次办公系统密码。密码长度不得少于12位，并须同时包含数字、大小写字母和特殊符号。
二、处理客户数据时，只能使用公司批准的加密云盘，严禁将文件发送到个人邮箱或私人网盘。
三、离开工位超过10分钟，必须锁定电脑屏幕。访客进入研发区域时，应由至少一名员工全程陪同。
四、发现可疑邮件或U盘，不得自行打开，应在15分钟内报告信息安全值班人员。
五、违反上述规定的，首次给予书面警告；造成数据泄露的，将扣除当季绩效并追究法律责任。`,
  },
  {
    id: 'study',
    label: '课程笔记',
    meta: '课程笔记',
    content: `光合作用速记笔记
光合作用是绿色植物利用阳光，把二氧化碳和水合成有机物并释放氧气的过程。整个过程主要发生在叶绿体中，依靠叶绿素吸收光能。
光合作用分为光反应和暗反应两个阶段。光反应发生在类囊体薄膜上，会把光能转化为ATP和NADPH。暗反应发生在叶绿体基质中，利用ATP和NADPH将二氧化碳固定为糖类。
影响光合作用速率的环境因素主要有光照强度、二氧化碳浓度和温度。当光照强度超过光饱和点后，光合速率不再明显增加。
考试重点：光反应产生氧气，暗反应消耗ATP；叶绿体是光合作用的场所，线粒体则是细胞呼吸的主要场所。`,
  },
  {
    id: 'product',
    label: '产品说明',
    meta: '产品说明',
    content: `AirMini 便携咖啡机使用说明
AirMini 是一款适合户外使用的便携咖啡机，整机重量为680克，水箱容量为120毫升。
首次使用前，请用清水空煮两次，以清除生产过程中残留的灰尘和气味。每次使用后，应拆下滤网并用温水冲洗，不要放入洗碗机。
机器支持冷萃和意式浓缩两种模式。制作意式浓缩时，建议使用细研磨咖啡粉，水温保持在92摄氏度左右；制作冷萃时则使用粗研磨咖啡粉，并冷藏浸泡8小时。
当指示灯连续闪烁三次时，表示电池电量低于20%，应使用随附的USB-C充电线充电。请勿使用输出功率超过30瓦的充电器。
本产品享受两年保修，但不包括人为进水、摔落和擅自拆机造成的损坏。`,
  },
  {
    id: 'paper',
    label: '论文摘要',
    meta: '论文摘要',
    content: `睡眠与记忆巩固：一项追踪研究摘要
本研究招募了128名大学生，连续28天记录他们的睡眠时长、入睡时间与学习内容。参与者每天佩戴腕带设备，并在每周完成一次记忆测试。
结果显示，平均睡眠时长达到7小时以上的参与者，在情景记忆测试中的得分比睡眠不足6小时的参与者高出18%。研究团队认为，慢波睡眠对记忆巩固具有关键作用。
实验还发现，睡前两小时内使用手机会显著延长入睡时间，但并未直接影响第二天的记忆成绩。研究人员提醒，这一结果只说明相关性，不能证明因果关系。
论文最后指出，样本主要来自在校大学生，结论能否推广到其他年龄群体仍需进一步研究。`,
  },
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function charLength(text) {
  return Array.from(text || '').length;
}

function truncate(text, max, suffix = '…') {
  const chars = Array.from(text || '');
  if (chars.length <= max) return text || '';
  return chars.slice(0, Math.max(0, max - 1)).join('') + suffix;
}

function normalizeWhitespace(text) {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[\t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function normalizeDocument(raw) {
  let text = normalizeWhitespace(raw);
  text = text
    .replace(/^```[a-z]*\s*$/gim, '')
    .replace(/\*\*|__/g, '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^\s*(?:[-*•·–—]|\d+[.)、]|[一二三四五六七八九十]+[、.])\s*/gm, '')
    // List labels are structure, not knowledge. Drop them at line/sentence starts
    // so "第一步：……" never becomes a quiz target.
    .replace(
      /(^|[。！？!?；;\n])\s*(?:第[一二三四五六七八九十百千万零两\d]+(?:步|条|项|章|节|部分|点|阶段|关|轮|则)|步骤[一二三四五六七八九十百千万零两\d]+|阶段[一二三四五六七八九十百千万零两\d]+)\s*[：:、.．]?\s*/gu,
      '$1'
    )
    // Inline "第二步：" / "步骤 2：" labels are still just structure.
    .replace(
      /(?:第[一二三四五六七八九十百千万零两\d]+(?:步|条|项|章|节|部分|点|阶段|关|轮|则)|步骤\s*[一二三四五六七八九十百千万零两\d]+|阶段\s*[一二三四五六七八九十百千万零两\d]+)\s*[：:、.．]\s*/gu,
      ''
    )
    .replace(/(^|[。！？!?；;\n])\s*(?:\d+|[一二三四五六七八九十]+)[、.．)]\s*/gu, '$1');
  return normalizeWhitespace(text);
}

export function hashString(input) {
  let hash = 2166136261;
  const str = String(input || '');
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function makeRng(seedInput) {
  let seed = typeof seedInput === 'number' ? seedInput >>> 0 : hashString(seedInput || 'docbomb');
  return function rng() {
    seed += 0x6d2b79f5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, rng) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickRandom(list, rng) {
  if (!list.length) return null;
  return list[Math.floor(rng() * list.length)];
}

function uniqueBy(list, getKey) {
  const seen = new Set();
  return list.filter((item) => {
    const key = getKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isChinese(text) {
  return CJK.test(text);
}

function detectLocale(text) {
  const letters = (text.match(/[A-Za-z]/g) || []).length;
  const han = (text.match(/[\u3400-\u9fff]/g) || []).length;
  return letters > han * 1.7 ? 'en' : 'zh';
}

function fallbackSegments(text) {
  const matches = text.match(/[A-Za-z][A-Za-z0-9+#._-]{1,}|[\u3400-\u9fff]{2,8}/g) || [];
  return matches.map((segment) => ({ segment, isWordLike: true }));
}

function segmentWords(text, locale) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    try {
      const segmenter = new Intl.Segmenter(locale, { granularity: 'word' });
      return [...segmenter.segment(text)].filter((part) => part.isWordLike);
    } catch {
      return fallbackSegments(text);
    }
  }
  return fallbackSegments(text);
}

function cleanToken(token) {
  return String(token || '')
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    .trim();
}

const ORDINAL_TERM_RE =
  /^(?:第\s*)?[一二两三四五六七八九十百千万零两\d]+(?:步|条|项|章|节|部分|点|阶段|关|轮|则|号|组|类|课|题)$/u;

function isOrdinalTerm(term) {
  const clean = cleanToken(term);
  if (!clean) return false;
  if (ORDINAL_TERM_RE.test(clean)) return true;
  return /^(?:步骤|阶段|环节|序号)[一二两三四五六七八九十百千万零两\d]+$/u.test(clean);
}

function isOrdinalNumberAt(sentence, index) {
  if (index < 0) return false;
  const before = String(sentence || '').slice(Math.max(0, index - 8), index);
  return /(?:第|步骤|阶段|环节|序号)\s*$/.test(before);
}

// List/sequence markers carry no knowledge worth quizzing. They show up as
// circled digits (①②③), parenthesised indexes ((1)/（一）/【3】), dotted or
// enumerated prefixes (1. / 1、 / 一、 / 第一步：) and ordinal labels (第X条).
const CIRCLED_MARKER_RE = /[①-⑳⑴-⒇⒈-⒛]/gu;
const PAREN_MARKER_RE =
  /[（(【\[]\s*(?:第\s*)?(?:[0-9０-９]{1,3}(?:[.．]\d+)?|[一二两三四五六七八九十百千]{1,3})\s*(?:步|条|项|章|节|点|阶段|轮|则|关|课|题)?\s*[）)】\]]/gu;
const LEADING_MARKER_RE =
  /^\s*第?\s*(?:[0-9０-９]{1,3}(?:[.．]\d+)?|[一二两三四五六七八九十百千]{1,3})\s*(?:步|条|项|章|节|点|阶段|轮|则|关|课|题)?\s*[、.．)）:：](?![0-9０-９])\s*/u;

// Remove enumeration decoration so it never becomes a quiz target or leaks
// into a prompt. "（1）先备份数据库。" -> "先备份数据库。"
function stripEnumerationMarkers(sentence) {
  return String(sentence || '')
    .replace(CIRCLED_MARKER_RE, ' ')
    .replace(PAREN_MARKER_RE, ' ')
    .replace(LEADING_MARKER_RE, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

// A number that is really a list index (wrapped in brackets, or trailed by a
// delimiter like 1. 1、 1）一、). Decimals such as 3.14 are left intact.
function isEnumerationNumberAt(sentence, index, value) {
  const text = String(sentence || '');
  if (index < 0) return false;
  const before = text[index - 1] || '';
  const after = text[index + String(value).length] || '';
  if ('（(【['.includes(before) && '）)】]'.includes(after)) return true;
  if ('、.．)）:：'.includes(after)) {
    const next = text[index + String(value).length + 1] || '';
    if (!/[0-9０-９]/.test(next)) return true;
  }
  return false;
}

function tokenIsUseful(token, locale) {
  const clean = cleanToken(token);
  if (!clean) return false;
  const chars = Array.from(clean);
  if (chars.length < 2 || chars.length > 18) return false;
  if (/^\d+$/.test(clean)) return false;
  if (isOrdinalTerm(clean)) return false;
  if (/^[一二两三四五六七八九十百千零]+(?:年|个月|周|天|小时|分钟|秒|次|人|名|位|倍|种|项|个|克|毫升|元|瓦|岁|分)$/.test(clean)) return false;
  if (locale === 'en' && clean.length < 3) return false;
  if (locale === 'zh' && !CJK.test(clean) && !LATIN.test(clean)) return false;
  const lower = clean.toLowerCase();
  if (ZH_STOPWORDS.has(clean) || EN_STOPWORDS.has(lower)) return false;
  if (/^[a-z]{1,2}$/i.test(clean)) return false;
  return true;
}

function tokenKey(token) {
  return token.toLowerCase().replace(/\s+/g, '');
}

function maskTerm(sentence, term) {
  if (!sentence || !term) return null;
  const index = sentence.indexOf(term);
  if (index < 0) return null;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matcher = new RegExp(escaped, 'g');
  const count = (sentence.match(matcher) || []).length;
  return {
    text: sentence.replace(matcher, '____'),
    count,
    index,
  };
}

function windowAround(text, index, maxLength = 150) {
  const chars = Array.from(text);
  if (chars.length <= maxLength) return text;
  // index is in UTF-16 code units; use a conservative surrounding window.
  const start = Math.max(0, index - Math.floor(maxLength * 0.35));
  let snippet = text.slice(start, start + maxLength);
  if (start > 0) snippet = `…${snippet.replace(/^[，,。；;：:\s]+/, '')}`;
  if (start + maxLength < text.length) snippet = `${snippet}…`;
  return snippet;
}

function finalizeChoice({ prompt, instruction, correct, distractors, tag, concept, explanation, source, kind = 'choice', rng }) {
  const uniqueDistractors = [];
  const seen = new Set([correct]);
  for (const candidate of distractors) {
    const value = String(candidate || '').trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    uniqueDistractors.push(value);
    if (uniqueDistractors.length === 3) break;
  }
  if (!correct || uniqueDistractors.length < 3) return null;
  const options = shuffle([correct, ...uniqueDistractors], rng);
  return {
    kind,
    tag,
    instruction,
    prompt,
    options,
    answerIndex: options.indexOf(correct),
    correctText: correct,
    concept,
    explanation,
    source,
  };
}

function buildDistractorPool(concepts, sentence, locale) {
  const inSentence = new Set();
  for (const term of concepts) {
    if (sentence.includes(term)) inSentence.add(term);
  }
  return concepts
    .map((item) => (typeof item === 'string' ? item : item.term))
    .filter((term) => term && !inSentence.has(term))
    .filter((term) => (locale === 'zh' ? isChinese(term) : LATIN.test(term)))
    .filter((term, index, arr) => arr.indexOf(term) === index);
}

function pickKeywordDistractors(correct, pool, rng, count = 3) {
  if (!pool.length) return [];
  const correctLength = charLength(correct);
  const scored = pool
    .filter((term) => term !== correct)
    .map((term) => ({
      term,
      distance: Math.abs(charLength(term) - correctLength),
      sameScript: isChinese(term) === isChinese(correct),
      tie: rng(),
    }))
    .sort((a, b) => {
      if (a.sameScript !== b.sameScript) return a.sameScript ? -1 : 1;
      if (a.distance !== b.distance) return a.distance - b.distance;
      return a.tie - b.tie;
    })
    .map((item) => item.term);
  return uniqueBy(scored, (term) => term).slice(0, count);
}

function findConceptTargets(sentence, concepts) {
  return concepts
    .map((item) => (typeof item === 'string' ? item : item.term))
    .filter((term) => sentence.includes(term))
    .filter((term) => charLength(term) >= 2 && charLength(term) <= 12)
    .filter((term) => !isOrdinalTerm(term))
    .sort((a, b) => charLength(b) - charLength(a));
}

function formatNumber(value, original) {
  if (!Number.isFinite(value)) return null;
  const hasDecimal = /[.,]\d+/.test(original);
  if (hasDecimal) {
    const normalized = value.toFixed(1).replace(/\.0$/, '');
    return normalized;
  }
  return String(Math.round(value));
}

const CHINESE_NUMBER_RE = /([一二两三四五六七八九十百千零]+)(年|个月|周|天|小时|分钟|秒|次|人|名|位|倍|种|项|个|克|毫升|元|瓦|岁|分)/g;

const CN_DIGITS = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };

function chineseToNumber(text) {
  const clean = String(text || '').replace(/两/g, '二');
  if (!clean) return null;
  if (!/[十百千]/.test(clean)) {
    return [...clean].map((char) => CN_DIGITS[char]).reduce((sum, value) => sum * 10 + (value ?? 0), 0);
  }
  let total = 0;
  let section = 0;
  let number = 0;
  for (const char of clean) {
    if (char in CN_DIGITS) {
      number = CN_DIGITS[char];
    } else if (char === '十') {
      section += (number || 1) * 10;
      number = 0;
    } else if (char === '百') {
      section += (number || 1) * 100;
      number = 0;
    } else if (char === '千') {
      section += (number || 1) * 1000;
      number = 0;
    }
  }
  total += section + number;
  return total || null;
}

function numberToChinese(value) {
  const n = Math.round(value);
  if (n <= 0 || n > 99) return String(n);
  if (n < 10) return ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'][n];
  if (n === 10) return '十';
  if (n < 20) return `十${numberToChinese(n - 10)}`;
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return `${['', '一', '二', '三', '四', '五', '六', '七', '八', '九'][tens]}十${ones ? numberToChinese(ones) : ''}`;
}

function numberVariants(numberText, allNumbers, rng) {
  const match = numberText.match(/^(\d{1,5}(?:[.,]\d+)?)(\s*[\s\S]*)$/);
  if (!match) {
    const cnMatch = numberText.match(/^([一二两三四五六七八九十百千零]+)(.*)$/);
    if (!cnMatch) return [];
    const value = chineseToNumber(cnMatch[1]);
    if (!value) return [];
    const unit = cnMatch[2] || '';
    const values = [value + 1, value - 1, value + 2, value * 2]
      .filter((item) => item > 0 && item <= 99)
      .map((item) => `${item === 2 ? '两' : numberToChinese(item)}${unit}`);
    return uniqueBy(shuffle(values, rng).filter((item) => item !== numberText), (item) => item);
  }
  const rawValue = Number(match[1].replace(',', '.'));
  const unit = match[2] || '';
  const isPercent = /^[%％]$/.test(unit.trim());
  const isYear = rawValue >= 1900 && rawValue <= 2100;
  const candidates = [];

  if (allNumbers.length) {
    for (const other of allNumbers) {
      if (other === numberText) continue;
      const otherMatch = other.match(/^(\d{1,5}(?:[.,]\d+)?)(\s*[\s\S]*)$/);
      if (!otherMatch) continue;
      if ((otherMatch[2] || '') === unit) candidates.push(other);
    }
  }

  const values = [];
  if (isYear) {
    values.push(rawValue + 1, rawValue - 1, rawValue + 2, rawValue - 2);
  } else if (isPercent) {
    values.push(rawValue + 10, rawValue - 10, rawValue + 20, rawValue - 20, rawValue / 2);
  } else if (Number.isInteger(rawValue)) {
    const step = rawValue >= 100 ? 20 : rawValue >= 20 ? 10 : 5;
    values.push(rawValue + step, rawValue - step, rawValue + step * 2, rawValue + 1, rawValue + 2);
  } else {
    values.push(rawValue * 2, rawValue / 2, rawValue + 0.5, rawValue - 0.5);
  }

  for (const value of values) {
    if (value <= 0) continue;
    if (isPercent && value > 100) continue;
    const formatted = formatNumber(value, match[1]);
    if (!formatted) continue;
    candidates.push(formatted + unit);
  }

  return uniqueBy(
    shuffle(candidates, rng).filter((item) => item !== numberText),
    (item) => item
  );
}

function clauseForOption(sentence, max = 118) {
  const clean = sentence.replace(/\s+/g, ' ').trim();
  if (charLength(clean) <= max) return clean;
  return null;
}

function substituteOnce(text, from, to) {
  if (!text.includes(from) || from === to) return null;
  const index = text.indexOf(from);
  return text.slice(0, index) + to + text.slice(index + from.length);
}

function mutateNumber(sentence, numbers, allNumbers, rng) {
  if (!numbers.length) return null;
  const ordered = shuffle(numbers, rng);
  for (const number of ordered) {
    const variants = numberVariants(number, allNumbers, rng);
    const variant = variants.find((item) => item !== number && !sentence.includes(item));
    if (!variant) continue;
    const mutated = substituteOnce(sentence, number, variant);
    if (mutated && mutated !== sentence) return { text: mutated, reason: '数字' };
  }
  return null;
}

function mutateModality(sentence, rng) {
  const pairs = shuffle(MODALITY_PAIRS, rng);
  for (const [from, to] of pairs) {
    let index = sentence.indexOf(from);
    if (index < 0) continue;
    let negated = false;
    while (index >= 0) {
      if (index > 0 && /[不未无]/.test(sentence[index - 1])) {
        negated = true;
        break;
      }
      index = sentence.indexOf(from, index + from.length);
    }
    if (negated) continue;
    const mutated = substituteOnce(sentence, from, to);
    if (mutated && mutated !== sentence) return { text: mutated, reason: '条件' };
  }
  return null;
}

function mutateConcept(sentence, concepts, allConcepts, rng) {
  const targets = shuffle(findConceptTargets(sentence, concepts), rng);
  const pool = allConcepts
    .map((item) => (typeof item === 'string' ? item : item.term))
    .filter((term) => term && !sentence.includes(term) && charLength(term) >= 2 && !isOrdinalTerm(term));
  for (const target of targets) {
    const replacement = pickRandom(pool, rng);
    if (!replacement) continue;
    const mutated = substituteOnce(sentence, target, replacement);
    if (mutated && mutated !== sentence) return { text: mutated, reason: '概念' };
  }
  return null;
}

function mutateNegation(sentence, rng) {
  const pairs = shuffle(NEGATION_PAIRS, rng);
  for (const [from, to] of pairs) {
    if (!sentence.includes(from)) continue;
    // Avoid "但是/只是/还是/就是" false positives for the bare character 是.
    if (from === '会' && /(社会|机会|会议)/.test(sentence)) continue;
    if (from === '能' && /(功能|能力|能源)/.test(sentence)) continue;
    const mutated = substituteOnce(sentence, from, to);
    if (mutated && mutated !== sentence) return { text: mutated, reason: '否定了关键条件' };
  }
  return null;
}

function mutateStatement(sentence, fact, allConcepts, allNumbers, rng, preferredStrategy = null) {
  const strategies = ['number', 'modality', 'negation', 'concept'];
  const order = preferredStrategy
    ? [preferredStrategy, ...strategies.filter((item) => item !== preferredStrategy)]
    : shuffle(strategies, rng);
  for (const strategy of order) {
    let mutation = null;
    if (strategy === 'number') mutation = mutateNumber(sentence, fact.numbers, allNumbers, rng);
    if (strategy === 'modality') mutation = mutateModality(sentence, rng);
    if (strategy === 'concept') mutation = mutateConcept(sentence, fact.concepts, allConcepts, rng);
    if (strategy === 'negation') mutation = mutateNegation(sentence, rng);
    if (mutation) return mutation;
  }
  return null;
}

function getNumbers(sentence) {
  const arabic = [...sentence.matchAll(NUMBER_RE)]
    .filter((match) => !isOrdinalNumberAt(sentence, match.index))
    .filter((match) => !isEnumerationNumberAt(sentence, match.index, match[0]))
    .map((match) => match[0].trim());
  const chinese = [...sentence.matchAll(CHINESE_NUMBER_RE)]
    .filter((match) => !isOrdinalNumberAt(sentence, match.index))
    .filter((match) => !isEnumerationNumberAt(sentence, match.index, match[0]))
    .map((match) => match[0].trim());
  return uniqueBy(
    [...arabic, ...chinese].filter((value) => value.length <= 20),
    (value) => value
  );
}

function clauseFallbackSentences(sentences) {
  const expanded = [];
  for (const sentence of sentences) {
    if (charLength(sentence) > 180) {
      expanded.push(sentence);
      continue;
    }
    const parts = sentence
      .split(/[，,；;]/u)
      .map((part) =>
        part
          .trim()
          .replace(/^(?:并且|并|同时|以及|且)\s*/u, '')
          .replace(/[，,；;]$/u, '')
      )
      .filter((part) => charLength(part) >= 10);
    if (parts.length >= 2) {
      for (const part of parts) {
        expanded.push(/[。！？!?]$/u.test(part) ? part : `${part}。`);
      }
    } else {
      expanded.push(sentence);
    }
  }
  return uniqueBy(expanded, (sentence) => sentence.replace(/\s+/g, ''));
}

function looksLikeHeadingLine(line) {
  const clean = line.trim();
  if (!clean) return false;
  if (charLength(clean) > 46) return false;
  if (/[。！？!?]/.test(clean)) return false;
  if (/^[一二三四五六七八九十]+[、.．]/.test(clean)) return false;
  return true;
}

function extractSentences(text, options = {}) {
  const lines = text.split(/\n+/);
  const sentences = [];
  let skippedHeading = false;
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const trimmed = lines[lineIndex].trim();
    if (!trimmed) continue;
    if (options.skipHeading && !skippedHeading && !sentences.length && looksLikeHeadingLine(trimmed)) {
      skippedHeading = true;
      continue;
    }
    const pieces = trimmed.split(/(?<=[。！？!?；;])\s*/u);
    for (const piece of pieces) {
      let sentence = piece.trim();
      if (!sentence) continue;
      sentence = sentence.replace(/[；;]\s*$/, '。');
      sentence = stripEnumerationMarkers(sentence);
      if (charLength(sentence) < 10) continue;
      if (/^[\s\p{P}\p{S}]+$/u.test(sentence)) continue;
      sentences.push(sentence);
    }
  }
  return uniqueBy(sentences, (sentence) => sentence.replace(/\s+/g, ''));
}

/**
 * Build weighted concept candidates from tokens and adjacent phrases.
 */
export function extractConcepts(text, locale = detectLocale(text), limit = 16) {
  const sentences = extractSentences(text);
  const stats = new Map();
  const add = (term, sentenceIndex, { phrase = false, tokenCount = 1, bonus = 0 } = {}) => {
    const clean = cleanToken(term);
    if (!tokenIsUseful(clean, locale)) return;
    const key = tokenKey(clean);
    const entry =
      stats.get(key) ||
      {
        term: clean,
        key,
        freq: 0,
        first: sentenceIndex,
        sentenceIndexes: new Set(),
        isPhrase: false,
        tokenCount: 1,
        bonus: 0,
      };
    entry.freq += 1;
    entry.sentenceIndexes.add(sentenceIndex);
    if (sentenceIndex < entry.first) {
      entry.term = clean;
      entry.first = sentenceIndex;
    }
    if (phrase) {
      entry.isPhrase = true;
      entry.tokenCount = Math.max(entry.tokenCount, tokenCount);
      entry.bonus = Math.max(entry.bonus, bonus);
    }
    stats.set(key, entry);
  };

  sentences.forEach((sentence, sentenceIndex) => {
    // Work clause by clause so phrases can never jump across punctuation.
    const chunks = sentence.split(/[，,。；;：:！？!?、\s]+/u).filter(Boolean);
    for (const chunk of chunks) {
      const parts = segmentWords(chunk, locale)
        .map((part) => cleanToken(part.segment))
        .filter(Boolean);

      // Break runs at function words and numbers. This keeps "数字 + 和 + 符号"
      // from becoming a fake compound like "数字和符号".
      const runs = [];
      let run = [];
      for (const part of parts) {
        const lower = part.toLowerCase();
        const breakRun =
          ZH_STOPWORDS.has(part) ||
          EN_STOPWORDS.has(lower) ||
          /^\d+$/.test(part) ||
          /^[\d.,%]+$/.test(part);
        if (breakRun) {
          if (run.length) runs.push(run);
          run = [];
          continue;
        }
        run.push(part);
      }
      if (run.length) runs.push(run);

      for (const tokens of runs) {
        for (const part of tokens) {
          if (tokenIsUseful(part, locale)) add(part, sentenceIndex);
        }
        if (locale !== 'zh') {
          for (let i = 0; i < tokens.length - 1; i += 1) {
            if (charLength(tokens[i]) < 3 || charLength(tokens[i + 1]) < 3) continue;
            add(`${tokens[i]} ${tokens[i + 1]}`, sentenceIndex, { phrase: true, tokenCount: 2, bonus: 0.2 });
          }
          continue;
        }
        for (let i = 0; i < tokens.length; i += 1) {
          if (charLength(tokens[i]) > 6) continue;
          for (let size = 2; size <= 3 && i + size - 1 < tokens.length; size += 1) {
            const window = tokens.slice(i, i + size);
            const phrase = window.join('');
            if (charLength(phrase) < 2 || charLength(phrase) > 10) continue;
            const lengths = window.map(charLength);
            const singles = lengths.filter((length) => length === 1).length;
            if (!singles) continue;
            const firstSingle = lengths[0] === 1;
            const lastSingle = lengths[lengths.length - 1] === 1;
            const allSingle = singles === lengths.length;
            const endsRun = i + size === tokens.length;
            const prefixJoin =
              size === 2 && firstSingle && charLength(window[1]) > 1 && PREFIX_CHARS.has(window[0]);
            const suffixJoin =
              size === 2 && lastSingle && endsRun && SUFFIX_CHARS.has(window[1]);
            const evenRunPair = size === 2 && allSingle && i % 2 === 0;
            const leadingRun = size === 3 && firstSingle && lengths[1] === 1 && lengths[2] > 1 && PREFIX_CHARS.has(window[0]);
            const trailingRun =
              size === 3 && lengths[0] > 1 && lastSingle && endsRun && SUFFIX_CHARS.has(window[2]);
            if (!(evenRunPair || prefixJoin || suffixJoin || leadingRun || trailingRun)) continue;
            add(phrase, sentenceIndex, {
              phrase: true,
              tokenCount: size,
              bonus: 0.65 + (allSingle ? 0.25 : 0),
            });
          }
        }
      }
    }
  });

  const totalSentences = Math.max(1, sentences.length);
  const ranked = [...stats.values()]
    .map((entry) => {
      const chars = charLength(entry.term);
      let score = 1.1 + Math.min(2.2, chars / 3);
      score += Math.min(3.4, Math.log2(entry.freq + 1) * 1.5);
      if (entry.isPhrase) score += entry.bonus;
      if (entry.first === 0) score += 0.75;
      if (entry.first === 1) score += 0.25;
      if (entry.sentenceIndexes.size / totalSentences > 0.7 && totalSentences > 3) score -= 1.3;
      if (GENERIC_TERMS.has(entry.term)) score -= 1.8;
      if (locale === 'zh' && chars > 10) score -= 0.8;
      if (locale === 'en' && /^[A-Z]{2,6}$/.test(entry.term)) score += 0.4;
      return { ...entry, score };
    })
    .sort((a, b) => b.score - a.score || a.first - b.first || b.term.length - a.term.length);

  const chosen = [];
  for (const candidate of ranked) {
    if (chosen.length >= limit) break;
    const currentIndex = chosen.findIndex((item) => item.key.includes(candidate.key) || candidate.key.includes(item.key));
    if (currentIndex >= 0) {
      const current = chosen[currentIndex];
      const currentLength = charLength(current.term);
      const nextLength = charLength(candidate.term);
      if (nextLength > currentLength && candidate.score >= current.score * 0.55 && nextLength - currentLength <= 6) {
        chosen[currentIndex] = { ...candidate };
      }
      continue;
    }
    chosen.push({ ...candidate });
  }

  return chosen.map((entry) => entry.term);
}

function detectTag(text) {
  const scores = TAG_RULES.map((rule) => {
    let score = 0;
    for (const word of rule.words) {
      const occurrences = text.split(word).length - 1;
      if (!occurrences) continue;
      score += occurrences * (charLength(word) >= 3 ? 2 : 1);
    }
    return { tag: rule.tag, family: rule.family, score };
  }).sort((a, b) => b.score - a.score);

  return scores[0] && scores[0].score > 0 ? scores[0] : { tag: '综合材料', family: 'general', score: 0 };
}

function extractTitle(text, concepts, tagInfo) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const first = lines[0] || '';
  const firstClean = first
    .replace(/^[「『《"“]|[」』》"”]$/g, '')
    .replace(/[：:]\s*$/, '')
    .trim();
  const looksLikeHeading =
    firstClean &&
    charLength(firstClean) <= 34 &&
    !/[。！？!?；;]/.test(firstClean) &&
    !/^(一|二|三|四|五|六|七|八|九|十)[、.．]/.test(firstClean);
  if (looksLikeHeading) return truncate(firstClean.replace(/^标题[：:]\s*/, ''), 32);

  const topConcept = concepts[0];
  if (topConcept) return `${truncate(topConcept, 16)}拆弹材料`;
  return `${tagInfo.tag || '未命名'}拆弹材料`;
}

function sentenceRanking(sentences, concepts, numbersBySentence) {
  const scores = concepts.map((term, index) => ({ term, score: 14 - index * 0.8 }));
  return sentences
    .map((sentence, index) => {
      const matched = scores.filter((item) => sentence.includes(item.term));
      let score = matched.reduce((sum, item) => sum + Math.min(3.2, item.score), 0);
      if (numbersBySentence[index].length) score += 1.1;
      const length = charLength(sentence);
      if (length >= 18 && length <= 100) score += 0.7;
      if (length > 150) score -= 0.7;
      if (index === 0) score += 0.5;
      if (index === 1) score += 0.2;
      if (/^[^，。！？]{1,10}[：:]/.test(sentence)) score += 0.4;
      if (!matched.length && !numbersBySentence[index].length) score -= 1.2;
      return {
        id: `s${index}`,
        sentence,
        index,
        score,
        concepts: matched.map((item) => item.term),
        numbers: numbersBySentence[index],
      };
    })
    .filter((fact) => charLength(fact.sentence) >= 12)
    .sort((a, b) => b.score - a.score);
}

function closestConcept(sentence, index, concepts) {
  if (index < 0) return null;
  const matches = [];
  for (const term of concepts) {
    if (!term || !sentence.includes(term)) continue;
    let from = 0;
    while (from < sentence.length) {
      const found = sentence.indexOf(term, from);
      if (found < 0) break;
      matches.push({ term, distance: Math.abs(found - index) });
      from = found + Math.max(1, term.length);
    }
  }
  matches.sort((a, b) => a.distance - b.distance || charLength(b.term) - charLength(a.term));
  return matches[0] ? matches[0].term : null;
}

function buildNumberCloze(fact, allConcepts, allNumbers, rng, avoidTargets) {
  if (!fact.numbers.length) return null;
  const numbers = shuffle(fact.numbers, rng);
  for (const number of numbers) {
    if (avoidTargets.has(number)) continue;
    const variants = numberVariants(number, allNumbers, rng).slice(0, 5);
    if (variants.length < 3) continue;
    const prompt = windowAround(fact.sentence, fact.sentence.indexOf(number));
    const blanked = maskTerm(prompt, number);
    if (!blanked) continue;
    const nearby = closestConcept(fact.sentence, fact.sentence.indexOf(number), fact.concepts);
    const conceptTarget =
      (nearby && !avoidTargets.has(nearby) ? nearby : null) ||
      findConceptTargets(fact.sentence, fact.concepts).find((term) => !avoidTargets.has(term)) ||
      findConceptTargets(fact.sentence, allConcepts).find((term) => !avoidTargets.has(term)) ||
      '关键数字';
    const question = finalizeChoice({
      prompt: blanked.text,
      instruction: '把缺失的数值接回引信',
      correct: number,
      distractors: variants,
      tag: /[%％]/.test(number) ? '比例核对' : '数字核对',
      concept: conceptTarget,
      explanation: `原文：「${fact.sentence}」`,
      source: fact.sentence,
      rng,
    });
    if (question) {
      avoidTargets.add(number);
      if (conceptTarget !== '关键数字') avoidTargets.add(conceptTarget);
      return question;
    }
  }
  return null;
}

function buildKeywordCloze(fact, allConcepts, optionPool, rng, avoidTargets) {
  const targets = findConceptTargets(fact.sentence, fact.concepts).filter((term) => !avoidTargets.has(term));
  const extras = findConceptTargets(fact.sentence, allConcepts).filter((term) => !avoidTargets.has(term));
  const ordered = uniqueBy([...targets, ...extras], (term) => term);
  const preferred = ordered.slice(0, 5);
  const rest = ordered.slice(5);
  const targetOrder = [...shuffle(preferred, rng), ...shuffle(rest, rng)];
  for (const target of targetOrder) {
    if (target === '关键数字') continue;
    const masked = maskTerm(fact.sentence, target);
    if (!masked) continue;
    const distractors = pickKeywordDistractors(target, optionPool, rng, 3);
    if (distractors.length < 3) continue;
    const prompt = windowAround(masked.text, Math.max(0, masked.text.indexOf('____')));
    const question = finalizeChoice({
      prompt,
      instruction: '把缺失的概念接回原位',
      correct: target,
      distractors,
      tag: '概念接线',
      concept: target,
      explanation: `原文：「${fact.sentence}」`,
      source: fact.sentence,
      rng,
    });
    if (question) {
      avoidTargets.add(target);
      return question;
    }
  }
  return null;
}

function buildBoolean(fact, allConcepts, allNumbers, rng, { forceFalse = false, avoidTargets = new Set() } = {}) {
  let statement = fact.sentence;
  let isFalse = false;
  if (forceFalse) {
    const preferred = fact.numbers.length ? 'number' : 'modality';
    const mutation = mutateStatement(fact.sentence, fact, allConcepts, allNumbers, rng, preferred);
    if (mutation) {
      statement = mutation.text;
      isFalse = true;
    }
  }
  const conceptTarget =
    findConceptTargets(fact.sentence, fact.concepts).find((term) => !avoidTargets.has(term)) ||
    findConceptTargets(fact.sentence, allConcepts).find((term) => !avoidTargets.has(term)) ||
    '材料细节';

  const prompt = charLength(statement) > 170 ? windowAround(statement, 0, 165) : statement;
  const isStatementTrue = !isFalse;
  const question = {
    kind: 'boolean',
    tag: isFalse ? '真伪判断' : '事实核对',
    instruction: '判断这条陈述是否忠于材料',
    prompt,
    options: ['符合材料', '不符合材料'],
    answerIndex: isStatementTrue ? 0 : 1,
    correctText: isStatementTrue ? '符合材料' : '不符合材料',
    concept: conceptTarget,
    explanation: isFalse
      ? `这条陈述被改动了。原文是：「${fact.sentence}」`
      : `原文确实这样写：「${fact.sentence}」`,
    source: fact.sentence,
  };
  if (conceptTarget !== '材料细节') avoidTargets.add(conceptTarget);
  return question;
}

function buildBestChoice(fact, allConcepts, allNumbers, rng, avoidTargets) {
  const correct = clauseForOption(fact.sentence);
  if (!correct) return null;
  const mutations = [];
  const pushMutation = (mutation) => {
    if (!mutation) return false;
    const text = clauseForOption(mutation.text);
    if (!text || text === correct || mutations.some((item) => item.text === text)) return false;
    mutations.push({ ...mutation, text });
    return mutations.length >= 3;
  };

  // Favour several small numeric changes: they read as believable near-misses.
  for (const number of shuffle(fact.numbers, rng)) {
    if (mutations.length >= 3) break;
    for (const variant of numberVariants(number, allNumbers, rng)) {
      const mutated = substituteOnce(fact.sentence, number, variant);
      if (pushMutation(mutated ? { text: mutated, reason: '数字' } : null)) break;
    }
  }
  const strategies = ['modality', 'negation', 'concept'];
  for (const strategy of strategies) {
    if (mutations.length >= 3) break;
    pushMutation(mutateStatement(fact.sentence, fact, allConcepts, allNumbers, rng, strategy));
  }
  if (mutations.length < 3) return null;

  const conceptTarget =
    findConceptTargets(fact.sentence, fact.concepts).find((term) => !avoidTargets.has(term)) ||
    findConceptTargets(fact.sentence, allConcepts).find((term) => !avoidTargets.has(term)) ||
    '原文细节';

  const question = finalizeChoice({
    prompt: pickRandom(
      [
        '哪一根线，连着材料的原意？',
        '以下哪一项没有被改过？',
        '找出唯一忠于原文的陈述。',
        '哪条线还连着原文？',
      ],
      rng
    ),
    instruction: '只有一条陈述忠于原文，其余都动过手脚',
    correct,
    distractors: mutations.map((item) => item.text),
    tag: '原文辨识',
    concept: conceptTarget,
    explanation: `原文是：「${fact.sentence}」。其余选项改动了${mutations.map((item) => item.reason).filter((item, index, arr) => arr.indexOf(item) === index).join('、')}。`,
    source: fact.sentence,
    rng,
  });
  if (question && conceptTarget !== '原文细节') avoidTargets.add(conceptTarget);
  return question;
}

function pickFact(facts, usedSentenceIds, predicate = () => true) {
  const unused = facts.filter((fact) => !usedSentenceIds.has(fact.id) && predicate(fact));
  const pool = unused.length ? unused : facts.filter(predicate);
  const fallback = pool.length ? pool : facts;
  return fallback[0] || null;
}

/**
 * Weighted shuffle: facts keep a quality bias without always appearing in the
 * same order. This is what makes two attempts at the same document feel fresh.
 */
function shuffleFacts(facts, rng) {
  return facts
    .map((fact) => {
      const weight = 1 + Math.max(0, Math.min(6, Number(fact.score) || 0) - 2) * 0.16;
      return { fact, key: Math.pow(rng(), 1 / weight) };
    })
    .sort((a, b) => b.key - a.key)
    .map((item) => item.fact);
}

function topUpQuestions(questions, facts, allConcepts, optionPool, allNumbers, rng, usedSentenceIds, avoidTargets) {
  const result = [...questions];
  if (result.length >= 5) return result.slice(0, 5);
  const builders = [
    (fact) => buildKeywordCloze(fact, allConcepts, optionPool, rng, avoidTargets),
    (fact) => buildNumberCloze(fact, allConcepts, allNumbers, rng, avoidTargets),
    (fact) => buildBestChoice(fact, allConcepts, allNumbers, rng, avoidTargets),
    (fact) => buildBoolean(fact, allConcepts, allNumbers, rng, { forceFalse: true, avoidTargets }),
    (fact) => buildBoolean(fact, allConcepts, allNumbers, rng, { forceFalse: false, avoidTargets }),
  ];

  // Prefer facts that have not produced a question yet.
  const orderedFacts = [...facts].sort(
    (a, b) => Number(usedSentenceIds.has(a.id)) - Number(usedSentenceIds.has(b.id))
  );

  const seen = (question) =>
    result.some((item) => item.prompt === question.prompt && item.tag === question.tag);

  // Breadth-first filling: one question per unused source before borrowing a
  // second question from the same sentence. This is what prevents sets like
  // "true/false on sentence A + another true/false on sentence A".
  const firstPerFact = [];
  for (const fact of orderedFacts) {
    if (usedSentenceIds.has(fact.id)) continue;
    for (const build of builders) {
      const question = build(fact);
      if (!question || seen(question)) continue;
      if (firstPerFact.some((item) => item.question.prompt === question.prompt && item.question.tag === question.tag)) continue;
      firstPerFact.push({ fact, question });
      break;
    }
  }
  for (const item of firstPerFact) {
    if (result.length >= 5) break;
    if (usedSentenceIds.has(item.fact.id)) continue;
    result.push(item.question);
    usedSentenceIds.add(item.fact.id);
  }

  // Only if the document simply does not have five usable facts: add a second
  // question from an already-used fact, with a different target/type.
  for (const fact of orderedFacts) {
    if (result.length >= 5) break;
    for (const build of builders) {
      if (result.length >= 5) break;
      const question = build(fact);
      if (!question || seen(question)) continue;
      result.push(question);
      usedSentenceIds.add(fact.id);
    }
  }

  return result.slice(0, 5);
}

/**
 * Generate a complete challenge from raw document text.
 */
export function generateChallenge(rawText, options = {}) {
  const text = normalizeDocument(rawText);
  const length = charLength(text);
  if (length < 60) {
    throw new Error('材料太短了。至少给它 60 个字，才够埋五枚炸弹。');
  }
  if (length > 30000) {
    throw new Error('材料超过 30,000 字。先节选最想记住的部分再装填。');
  }

  const locale = detectLocale(text);
  const concepts = extractConcepts(text, locale, 18);
  if (!concepts.length) {
    throw new Error('没能从这份材料里提炼出概念。试试多写几句完整的话。');
  }

  const tagInfo = detectTag(text);
  const title = truncate(
    (options.title && String(options.title).trim()) || extractTitle(text, concepts, tagInfo),
    36
  );
  const allSentences = extractSentences(text);
  const sentences = extractSentences(text, { skipHeading: true });
  let factSentences = sentences.length ? sentences : allSentences;
  if (factSentences.length < 5) {
    const expanded = clauseFallbackSentences(factSentences);
    if (expanded.length > factSentences.length) factSentences = expanded;
  }
  const numbersBySentence = factSentences.map(getNumbers);
  const allNumbers = uniqueBy(
    numbersBySentence.flat().filter((number) => number.length <= 18),
    (number) => number
  );
  const optionPool = uniqueBy(
    [...concepts, ...extractConcepts(text, locale, 24)],
    (term) => term.toLowerCase()
  );
  const rankedFacts = sentenceRanking(factSentences, concepts, numbersBySentence).slice(0, 10);
  if (!rankedFacts.length) throw new Error('没有找到可用的完整句子。换一段材料试试。');

  const seed = options.seed != null ? options.seed : hashString(text + title);
  const rng = makeRng(seed);
  // Shuffle after ranking: the same document should not always produce the
  // exact same five source sentences.
  const facts = shuffleFacts(rankedFacts, rng);
  const usedSentenceIds = new Set();
  const avoidTargets = new Set();
  const questions = [];

  // 1. Number cloze if the document has one; otherwise a concept cloze.
  let fact = pickFact(facts, usedSentenceIds, (item) => item.numbers.length > 0);
  let q = fact ? buildNumberCloze(fact, concepts, allNumbers, rng, avoidTargets) : null;
  if (!q && facts[0]) {
    fact = facts[0];
    q = buildKeywordCloze(fact, concepts, optionPool, rng, avoidTargets);
  }
  if (q && fact) {
    questions.push(q);
    usedSentenceIds.add(fact.id);
  }

  // 2. A true statement — establishes the "read the source" rhythm.
  fact = pickFact(facts, usedSentenceIds);
  q = fact ? buildBoolean(fact, concepts, allNumbers, rng, { forceFalse: false, avoidTargets }) : null;
  if (q && fact) {
    questions.push(q);
    usedSentenceIds.add(fact.id);
  }

  // 3. A different concept cloze.
  fact = pickFact(facts, usedSentenceIds);
  q = fact ? buildKeywordCloze(fact, concepts, optionPool, rng, avoidTargets) : null;
  if (q && fact) {
    questions.push(q);
    usedSentenceIds.add(fact.id);
  }

  // 4. Find the one untouched statement.
  const bestChoiceFact =
    pickFact(facts, usedSentenceIds, (item) => charLength(item.sentence) <= 118) ||
    pickFact(facts, usedSentenceIds);
  q = bestChoiceFact ? buildBestChoice(bestChoiceFact, concepts, allNumbers, rng, avoidTargets) : null;
  if (q && bestChoiceFact) {
    questions.push(q);
    usedSentenceIds.add(bestChoiceFact.id);
  }

  // 5. A manipulated statement. If mutation fails, a true/false still works.
  fact = pickFact(facts, usedSentenceIds);
  q = fact ? buildBoolean(fact, concepts, allNumbers, rng, { forceFalse: true, avoidTargets }) : null;
  if (q && fact) {
    questions.push(q);
    usedSentenceIds.add(fact.id);
  }

  const completed = topUpQuestions(
    questions,
    facts,
    concepts,
    optionPool,
    allNumbers,
    rng,
    usedSentenceIds,
    avoidTargets
  ).map((question, index) => ({
    ...question,
    id: `q${index + 1}`,
    level: index + 1,
  }));

  if (completed.length < 5) {
    throw new Error('这份材料太零碎，没凑够 5 个有效问题。再补充一些完整句子。');
  }

  const avgLength = Math.round(
    factSentences.reduce((sum, sentence) => sum + charLength(sentence), 0) / Math.max(1, factSentences.length)
  );
  const danger = clamp(
    2 + Math.round(length / 900 + allNumbers.length / 14 + (avgLength > 80 ? 1 : 0)),
    2,
    5
  );
  const summaryFact = rankedFacts.slice().sort((a, b) => b.score - a.score)[0];
  const readingSeconds = Math.max(20, Math.round(length / 8));

  return {
    version: 1,
    title,
    tag: tagInfo.tag,
    family: tagInfo.family,
    locale,
    summary: truncate(summaryFact ? summaryFact.sentence : factSentences[0] || allSentences[0] || '', 112),
    concepts: concepts.slice(0, 8),
    questions: completed,
    stats: {
      chars: length,
      sentences: allSentences.length,
      numbers: allNumbers.length,
      readingSeconds,
      danger,
    },
    seed,
    createdAt: options.createdAt || new Date().toISOString(),
  };
}

export function gradeResult(correctCount, total, secondsLeft, wrongCount = 0) {
  if (correctCount <= 0) {
    return { grade: 'F', score: 0, rank: '待回收' };
  }
  const base = correctCount * 120;
  const timeBonus = Math.max(0, Math.round(secondsLeft * 1.5));
  const penalty = wrongCount * 25;
  const score = Math.max(0, base + timeBonus - penalty);
  let grade = 'C';
  if (correctCount === total) {
    if (secondsLeft >= 110) grade = 'S';
    else if (secondsLeft >= 80) grade = 'A';
    else if (secondsLeft >= 45) grade = 'B';
    else grade = 'C';
  } else if (correctCount >= total - 1) {
    grade = secondsLeft >= 70 ? 'B' : 'C';
  } else {
    grade = 'C';
  }
  const ranks = {
    S: '首席排爆员',
    A: '资深拆弹员',
    B: '持证拆弹员',
    C: '见习拆弹员',
    F: '待回收人员',
  };
  return { grade, score, rank: ranks[grade] };
}

export function makeSerial(seed, createdAt = new Date()) {
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const year = Number.isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let value = hashString(String(seed));
  let suffix = '';
  for (let i = 0; i < 5; i += 1) {
    suffix += alphabet[value % alphabet.length];
    value = Math.floor(value / alphabet.length);
  }
  return `DB-${year}-${suffix}`;
}

export function pickSnark(seed = Date.now()) {
  const lines = [
    '这根线连着你的年终奖。可惜剪错了。',
    '材料里写得清清楚楚，你偏要自由发挥。',
    '不是炸弹太快，是你翻笔记太慢。',
    '这一下，连保险丝都替你尴尬。',
    '知识没进脑子，火花倒是进了眼睛。',
    '剪错不可怕，可怕的是你还点了确认。',
    '引信已提速。现在开始，脑子请跟上手。',
    '你拆掉的是线，留下的是教训。',
    '别慌，只是倒计时开始催你补课了。',
    '这题材料里有。真的。就在你刚才没看的那句。',
  ];
  return lines[Math.abs(hashString(String(seed))) % lines.length];
}

export const getSampleDocs = () => SAMPLE_DOCS.map(({ id, label, meta, content }) => ({ id, label, meta, content }));
