'use strict';

const App = (() => {

    // ─── State ────────────────────────────────────────────────────
    let currentMethod = 'general';
    let chartInstance = null;
    let lastState     = null; // { a, b, c, result }

    // ─── DOM References ───────────────────────────────────────────
    const $  = id => document.getElementById(id);
    const el = {
        inputA:        $('coeff-a'),
        inputB:        $('coeff-b'),
        inputC:        $('coeff-c'),
        aError:        $('a-error'),
        aGroup:        $('coeff-group-a'),
        eqPreview:     $('eq-preview'),
        methodTabs:    document.querySelectorAll('.method-tab'),
        solveBtn:      $('solve-btn'),
        emptyState:    $('empty-state'),
        infoCard:      $('info-card'),
        stepsCard:     $('steps-card'),
        chartCard:     $('chart-card'),
        eqTypeBadge:   $('eq-type-badge'),
        infoVertex:    $('info-vertex'),
        infoAxis:      $('info-axis'),
        infoYIntercept:$('info-y-intercept'),
        infoRoots:     $('info-roots'),
        methodBadge:   $('method-badge'),
        stepsContainer:$('steps-container'),
        chartCanvas:   $('quadratic-chart'),
        complexNotice: $('complex-notice'),
        themeToggle:   $('theme-toggle'),
        iconSun:       $('icon-sun'),
        iconMoon:      $('icon-moon')
    };

    // ─── Helpers ──────────────────────────────────────────────────

    function getCoeffs() {
        const a = parseFloat(el.inputA.value);
        const b = parseFloat(el.inputB.value) || 0;
        const c = parseFloat(el.inputC.value) || 0;
        return { a: isNaN(a) ? 0 : a, b, c };
    }

    function katexStr(latex, display = false) {
        try {
            return katex.renderToString(latex, { throwOnError: false, displayMode: display, strict: false });
        } catch {
            return `<code>${latex}</code>`;
        }
    }

    function isDark() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    // ─── Equation Preview ─────────────────────────────────────────

    function updatePreview() {
        const { a, b, c } = getCoeffs();
        if (a === 0 || isNaN(a)) {
            el.eqPreview.innerHTML = katexStr('f(x) = ax^2 + bx + c', true);
            return;
        }
        el.eqPreview.innerHTML = katexStr(QuadMath.equationLatex(a, b, c), true);
    }

    // ─── Validation ───────────────────────────────────────────────

    function validateA() {
        const a = parseFloat(el.inputA.value);
        const bad = isNaN(a) || a === 0;
        el.aError.classList.toggle('hidden', !bad);
        el.aGroup.classList.toggle('has-error', bad);
        el.solveBtn.disabled = bad;
        return !bad;
    }

    // ─── Method Tabs ──────────────────────────────────────────────

    const METHOD_LABELS = {
        general:       'Fórmula General',
        poshen:        'Po-Shen Loh',
        factorization: 'Factorización'
    };

    function setMethod(method) {
        currentMethod = method;
        el.methodTabs.forEach(tab => {
            const active = tab.dataset.method === method;
            tab.classList.toggle('active', active);
            tab.setAttribute('aria-selected', String(active));
        });
    }

    // ─── Render: Info Panel ───────────────────────────────────────

    function renderInfo(a, b, c, result) {
        const cls = QuadMath.classifyEquation(a, b, c);
        const vtx = QuadMath.calcVertex(a, b, c);

        const typeMap = {
            complete: { label: 'Completa', cls: 'badge-accent' },
            pure:     { label: 'Incompleta pura',  cls: 'badge-teal' },
            mixed:    { label: 'Incompleta mixta', cls: 'badge-amber' },
            trivial:  { label: 'Trivial',          cls: 'badge-muted' }
        };
        const t = typeMap[cls] || typeMap.complete;
        el.eqTypeBadge.textContent = t.label;
        el.eqTypeBadge.className   = `badge ${t.cls}`;

        el.infoVertex.innerHTML     = katexStr(`V\\!\\left(${vtx.h},\\;${vtx.k}\\right)`);
        el.infoAxis.innerHTML       = katexStr(`x = ${vtx.h}`);
        el.infoYIntercept.innerHTML = katexStr(`(0,\\;${c})`);

        const { roots, rootType } = result;
        let rootLatex = '';
        if (rootType === 'two_real') {
            if (roots[0] === roots[1]) {
                rootLatex = `x = ${roots[0]}\\;\\text{(doble)}`;
            } else {
                rootLatex = `x_1 = ${roots[0]},\\quad x_2 = ${roots[1]}`;
            }
        } else if (rootType === 'double') {
            rootLatex = `x = ${roots[0]}\\;\\text{(doble)}`;
        } else if (rootType === 'complex') {
            const r = roots[0];
            rootLatex = `x_1 = ${r.real}+${r.imag}i,\\quad x_2 = ${r.real}-${r.imag}i`;
        }
        el.infoRoots.innerHTML = katexStr(rootLatex);
    }

    // ─── Render: Steps ────────────────────────────────────────────

    function renderSteps(steps) {
        el.stepsContainer.innerHTML = '';
        el.methodBadge.textContent  = METHOD_LABELS[currentMethod] || '';

        steps.forEach((step, i) => {
            const div = document.createElement('div');
            div.className = 'step-item' + (step.isWarning ? ' step-warning' : '');
            div.style.animationDelay = `${i * 70}ms`;

            const latexHtml = katexStr(step.latex, true);

            div.innerHTML = `
                <div class="step-number">${i + 1}</div>
                <div class="step-body">
                    <p class="step-title">${step.title}</p>
                    <div class="step-latex">${latexHtml}</div>
                </div>`;
            el.stepsContainer.appendChild(div);
        });
    }

    // ─── Render: Chart ────────────────────────────────────────────

    const COLORS = {
        vertex:     '#ff6b6b',
        yintercept: '#00d4aa',
        root:       '#f59e0b',
        curve:      '#7c6df0'
    };

    function renderChart(a, b, c, result) {
        const vertex = QuadMath.calcVertex(a, b, c);
        const { curve, points } = QuadMath.generateChartData(
            a, b, c, result.roots, vertex, result.rootType
        );

        const dark = isDark();
        const gridColor  = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
        const zeroColor  = dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)';
        const tickColor  = dark ? '#8b949e' : '#636c76';

        // Complex notice
        if (result.rootType === 'complex') {
            el.complexNotice.classList.remove('hidden');
        } else {
            el.complexNotice.classList.add('hidden');
        }

        const datasets = [
            {
                label: `f(x) = ${a}x² ${b >= 0 ? '+' : '−'} …`,
                data: curve,
                showLine: true,
                tension: 0.15,
                borderColor: COLORS.curve,
                borderWidth: 2.5,
                pointRadius: 0,
                fill: false,
                order: 2
            },
            {
                label: 'Puntos críticos',
                data: points.map(p => ({ x: p.x, y: p.y })),
                showLine: false,
                pointRadius: points.map(() => 7),
                pointHoverRadius: 10,
                pointBackgroundColor: points.map(p => COLORS[p.type] || '#fff'),
                pointBorderColor: dark ? '#1a1e2e' : '#ffffff',
                pointBorderWidth: 2.5,
                order: 1
            }
        ];

        const config = {
            type: 'scatter',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 700, easing: 'easeInOutCubic' },
                plugins: {
                    legend: {
                        display: false  // Custom legend in card header
                    },
                    tooltip: {
                        backgroundColor: dark ? '#1a1e2e' : '#fff',
                        titleColor: dark ? '#e2e8f0' : '#1f2328',
                        bodyColor: dark ? '#8b949e' : '#636c76',
                        borderColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label(ctx) {
                                if (ctx.datasetIndex === 1) {
                                    return ` ${points[ctx.dataIndex].label}`;
                                }
                                const x = ctx.parsed.x.toFixed(3);
                                const y = ctx.parsed.y.toFixed(3);
                                return ` f(${x}) = ${y}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        grid: {
                            color: ctx => ctx.tick.value === 0 ? zeroColor : gridColor,
                            lineWidth: ctx => ctx.tick.value === 0 ? 1.5 : 1
                        },
                        ticks: { color: tickColor }
                    },
                    y: {
                        type: 'linear',
                        grid: {
                            color: ctx => ctx.tick.value === 0 ? zeroColor : gridColor,
                            lineWidth: ctx => ctx.tick.value === 0 ? 1.5 : 1
                        },
                        ticks: { color: tickColor }
                    }
                }
            }
        };

        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }
        chartInstance = new Chart(el.chartCanvas, config);
    }

    // ─── Show Results ─────────────────────────────────────────────

    function showResults(a, b, c, result) {
        el.emptyState.classList.add('hidden');

        [el.infoCard, el.stepsCard, el.chartCard].forEach((card, i) => {
            card.classList.remove('hidden');
            card.style.animationDelay = `${i * 120}ms`;
            // Re-trigger animation
            card.classList.remove('card-appear');
            void card.offsetWidth; // reflow
            card.classList.add('card-appear');
        });

        renderInfo(a, b, c, result);
        renderSteps(result.steps);
        renderChart(a, b, c, result);
    }

    // ─── Solve ────────────────────────────────────────────────────

    function solve() {
        if (!validateA()) return;
        const { a, b, c } = getCoeffs();

        let result;
        if (currentMethod === 'general')       result = QuadMath.solveGeneral(a, b, c);
        else if (currentMethod === 'poshen')   result = QuadMath.solvePoshenLoh(a, b, c);
        else                                   result = QuadMath.solveFactorization(a, b, c);

        lastState = { a, b, c, result };
        showResults(a, b, c, result);

        // Scroll to results on mobile
        if (window.innerWidth < 900) {
            el.infoCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // ─── Theme Toggle ─────────────────────────────────────────────

    function updateThemeIcons() {
        const dark = isDark();
        el.iconSun.style.display  = dark ? 'block' : 'none';
        el.iconMoon.style.display = dark ? 'none'  : 'block';
    }

    function toggleTheme() {
        const next = isDark() ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        updateThemeIcons();
        // Re-render chart with new theme colours
        if (lastState) {
            const { a, b, c, result } = lastState;
            renderChart(a, b, c, result);
        }
    }

    // ─── Init ─────────────────────────────────────────────────────

    function init() {
        // Input listeners
        [el.inputA, el.inputB, el.inputC].forEach(inp => {
            inp.addEventListener('input', () => {
                updatePreview();
                validateA();
            });
        });

        el.inputA.addEventListener('blur', validateA);

        // Method tabs
        el.methodTabs.forEach(tab => {
            tab.addEventListener('click', () => setMethod(tab.dataset.method));
        });

        // Solve
        el.solveBtn.addEventListener('click', solve);

        // Keyboard shortcut: Enter inside any input
        [el.inputA, el.inputB, el.inputC].forEach(inp => {
            inp.addEventListener('keydown', e => {
                if (e.key === 'Enter') solve();
            });
        });

        // Theme
        el.themeToggle.addEventListener('click', toggleTheme);

        // Initial state
        updateThemeIcons();
        updatePreview();
        validateA();
    }

    return { init };

})();

// Boot after all scripts are loaded
document.addEventListener('DOMContentLoaded', () => App.init());
