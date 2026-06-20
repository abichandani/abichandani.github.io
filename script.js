/* =============================================
   STARFIELD + METEOR CANVAS
   ============================================= */
(function () {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const ACCENT_RGB  = '99, 102, 241';
    const STAR_COUNT  = 220;
    const METEOR_EVERY_MS = 5000; // spawn interval

    let stars   = [];
    let meteors = [];

    /* ---------- resize ---------- */
    function resize() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        buildStars();
    }

    /* ---------- stars ---------- */
    function buildStars() {
        stars = Array.from({ length: STAR_COUNT }, () => ({
            x:      Math.random() * canvas.width,
            y:      Math.random() * canvas.height,
            r:      Math.random() * 0.9 + 0.2,
            base:   Math.random() * 0.55 + 0.15,   // base alpha
            alpha:  0,
            speed:  (Math.random() * 0.008 + 0.003) * (Math.random() < 0.5 ? 1 : -1),
        }));
        stars.forEach(s => { s.alpha = s.base; });
    }

    function updateStars() {
        stars.forEach(s => {
            s.alpha += s.speed;
            if (s.alpha > s.base + 0.2 || s.alpha < s.base - 0.15) s.speed *= -1;
        });
    }

    function drawStars() {
        stars.forEach(s => {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, s.alpha)})`;
            ctx.fill();
        });
    }

    /* ---------- meteors ---------- */
    function spawnMeteor() {
        // 30–55° from horizontal, heading right-downward
        const angle    = Math.PI / 6 + Math.random() * (Math.PI / 4.5);
        const speed    = 13 + Math.random() * 7;
        const trailLen = 160 + Math.random() * 100;

        // always start in the top-left quadrant so the full streak is visible
        meteors.push({
            x:        Math.random() * canvas.width  * 0.55,
            y:        Math.random() * canvas.height * 0.35,
            vx:       Math.cos(angle) * speed,
            vy:       Math.sin(angle) * speed,
            trailLen,
            life:     1.0,   // no fade-in; full opacity from first frame
        });
    }

    function updateMeteors() {
        meteors.forEach(m => {
            m.x += m.vx;
            m.y += m.vy;
            // fade out once past 70% down the screen
            if (m.y > canvas.height * 0.7) m.life -= 0.035;
        });

        meteors = meteors.filter(m =>
            m.life > 0 &&
            m.x < canvas.width  + 100 &&
            m.y < canvas.height + 100
        );
    }

    function drawMeteors() {
        meteors.forEach(m => {
            const mag = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
            const ux  = m.vx / mag;
            const uy  = m.vy / mag;
            const tx  = m.x - ux * m.trailLen;
            const ty  = m.y - uy * m.trailLen;

            const grad = ctx.createLinearGradient(m.x, m.y, tx, ty);
            grad.addColorStop(0,    `rgba(255, 255, 255, ${m.life})`);
            grad.addColorStop(0.12, `rgba(${ACCENT_RGB}, ${m.life * 0.9})`);
            grad.addColorStop(1,    `rgba(${ACCENT_RGB}, 0)`);

            ctx.beginPath();
            ctx.moveTo(m.x, m.y);
            ctx.lineTo(tx, ty);
            ctx.strokeStyle = grad;
            ctx.lineWidth   = 2.2;
            ctx.lineCap     = 'round';
            ctx.stroke();

            // bright white head
            ctx.beginPath();
            ctx.arc(m.x, m.y, 2.2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${m.life})`;
            ctx.fill();
        });
    }

    /* ---------- main loop ---------- */
    function loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        updateStars();
        drawStars();
        updateMeteors();
        drawMeteors();
        requestAnimationFrame(loop);
    }

    /* ---------- meteor timer ---------- */
    function scheduleMeteor() {
        const jitter = (Math.random() - 0.5) * 1500;
        setTimeout(() => {
            spawnMeteor();
            scheduleMeteor();
        }, METEOR_EVERY_MS + jitter);
    }

    resize();
    loop();

    // first meteor after 2 s, then every ~5 s
    setTimeout(() => {
        spawnMeteor();
        scheduleMeteor();
    }, 2000);

    window.addEventListener('resize', resize);
})();

/* =============================================
   TYPEWRITER
   ============================================= */
(function () {
    const el = document.querySelector('.typed-text');
    if (!el) return;

    const roles = [
        'ML Engineer',
        'Research Scientist',
        'Software Engineer',
        'HPC / Scientific Computing',
        'PhD Candidate (Physics)',
        'DevOps / Platform Engineer',
    ];

    let roleIdx = 0;
    let charIdx = 0;
    let deleting = false;

    function tick() {
        const current = roles[roleIdx];
        if (deleting) {
            el.textContent = current.substring(0, charIdx - 1);
            charIdx--;
        } else {
            el.textContent = current.substring(0, charIdx + 1);
            charIdx++;
        }

        let delay = deleting ? 55 : 90;

        if (!deleting && charIdx === current.length) {
            delay = 2400;
            deleting = true;
        } else if (deleting && charIdx === 0) {
            deleting = false;
            roleIdx = (roleIdx + 1) % roles.length;
            delay = 350;
        }

        setTimeout(tick, delay);
    }

    document.addEventListener('DOMContentLoaded', () => setTimeout(tick, 900));
})();

/* =============================================
   CONTACT FORM
   ============================================= */
(function () {
    const form   = document.getElementById('contact-form');
    const submit = document.getElementById('cf-submit');
    const status = document.getElementById('form-status');

    if (!form) return;

    // Replace with your Render URL once deployed. Use localhost for local testing.
    const API_URL = 'https://abichandani-github-io.onrender.com/contact';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name    = form.name.value.trim();
        const email   = form.email.value.trim();
        const message = form.message.value.trim();

        if (!name || !email || !message) {
            setStatus('Please fill in all fields.', 'error');
            return;
        }

        setLoading(true);
        setStatus('', '');

        try {
            const res = await fetch(API_URL, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ name, email, message }),
            });

            const data = await res.json();

            if (res.ok) {
                setStatus('Message sent. I\'ll get back to you soon.', 'success');
                form.reset();
            } else {
                setStatus(data.error || 'Something went wrong. Try again.', 'error');
            }
        } catch {
            setStatus('Could not reach the server. Try again later.', 'error');
        } finally {
            setLoading(false);
        }
    });

    function setLoading(on) {
        submit.disabled = on;
        submit.querySelector('.btn-submit-label').textContent = on ? 'Sending…' : 'Send message';
    }

    function setStatus(msg, type) {
        status.textContent  = msg;
        status.className    = 'form-status' + (type ? ` form-status--${type}` : '');
    }
})();

/* =============================================
   NAV — scroll shadow + active link
   ============================================= */
(function () {
    const nav = document.getElementById('nav');
    const navLinks = document.querySelectorAll('nav ul a');
    const sections = document.querySelectorAll('section[id]');

    // shadow on scroll
    window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });

    // active section highlight
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                navLinks.forEach(a => {
                    a.classList.toggle(
                        'active',
                        a.getAttribute('href') === `#${entry.target.id}`
                    );
                });
            }
        });
    }, { threshold: 0.45 });

    sections.forEach(s => observer.observe(s));
})();
