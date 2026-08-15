/* ===========================
   服务器配置
   把 SERVER_HOST 改成你的真实 Minecraft 服务器地址（host:port）。
   留空则计数器如实显示「未连接」，不编造任何数据。
   数据源：mcsrvstat.us 公共状态接口
   =========================== */
const SERVER_HOST = 'mossymc.top';

/* ===========================
   动态计数器：从真实服务器状态接口获取
   =========================== */
(function initCounter() {
    const onlineEl = document.getElementById('onlineCount');
    const maxEl = document.getElementById('maxCount');
    const statusEl = document.getElementById('serverStatus');

    // 弹簧式数字滚动（带轻微回弹）
    function animateNumber(el, from, to, duration) {
        if (Number.isNaN(from)) from = 0;
        const start = performance.now();
        const step = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            // easeOutBack 弹簧缓动
            const c1 = 1.4, c3 = c1 + 1;
            const eased = 1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2);
            const value = Math.round(from + (to - from) * Math.max(0, eased));
            el.textContent = value.toLocaleString();
            if (progress < 1) requestAnimationFrame(step);
            else el.textContent = to.toLocaleString();
        };
        requestAnimationFrame(step);
    }

    function setStatus(text, state) {
        statusEl.querySelector('.status-text').textContent = text;
        const dot = statusEl.querySelector('.status-dot');
        dot.className = 'status-dot status-dot-' + state;
    }

    function showOffline() {
        onlineEl.textContent = '—';
        maxEl.textContent = '—';
        setStatus('未连接', 'offline');
    }

    // 未配置服务器地址：如实显示未连接，不编造数据
    if (!SERVER_HOST) {
        setTimeout(() => setStatus('未配置', 'offline'), 600);
        return;
    }

    let lastOnline = 0;

    async function fetchStatus() {
        try {
            setStatus('连接中…', 'pending');
            const res = await fetch(`https://api.mcsrvstat.us/3/${SERVER_HOST}`);
            if (!res.ok) throw new Error('接口异常');
            const data = await res.json();

            if (!data.online) {
                showOffline();
                return;
            }

            const online = data.players?.online ?? 0;
            const max = data.players?.max ?? 0;
            setStatus('运行中', 'online');

            animateNumber(onlineEl, lastOnline, online, 1200);
            animateNumber(maxEl, 0, max, 1200);

            // 在线人数变化时短暂高亮
            if (lastOnline && online > lastOnline) {
                onlineEl.classList.add('bump');
                setTimeout(() => onlineEl.classList.remove('bump'), 700);
            }
            lastOnline = online;
        } catch (err) {
            showOffline();
        }
    }

    fetchStatus();
    // 每 30 秒刷新一次真实数据
    setInterval(fetchStatus, 30000);
})();

/* ===========================
   横向轮播图
   =========================== */
(function initCarousel() {
    const track = document.getElementById('carouselTrack');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const dotsContainer = document.getElementById('carouselDots');
    const cards = track.querySelectorAll('.feature-card');

    // 生成指示点
    cards.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `跳转到第 ${i + 1} 张`);
        dot.addEventListener('click', () => scrollToCard(i));
        dotsContainer.appendChild(dot);
    });

    const dots = dotsContainer.querySelectorAll('.dot');

    // 滚动到指定卡片
    function scrollToCard(index) {
        const card = cards[index];
        const trackRect = track.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        const offset = cardRect.left - trackRect.left - (track.clientWidth - card.clientWidth) / 2;
        track.scrollBy({ left: offset, behavior: 'smooth' });
    }

    // 获取当前居中的卡片索引
    function getCenterIndex() {
        const trackCenter = track.scrollLeft + track.clientWidth / 2;
        let closest = 0;
        let minDist = Infinity;
        cards.forEach((card, i) => {
            const cardCenter = card.offsetLeft + card.clientWidth / 2;
            const dist = Math.abs(cardCenter - trackCenter);
            if (dist < minDist) {
                minDist = dist;
                closest = i;
            }
        });
        return closest;
    }

    // 更新指示点
    function updateDots() {
        const idx = getCenterIndex();
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === idx);
        });
    }

    // 按钮事件
    nextBtn.addEventListener('click', () => {
        const idx = getCenterIndex();
        if (idx < cards.length - 1) scrollToCard(idx + 1);
        else scrollToCard(0); // 循环
    });

    prevBtn.addEventListener('click', () => {
        const idx = getCenterIndex();
        if (idx > 0) scrollToCard(idx - 1);
        else scrollToCard(cards.length - 1); // 循环
    });

    // 滚动时更新指示点（节流）
    let scrollTimer;
    track.addEventListener('scroll', () => {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(updateDots, 80);
    });

    // 键盘左右键控制
    track.setAttribute('tabindex', '0');
    track.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); nextBtn.click(); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); prevBtn.click(); }
    });
})();

/* ===========================
   复制服务器地址
   =========================== */
(function initCopy() {
    const copyBtn = document.getElementById('copyBtn');
    const address = 'mossymc.top';

    copyBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(address);
        } catch {
            // 降级方案
            const ta = document.createElement('textarea');
            ta.value = address;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        const label = copyBtn.querySelector('span');
        const original = label.textContent;
        label.textContent = '已复制';
        copyBtn.classList.add('copied');
        setTimeout(() => {
            label.textContent = original;
            copyBtn.classList.remove('copied');
        }, 1800);
    });
})();

/* ===========================
   胶囊按钮波纹反馈
   =========================== */
(function initRipple() {
    document.querySelectorAll('.capsule-primary').forEach(btn => {
        btn.addEventListener('click', function (e) {
            const rect = this.getBoundingClientRect();
            const ripple = document.createElement('span');
            const size = Math.max(rect.width, rect.height);
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${e.clientX - rect.left - size / 2}px;
                top: ${e.clientY - rect.top - size / 2}px;
                background: rgba(255,255,255,0.4);
                border-radius: 50%;
                transform: scale(0);
                animation: rippleAnim 0.6s ease-out;
                pointer-events: none;
            `;
            this.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    });

    // 注入波纹动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes rippleAnim {
            to { transform: scale(2.5); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
})();

/* ===========================
   导航栏滚动收缩（Apple 风格）
   =========================== */
(function initNavCondense() {
    const nav = document.querySelector('.nav-bar');
    let lastY = 0;
    let ticking = false;

    function update() {
        const y = window.scrollY;
        nav.classList.toggle('condensed', y > 40);
        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(update);
            ticking = true;
        }
    }, { passive: true });
})();

/* ===========================
   英雄区视差滚动：内容上移 + 渐隐 + 缩放
   =========================== */
(function initHeroParallax() {
    const hero = document.querySelector('.hero-content');
    const counter = document.getElementById('counterCard');
    if (!hero) return;
    let ticking = false;

    function update() {
        const y = window.scrollY;
        if (y < window.innerHeight) {
            // 主内容：向上移 + 渐隐（去掉 scale，避免与计数器 backdrop-filter 冲突导致文字模糊）
            const opacity = Math.max(0, 1 - y / (window.innerHeight * 0.7));
            const translate = y * 0.35;
            hero.style.opacity = opacity;
            hero.style.transform = `translateY(${translate}px)`;

            // 计数器不再单独 transform（避免重复合成层导致毛玻璃采样异常）
        }
        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(update);
            ticking = true;
        }
    }, { passive: true });
})();

/* ===========================
   磁吸按钮：光标靠近时按钮微移（Apple 产品页风格）
   =========================== */
(function initMagneticButtons() {
    if (window.matchMedia('(pointer: coarse)').matches) return; // 触屏跳过

    document.querySelectorAll('.capsule-primary, .capsule-secondary').forEach(btn => {
        const STRENGTH = 0.25;
        let raf;

        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                btn.style.transform = `translate(${x * STRENGTH}px, ${y * STRENGTH}px)`;
            });
        });

        btn.addEventListener('mouseleave', () => {
            cancelAnimationFrame(raf);
            // 回弹到原位
            btn.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
            btn.style.transform = 'translate(0, 0)';
            setTimeout(() => { btn.style.transition = ''; }, 500);
        });
    });
})();

/* ===========================
   特性卡片：光标追踪高光（不使用 3D rotate，避免与 backdrop-filter 冲突导致文字模糊）
   =========================== */
(function initCardTilt() {
    if (window.matchMedia('(pointer: coarse)').matches) return;

    document.querySelectorAll('.feature-card').forEach(card => {
        let raf;

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                // 仅设置 CSS 变量驱动高光位置，不做 3D 变换，保护毛玻璃渲染
                card.style.setProperty('--mx', x + '%');
                card.style.setProperty('--my', y + '%');
                card.classList.add('tilting');
            });
        });

        card.addEventListener('mouseleave', () => {
            cancelAnimationFrame(raf);
            card.classList.remove('tilting');
            card.style.removeProperty('--mx');
            card.style.removeProperty('--my');
        });
    });
})();

/* ===========================
   滚动错峰揭示（带 --i 索引延迟）
   =========================== */
(function initScrollReveal() {
    // 给同组元素打上错峰索引
    const groups = [
        '.feature-card',
        '.gallery-item'
    ];
    groups.forEach(sel => {
        document.querySelectorAll(sel).forEach((el, i) => {
            el.classList.add('reveal');
            el.style.setProperty('--i', i);
        });
    });
    document.querySelectorAll('.section-header, .join-card').forEach(el => {
        el.classList.add('reveal');
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
})();
