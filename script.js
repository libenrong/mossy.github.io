/* =========================================================
   苔石 MOSSYMC 官网脚本（全新）
   - 状态卡：双数据源真实状态（mcsrvstat + mcstatus），在线/容量/版本/MOTD/语录轮播
   - 地址复制、主题切换、滚动揭示、FIM 彩蛋
   ========================================================= */

/* ================= 服务器配置 ================= */
const SERVER_HOST = 'mossymc.top';          // 状态接口查询目标（SRV 已配置）
const SERVER_ADDR = 'mossymc.top';          // 玩家复制的进服地址
const DIRECT_ADDR = 'play.simpfun.cn:30843';

/* 游戏内 MiniMOTD 语录兜底（离线时轮播） */
const MOTD_FALLBACK = [
    '「实事求是」',
    '「星星之火，可以燎原」',
    '「枪杆子里面出政权」',
    '「一万年太久，只争朝夕」',
    '「好好学习，天天向上」',
    '「谦虚使人进步，骄傲使人落后」',
    '「下定决心，排除万难，去争取胜利」'
];

/* ================= 状态控制台 ================= */
(function initConsole() {
    const onlineEl = document.getElementById('onlineCount');
    const maxEl = document.getElementById('maxCount');
    const statusEl = document.getElementById('serverStatus');
    const versionEl = document.getElementById('serverVersion');
    const motdLineEl = document.getElementById('motdLine');
    const motdQuoteEl = document.getElementById('motdQuote');
    const card = document.getElementById('consoleCard');
    if (!onlineEl || !statusEl) return;

    let liveQuotes = null;
    let quoteIdx = 0;
    let lastOnline = 0;
    let hasData = false;
    let failStreak = 0;

    function setStatus(text, state) {
        const t = statusEl.querySelector('.status-text');
        const led = statusEl.querySelector('.led');
        if (t) t.textContent = text;
        if (led) led.className = 'led led-' + state;
    }

    function setCard(cls) {
        if (!card) return;
        card.classList.remove('is-offline', 'is-stale');
        if (cls) card.classList.add(cls);
    }

    function placeholders() {
        onlineEl.textContent = '--';
        maxEl.textContent = '--';
        if (versionEl) versionEl.textContent = '--';
        if (motdLineEl) motdLineEl.textContent = '--';
    }

    function showOffline() {
        placeholders();
        setStatus('OFFLINE', 'offline');
        setCard('is-offline');
    }

    function showNoData() {
        if (!hasData) placeholders();
        setStatus('NO DATA', 'pending');
        setCard('is-stale');
    }

    function animateNumber(el, from, to, duration) {
        if (Number.isNaN(from)) from = 0;
        const start = performance.now();
        const step = (now) => {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(from + (to - from) * eased);
            if (p < 1) requestAnimationFrame(step);
            else el.textContent = String(to);
        };
        requestAnimationFrame(step);
    }

    /* MOTD：首行拆标题与版本，其余行做语录轮播 */
    function applyMotd(lines, version) {
        const first = lines[0] ? lines[0].split('|').map(s => s.trim()).filter(Boolean) : [];

        if (motdLineEl) motdLineEl.textContent = first[0] || '--';

        const verFromMotd = first.find(s => /版本|version/i.test(s));
        if (versionEl) {
            versionEl.textContent = verFromMotd
                ? verFromMotd.replace(/^.*版本[:：]?\s*/i, '')
                : (version || '--');
        }

        const rest = lines.slice(1)
            .flatMap(l => l.split(/\s*\|\s*/))
            .map(s => s.trim())
            .filter(s => s && !/QQ群/i.test(s) && !/版本|version/i.test(s));
        if (rest.length) liveQuotes = rest;
    }

    function rotateQuote() {
        if (!motdQuoteEl) return;
        const pool = liveQuotes && liveQuotes.length ? liveQuotes : MOTD_FALLBACK;
        const next = pool[quoteIdx % pool.length];
        quoteIdx++;
        motdQuoteEl.classList.add('swap');
        setTimeout(() => {
            motdQuoteEl.textContent = next;
            motdQuoteEl.classList.remove('swap');
        }, 350);
    }
    if (motdQuoteEl) setInterval(rotateQuote, 5000);

    /* ---- 双数据源解析 ---- */
    function parseMcsrvstat(p) {
        if (!p || typeof p.online !== 'boolean') return null;
        if (!p.online) return { online: false };
        return {
            online: true,
            count: (p.players && p.players.online) || 0,
            max: (p.players && p.players.max) || 0,
            version: typeof p.version === 'string' ? p.version : '',
            lines: ((p.motd && p.motd.clean) || []).map(s => String(s).trim()).filter(Boolean)
        };
    }

    function parseMcstatus(p) {
        if (!p || typeof p.online !== 'boolean') return null;
        if (!p.online) return { online: false };
        const clean = (p.motd && p.motd.clean) ? String(p.motd.clean) : '';
        return {
            online: true,
            count: (p.players && p.players.online) || 0,
            max: (p.players && p.players.max) || 0,
            version: (p.version && (p.version.name_clean || p.version.name_raw)) || '',
            lines: clean.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
        };
    }

    async function grab(url, parse) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 7000);
        try {
            const res = await fetch(url, { signal: ctrl.signal });
            if (!res.ok) return null;
            return parse(await res.json());
        } catch (e) {
            return null;
        } finally {
            clearTimeout(timer);
        }
    }

    function applyOnline(res) {
        applyMotd(res.lines, res.version);
        setStatus('ONLINE', 'online');
        setCard(null);
        animateNumber(onlineEl, lastOnline, res.count, 900);
        animateNumber(maxEl, 0, res.max, 900);
        lastOnline = res.count;
        hasData = true;
        failStreak = 0;
    }

    async function poll() {
        const results = (await Promise.all([
            grab(`https://api.mcsrvstat.us/3/${SERVER_HOST}`, parseMcsrvstat),
            grab(`https://api.mcstatus.io/v2/status/java/${SERVER_HOST}`, parseMcstatus)
        ])).filter(Boolean);

        const live = results.find(r => r.online);
        if (live) { applyOnline(live); return; }

        /* 两个源都明确回复“离线”才判离线 */
        if (results.length) { showOffline(); failStreak = 0; return; }

        /* 全部请求失败：连挂 2 次才降级，中间不清屏 */
        failStreak += 1;
        if (failStreak >= 2) { showNoData(); return; }
        if (!hasData) setStatus('CONNECTING…', 'pending');
        setTimeout(poll, 3000);
    }

    if (!hasData) setStatus('CONNECTING…', 'pending');
    poll();
    setInterval(poll, 30000);
    window.__mossyPoll = poll;   /* 测试钩子 */
})();

/* ================= 地址复制 ================= */
(function initCopy() {
    function bindCopy(btnId) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        btn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(SERVER_ADDR);
            } catch (e) {
                const ta = document.createElement('textarea');
                ta.value = SERVER_ADDR;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            const label = btn.querySelector('span');
            if (!label) return;
            const original = label.textContent;
            label.textContent = '已复制 ✓';
            setTimeout(() => { label.textContent = original; }, 1800);
        });
    }
    bindCopy('copyBtn');
    bindCopy('copyBtn2');

    /* 首屏「加入服务器」顺手复制地址 */
    const hero = document.getElementById('joinBtnHero');
    if (hero) hero.addEventListener('click', () => {
        try { navigator.clipboard.writeText(SERVER_ADDR); } catch (e) {}
    });
})();

/* ================= 主题切换（暗色默认） ================= */
(function initTheme() {
    const btn = document.getElementById('themeToggle');
    const root = document.documentElement;
    const KEY = 'mossy-theme';

    if (btn) {
        btn.addEventListener('click', () => {
            const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            root.setAttribute('data-theme', next);
            try { localStorage.setItem(KEY, next); } catch (e) {}
        });
    }
})();

/* ================= 滚动揭示 ================= */
(function initReveal() {
    const targets = document.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
        targets.forEach(el => el.classList.add('in-view'));
        return;
    }
    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    targets.forEach(el => io.observe(el));
})();

/* =========================================================
   隐秘彩蛋（FIM）：不可逆，触发后刷新恢复
   触发：1.4 秒内连点左上角 Logo 5 次
   效果：整页黑白 + 全文改写 + fim.webp 渐显 + fim.mp3 循环
   ========================================================= */
(function initFimEasterEgg() {
    const logo = document.querySelector('.nav-logo');
    if (!logo) return;

    const CLICKS_NEEDED = 5;
    const WINDOW_MS = 1400;
    const FIM_TEXT = 'FRIEND INSIDE ME';
    let clicks = 0, timer = null, fired = false;

    function rewritePageText() {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                const tag = parent.tagName;
                if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEXTAREA') {
                    return NodeFilter.FILTER_REJECT;
                }
                if (parent.closest && parent.closest('.fim-overlay')) return NodeFilter.FILTER_REJECT;
                return node.nodeValue && node.nodeValue.trim()
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_REJECT;
            }
        });
        const targets = [];
        while (walker.nextNode()) targets.push(walker.currentNode);
        targets.forEach(n => { n.nodeValue = FIM_TEXT; });
    }

    function enforceFimText() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(m => {
                const t = m.target;
                if (t.nodeType === Node.TEXT_NODE && t.nodeValue && t.nodeValue.trim() && t.nodeValue !== FIM_TEXT) {
                    const parent = t.parentElement;
                    if (parent && parent.closest && parent.closest('.fim-overlay')) return;
                    t.nodeValue = FIM_TEXT;
                }
            });
        });
        observer.observe(document.body, { subtree: true, characterData: true });
    }

    function trigger() {
        if (fired) return;
        fired = true;
        document.body.classList.add('fim-active');

        rewritePageText();
        enforceFimText();

        const audio = new Audio('resource/fim.mp3');
        audio.loop = true;
        audio.volume = 0;
        const fadeIn = () => {
            if (audio.volume < 0.9) {
                audio.volume = Math.min(0.9, audio.volume + 0.012);
                requestAnimationFrame(fadeIn);
            }
        };
        const play = () => {
            const p = audio.play();
            if (p && p.catch) p.catch(() => {
                document.addEventListener('pointerdown', () => { audio.play().catch(() => {}); }, { once: true });
            });
        };
        play();
        fadeIn();

        const overlay = document.createElement('div');
        overlay.className = 'fim-overlay';
        const img = document.createElement('img');
        img.src = 'resource/fim.webp';
        img.alt = '';
        overlay.appendChild(img);
        document.body.appendChild(overlay);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => overlay.classList.add('show'));
        });
    }

    logo.addEventListener('click', () => {
        if (fired) return;
        clicks++;
        clearTimeout(timer);
        timer = setTimeout(() => { clicks = 0; }, WINDOW_MS);
        if (clicks >= CLICKS_NEEDED) {
            clicks = 0;
            trigger();
        }
    });
})();
