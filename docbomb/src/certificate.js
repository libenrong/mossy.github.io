/**
 * Renders the certificate to a high-resolution PNG using Canvas, so the result
 * can be saved or printed without a screenshot.
 */

const W = 1600;
const H = 1100;
const INK = '#171810';
const PAPER = '#efe6d2';
const MUTED = '#777561';
const RED = '#9c2a1e';
const ACID = '#7bc96f';

function mulberry(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function font(size, weight = 400, family = 'sans') {
  if (family === 'display') return `${weight} ${size}px "Songti SC", "STSong", "Noto Serif SC", serif`;
  if (family === 'mono') return `${weight} ${size}px "SFMono-Regular", "Menlo", "Consolas", monospace`;
  return `${weight} ${size}px "Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif`;
}

function wrapLines(ctx, text, maxWidth) {
  const tokens = String(text || '').match(/[\u3400-\u9fff]|[^\s\u3400-\u9fff]+|\s+/g) || [''];
  const lines = [];
  let line = '';
  for (const token of tokens) {
    const next = line + token;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line.trim());
      line = token.trimStart();
    } else {
      line = next;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

function drawText(ctx, text, x, y, options = {}) {
  ctx.save();
  ctx.fillStyle = options.color || INK;
  ctx.font = options.font || font(24);
  ctx.textAlign = options.align || 'left';
  ctx.textBaseline = options.baseline || 'alphabetic';
  if (options.letterSpacing && 'letterSpacing' in ctx) ctx.letterSpacing = `${options.letterSpacing}px`;
  ctx.fillText(String(text || ''), x, y);
  ctx.restore();
}

function drawDots(ctx, rng) {
  ctx.save();
  for (let i = 0; i < 520; i += 1) {
    const x = rng() * W;
    const y = rng() * H;
    const size = rng() * 1.5 + 0.2;
    ctx.fillStyle = `rgba(23,24,16,${rng() * 0.035 + 0.012})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBombMark(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(22, 28, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(28, 14);
  ctx.lineTo(35, 7);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(35, 7);
  ctx.quadraticCurveTo(42, 2, 43, 8);
  ctx.quadraticCurveTo(43, 12, 39, 12);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, 4);
  ctx.lineTo(43, 1);
  ctx.moveTo(42, 9);
  ctx.lineTo(46, 8);
  ctx.stroke();
  ctx.fillStyle = PAPER;
  ctx.fillRect(16, 23, 13, 2.4);
  ctx.fillRect(16, 28, 8, 2.4);
  ctx.restore();
}

function drawStamp(ctx, x, y, radius) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((-13 * Math.PI) / 180);
  ctx.strokeStyle = RED;
  ctx.fillStyle = RED;
  ctx.globalAlpha = 0.78;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1.4;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.arc(0, 0, radius - 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = font(radius * 0.34, 700, 'display');
  ctx.fillText('已拆除', 0, -8);
  ctx.font = font(radius * 0.16, 700, 'mono');
  ctx.fillText('DEFUSED / DOCBOMB', 0, 20);
  ctx.restore();
}

function drawWireBottom(ctx) {
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 2;
  const colors = [ACID, '#c78d58', '#7c8a62', '#b1a78e'];
  colors.forEach((color, index) => {
    ctx.strokeStyle = color;
    ctx.beginPath();
    const y = H - 72 + index * 3;
    ctx.moveTo(80, y);
    ctx.bezierCurveTo(450, y - 18 + index * 6, 900, y + 16 - index * 4, 1520, y);
    ctx.stroke();
  });
  ctx.restore();
}

export async function renderCertificate(data) {
  try {
    await document.fonts.ready;
  } catch {
    // Fonts API unavailable; system fallbacks are fine.
  }

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('浏览器无法绘制证书');

  const rng = mulberry(23041);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  // Paper grid.
  ctx.save();
  ctx.strokeStyle = 'rgba(23,24,16,.035)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();
  drawDots(ctx, rng);

  // Borders.
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(46, 46, W - 92, H - 92);
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5;
  ctx.strokeRect(58, 58, W - 116, H - 116);
  ctx.restore();

  // Top identifiers.
  drawBombMark(ctx, 88, 80, 1.2);
  drawText(ctx, 'DOCBOMB', 150, 93, { font: font(17, 700, 'mono'), letterSpacing: 2.2 });
  drawText(ctx, 'OFFICIAL DEFUSAL DIVISION / 排爆训练中心', 150, 116, {
    font: font(10, 400, 'mono'),
    color: MUTED,
    letterSpacing: 1.2,
  });
  drawText(ctx, `CERTIFICATE NO. ${data.serial || 'DB-2026-00000'}`, W - 88, 95, {
    font: font(11, 700, 'mono'),
    color: RED,
    align: 'right',
    letterSpacing: 0.8,
  });
  drawText(ctx, 'KNOWLEDGE DEFUSAL CERTIFICATE', W - 88, 116, {
    font: font(9, 400, 'mono'),
    color: MUTED,
    align: 'right',
    letterSpacing: 1.2,
  });

  // Header rule.
  ctx.save();
  ctx.strokeStyle = 'rgba(23,24,16,.22)';
  ctx.beginPath();
  ctx.moveTo(88, 145);
  ctx.lineTo(W - 88, 145);
  ctx.stroke();
  ctx.restore();

  drawText(ctx, 'KNOWLEDGE DEFUSAL CERTIFICATE / 知识拆弹证书', W / 2, 200, {
    font: font(11, 700, 'mono'),
    color: MUTED,
    align: 'center',
    letterSpacing: 3,
  });
  drawText(ctx, '知识拆弹证书', W / 2, 285, {
    font: font(74, 700, 'display'),
    align: 'center',
    letterSpacing: 8,
  });

  // Recipient and body.
  const callsign = data.callsign || '匿名拆弹员';
  const title = data.title || '未命名材料';
  const removed = Number(data.correctCount);
  const countText = Number.isFinite(removed) ? `${removed} / 5` : '5 / 5';
  drawText(ctx, '兹证明以下拆弹员完成本次知识拆弹任务', W / 2, 348, {
    font: font(21, 400, 'display'),
    color: '#4c4d3e',
    align: 'center',
  });
  drawText(ctx, callsign, W / 2, 409, {
    font: font(46, 700, 'display'),
    align: 'center',
    letterSpacing: 2,
  });
  ctx.save();
  ctx.strokeStyle = 'rgba(23,24,16,.28)';
  ctx.beginPath();
  ctx.moveTo(W / 2 - 230, 430);
  ctx.lineTo(W / 2 + 230, 430);
  ctx.stroke();
  ctx.restore();
  const body = `已成功拆除《${title}》中的 ${countText} 枚知识炸弹。在限时拆弹过程中，其判断、手速与阅读材料时的耐心均未引发重大事故。`;
  ctx.save();
  ctx.fillStyle = '#4c4d3e';
  ctx.font = font(19, 400, 'display');
  ctx.textAlign = 'center';
  const lines = wrapLines(ctx, body, 1120);
  lines.slice(0, 2).forEach((line, index) => {
    ctx.fillText(line, W / 2, 472 + index * 30);
  });
  ctx.restore();

  // Stat band.
  const bandY = 534;
  const bandH = 132;
  ctx.save();
  ctx.strokeStyle = 'rgba(23,24,16,.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(150, bandY);
  ctx.lineTo(W - 150, bandY);
  ctx.moveTo(150, bandY + bandH);
  ctx.lineTo(W - 150, bandY + bandH);
  ctx.stroke();
  const stats = [
    ['拆除', data.correct || '5 / 5'],
    ['剩余时间', data.timeLeft || '03:00'],
    ['拆弹得分', String(data.score || 0)],
    ['评定', data.grade || 'S'],
  ];
  const colWidth = (W - 300) / 4;
  stats.forEach(([label, value], index) => {
    const cx = 150 + colWidth * index + colWidth / 2;
    if (index > 0) {
      ctx.strokeStyle = 'rgba(23,24,16,.16)';
      ctx.beginPath();
      ctx.moveTo(150 + colWidth * index, bandY + 24);
      ctx.lineTo(150 + colWidth * index, bandY + bandH - 24);
      ctx.stroke();
    }
    drawText(ctx, label, cx, bandY + 42, {
      font: font(11, 400, 'mono'),
      color: MUTED,
      align: 'center',
      letterSpacing: 1.1,
    });
    drawText(ctx, value, cx, bandY + 89, {
      font: font(index === 3 ? 44 : 32, 700, 'mono'),
      align: 'center',
      letterSpacing: index === 3 ? 0 : -1,
    });
  });
  ctx.restore();

  // Big ghost grade.
  ctx.save();
  ctx.globalAlpha = 0.055;
  ctx.fillStyle = INK;
  ctx.font = font(260, 700, 'mono');
  ctx.textAlign = 'right';
  ctx.fillText(data.grade || 'S', W - 190, 660);
  ctx.restore();

  // Rank + short assessment.
  drawText(ctx, `RANK / ${data.rank || '持证拆弹员'}`, 92, 748, {
    font: font(12, 700, 'mono'),
    color: RED,
    letterSpacing: 1,
  });
  drawText(ctx, data.assessment || '拆弹过程基本稳定，建议继续保持对无聊材料的警觉。', 92, 778, {
    font: font(14, 400, 'sans'),
    color: MUTED,
  });

  // Signature block.
  ctx.save();
  ctx.strokeStyle = 'rgba(23,24,16,.4)';
  ctx.beginPath();
  ctx.moveTo(92, 920);
  ctx.lineTo(430, 920);
  ctx.stroke();
  ctx.restore();
  drawText(ctx, '排爆训练中心 / CHIEF INSTRUCTOR', 92, 945, {
    font: font(9, 400, 'mono'),
    color: MUTED,
    letterSpacing: 0.8,
  });
  drawText(ctx, '拆弹笔记', 92, 985, {
    font: font(24, 700, 'display'),
    letterSpacing: 3,
  });
  drawText(ctx, '此证书不具备法律效力，但值得发朋友圈。', 92, 1012, {
    font: font(9, 400, 'mono'),
    color: MUTED,
  });

  drawText(ctx, 'ISSUED', W - 380, 945, {
    font: font(9, 400, 'mono'),
    color: MUTED,
    align: 'right',
    letterSpacing: 0.8,
  });
  drawText(ctx, data.date || '2026.01.01', W - 380, 970, {
    font: font(14, 700, 'mono'),
    align: 'right',
  });
  drawText(ctx, 'VALID', W - 380, 997, {
    font: font(9, 400, 'mono'),
    color: MUTED,
    align: 'right',
    letterSpacing: 0.8,
  });
  drawText(ctx, 'FOREVER / 永久有效', W - 380, 1018, {
    font: font(10, 700, 'mono'),
    align: 'right',
  });

  drawStamp(ctx, W - 140, 830, 92);
  drawWireBottom(ctx);

  // Signature scribble.
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(100, 956);
  ctx.bezierCurveTo(160, 930, 190, 968, 240, 940);
  ctx.bezierCurveTo(280, 920, 300, 954, 350, 930);
  ctx.stroke();
  ctx.restore();

  return canvas;
}

export async function downloadCertificate(data) {
  const canvas = await renderCertificate(data);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('证书生成失败');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `DocBomb-${data.serial || 'certificate'}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 3000);
}
