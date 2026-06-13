'use strict';

const QuadMath = (() => {

    // ─── Utilities ────────────────────────────────────────────────

    function round(n, d = 9) {
        const f = Math.pow(10, d);
        return Math.round(n * f) / f;
    }

    function gcd(a, b) {
        a = Math.abs(Math.round(a));
        b = Math.abs(Math.round(b));
        while (b > 0) { const t = b; b = a % b; a = t; }
        return a || 1;
    }

    function isPerfectSquare(n) {
        if (n < 0) return false;
        if (n === 0) return true;
        const s = Math.round(Math.sqrt(n));
        return Math.abs(s * s - n) < 1e-6;
    }

    function numStr(n) {
        const r = round(n, 6);
        return parseFloat(r.toFixed(6)).toString();
    }

    /**
     * Returns { latex, value } for n/d.
     * Simplifies to fraction if both are integers, else returns decimal.
     */
    function frac(n, d) {
        if (Math.abs(d) < 1e-12) return { latex: '\\text{undef}', value: NaN };
        const nR = round(n, 6), dR = round(d, 6);
        if (Number.isInteger(nR) && Number.isInteger(dR)) {
            const nI = Math.round(nR), dI = Math.round(dR);
            const g = gcd(Math.abs(nI), Math.abs(dI));
            let sn = nI / g, sd = dI / g;
            if (sd < 0) { sn = -sn; sd = -sd; }
            const val = sn / sd;
            if (sd === 1) return { latex: String(sn), value: val };
            return { latex: `\\dfrac{${sn}}{${sd}}`, value: round(val) };
        }
        const val = round(n / d);
        return { latex: numStr(val), value: val };
    }

    // ─── Equation Display ─────────────────────────────────────────

    function equationLatex(a, b, c) {
        const terms = [];
        if (a === 1)       terms.push('x^2');
        else if (a === -1) terms.push('-x^2');
        else               terms.push(`${a}x^2`);

        if      (b === 1)  terms.push('+ x');
        else if (b === -1) terms.push('- x');
        else if (b > 0)    terms.push(`+ ${b}x`);
        else if (b < 0)    terms.push(`- ${Math.abs(b)}x`);

        if      (c > 0) terms.push(`+ ${c}`);
        else if (c < 0) terms.push(`- ${Math.abs(c)}`);

        return terms.join(' ') + ' = 0';
    }

    // ─── Equation Classification ──────────────────────────────────

    function classifyEquation(a, b, c) {
        if (b === 0 && c === 0) return 'trivial';
        if (b === 0) return 'pure';
        if (c === 0) return 'mixed';
        return 'complete';
    }

    // ─── Vertex ───────────────────────────────────────────────────

    function calcVertex(a, b, c) {
        const h = round(-b / (2 * a));
        const k = round(a * h * h + b * h + c);
        return { h, k };
    }

    // ─── Method 1: General Formula ────────────────────────────────

    function solveGeneral(a, b, c) {
        const D      = round(b * b - 4 * a * c);
        const negB   = -b;
        const twoA   = 2 * a;
        const steps  = [];
        let roots = [], rootType = '';

        steps.push({
            title: 'Forma estándar de la ecuación',
            latex: equationLatex(a, b, c)
        });
        steps.push({
            title: 'Identificar coeficientes',
            latex: `a = ${a},\\quad b = ${b},\\quad c = ${c}`
        });
        steps.push({
            title: 'Calcular el discriminante',
            latex: `\\Delta = b^2 - 4ac = (${b})^2 - 4 \\cdot (${a}) \\cdot (${c}) = ${round(b*b)} - (${round(4*a*c)}) = ${D}`
        });

        if (D > 0) {
            rootType = 'two_real';
            steps.push({
                title: 'Discriminante positivo → dos raíces reales y distintas',
                latex: `\\Delta = ${D} > 0`
            });

            const sqrtD   = round(Math.sqrt(D));
            const isPerfSq = isPerfectSquare(D);
            const sqrtTex = isPerfSq ? String(Math.round(sqrtD)) : `\\sqrt{${D}}`;
            const x1F = frac(negB + (isPerfSq ? Math.round(sqrtD) : sqrtD), twoA);
            const x2F = frac(negB - (isPerfSq ? Math.round(sqrtD) : sqrtD), twoA);

            steps.push({
                title: 'Aplicar la fórmula general',
                latex: `x = \\dfrac{-b \\pm \\sqrt{\\Delta}}{2a} = \\dfrac{${negB} \\pm ${sqrtTex}}{${twoA}}`
            });

            if (isPerfSq) {
                const sv = Math.round(sqrtD);
                steps.push({
                    title: 'Calcular cada raíz',
                    latex: `x_1 = \\dfrac{${negB} + ${sv}}{${twoA}} = ${x1F.latex}\\qquad x_2 = \\dfrac{${negB} - ${sv}}{${twoA}} = ${x2F.latex}`
                });
            } else {
                steps.push({
                    title: 'Calcular cada raíz (resultado irracional)',
                    latex: `x_1 = \\dfrac{${negB} + ${sqrtTex}}{${twoA}} \\approx ${numStr(x1F.value)}\\qquad x_2 = \\dfrac{${negB} - ${sqrtTex}}{${twoA}} \\approx ${numStr(x2F.value)}`
                });
            }

            roots = [x1F.value, x2F.value];

        } else if (D === 0) {
            rootType = 'double';
            steps.push({
                title: 'Discriminante cero → raíz real doble',
                latex: `\\Delta = 0`
            });
            const xF = frac(negB, twoA);
            steps.push({
                title: 'Calcular la raíz doble',
                latex: `x = \\dfrac{-b}{2a} = \\dfrac{${negB}}{${twoA}} = ${xF.latex}`
            });
            roots = [xF.value, xF.value];

        } else {
            rootType = 'complex';
            steps.push({
                title: 'Discriminante negativo → dos raíces complejas conjugadas',
                latex: `\\Delta = ${D} < 0`
            });

            const abD     = -D;
            const realVal = round(negB / twoA);
            const imagVal = round(Math.sqrt(abD) / Math.abs(twoA));
            const sqrtTex = isPerfectSquare(abD)
                ? String(Math.round(Math.sqrt(abD)))
                : `\\sqrt{${abD}}`;

            steps.push({
                title: 'Separar parte real e imaginaria',
                latex: `x = \\dfrac{${negB} \\pm \\sqrt{-(${abD})}}{${twoA}} = \\dfrac{${negB} \\pm ${sqrtTex}\\,i}{${twoA}}`
            });
            steps.push({
                title: 'Raíces complejas conjugadas',
                latex: `x_1 = ${realVal} + ${imagVal}\\,i\\qquad x_2 = ${realVal} - ${imagVal}\\,i`
            });

            roots = [{ real: realVal, imag: imagVal }, { real: realVal, imag: -imagVal }];
        }

        return { steps, roots, rootType, discriminant: D };
    }

    // ─── Method 2: Po-Shen Loh ────────────────────────────────────

    function solvePoshenLoh(a, b, c) {
        const steps = [];
        let roots = [], rootType = '';

        steps.push({
            title: 'Forma estándar de la ecuación',
            latex: equationLatex(a, b, c)
        });

        let B = b, C = c;
        if (a !== 1) {
            B = round(b / a);
            C = round(c / a);
            steps.push({
                title: `Dividir entre a = ${a} para obtener la forma mónica`,
                latex: `x^2 + (${B})x + (${C}) = 0 \\quad \\Rightarrow \\quad B = ${B},\\; C = ${C}`
            });
        } else {
            steps.push({
                title: 'La ecuación es mónica (a = 1)',
                latex: `x^2 + (${B})x + (${C}) = 0`
            });
        }

        const m    = round(-B / 2);
        const mSq  = round(m * m);
        const uSq  = round(mSq - C);

        steps.push({
            title: 'La suma de las raíces es −B → el promedio es −B/2',
            latex: `m = -\\dfrac{B}{2} = -\\dfrac{${B}}{2} = ${m}`
        });
        steps.push({
            title: 'Expresar las raíces como m ± u',
            latex: `x_{1,2} = ${m} \\pm u`
        });
        steps.push({
            title: 'Condición del producto de raíces',
            latex: `(m+u)(m-u) = C \\implies m^2 - u^2 = C`
        });
        steps.push({
            title: 'Despejar u²',
            latex: `u^2 = m^2 - C = (${m})^2 - (${C}) = ${mSq} - (${C}) = ${uSq}`
        });

        if (uSq >= 0) {
            const u = round(Math.sqrt(uSq));
            const x1 = round(m + u), x2 = round(m - u);
            rootType = u === 0 ? 'double' : 'two_real';
            roots    = [x1, x2];

            const uTex = isPerfectSquare(uSq)
                ? String(Math.round(u))
                : `\\sqrt{${uSq}} \\approx ${numStr(u)}`;
            steps.push({ title: 'Calcular u', latex: `u = ${uTex}` });
            steps.push({
                title: 'Calcular las raíces finales',
                latex: `x_1 = ${m} + ${numStr(u)} = ${x1}\\qquad x_2 = ${m} - ${numStr(u)} = ${x2}`
            });
        } else {
            rootType = 'complex';
            const uImag = round(Math.sqrt(-uSq));
            roots = [{ real: m, imag: uImag }, { real: m, imag: -uImag }];

            steps.push({
                title: 'u² < 0 → raíces complejas',
                latex: `u = \\sqrt{${uSq}} = \\sqrt{-(${-uSq})} = ${numStr(uImag)}\\,i`
            });
            steps.push({
                title: 'Raíces complejas conjugadas',
                latex: `x_1 = ${m} + ${numStr(uImag)}\\,i\\qquad x_2 = ${m} - ${numStr(uImag)}\\,i`
            });
        }

        return { steps, roots, rootType };
    }

    // ─── Method 3: Factorization ──────────────────────────────────

    function solveFactorization(a, b, c) {
        const steps = [];
        let roots = [], rootType = '';

        steps.push({
            title: 'Forma estándar de la ecuación',
            latex: equationLatex(a, b, c)
        });

        // Pure incomplete: b = 0
        if (b === 0) {
            steps.push({
                title: 'Forma incompleta pura (b = 0) — despejar x²',
                latex: `${a}x^2 = ${-c} \\implies x^2 = ${round(-c / a)}`
            });
            const val = -c / a;
            if (val < 0) {
                rootType = 'complex';
                const im = round(Math.sqrt(-val));
                roots = [{ real: 0, imag: im }, { real: 0, imag: -im }];
                steps.push({
                    title: 'El radicando es negativo → raíces imaginarias puras',
                    latex: `x = \\pm\\sqrt{${numStr(val)}} = \\pm ${numStr(im)}\\,i`
                });
                steps.push({ title: 'Raíces', latex: `x_1 = ${numStr(im)}\\,i\\qquad x_2 = -${numStr(im)}\\,i` });
            } else {
                const xV = round(Math.sqrt(val));
                rootType = xV === 0 ? 'double' : 'two_real';
                roots = [xV, -xV];
                const xTex = isPerfectSquare(val)
                    ? String(Math.round(xV))
                    : `\\sqrt{${numStr(val)}} \\approx ${numStr(xV)}`;
                steps.push({ title: 'Extraer raíz cuadrada', latex: `x = \\pm ${xTex}` });
                steps.push({ title: 'Raíces', latex: `x_1 = ${numStr(xV)}\\qquad x_2 = ${numStr(-xV)}` });
            }
            return { steps, roots, rootType };
        }

        // Mixed incomplete: c = 0
        if (c === 0) {
            steps.push({
                title: 'Forma incompleta mixta (c = 0) — factor común x',
                latex: `${a}x^2 + ${b}x = 0 \\implies x(${a}x + ${b}) = 0`
            });
            steps.push({
                title: 'Propiedad cero del producto',
                latex: `x = 0\\quad\\text{o}\\quad ${a}x + ${b} = 0 \\implies x = ${frac(-b, a).latex}`
            });
            const x2V = frac(-b, a).value;
            steps.push({ title: 'Raíces', latex: `x_1 = 0\\qquad x_2 = ${frac(-b, a).latex}` });
            rootType = 'two_real';
            roots    = [0, x2V];
            return { steps, roots, rootType };
        }

        // Complete — check discriminant
        const D = round(b * b - 4 * a * c);
        steps.push({
            title: 'Verificar si el discriminante es cuadrado perfecto',
            latex: `\\Delta = (${b})^2 - 4(${a})(${c}) = ${D}`
        });

        if (!isPerfectSquare(D)) {
            steps.push({
                title: '⚠️ Discriminante no es cuadrado perfecto → factorización directa no óptima',
                latex: `\\sqrt{\\Delta} = \\sqrt{${D}} \\notin \\mathbb{Z}`,
                isWarning: true
            });
            steps.push({
                title: '→ Se aplica la Fórmula General como alternativa',
                latex: `x = \\dfrac{-b \\pm \\sqrt{\\Delta}}{2a}`,
                isWarning: true
            });
            const gen = solveGeneral(a, b, c);
            steps.push(...gen.steps.slice(3)); // append from discriminant-sign step onward
            return { steps, roots: gen.roots, rootType: gen.rootType, fallback: true };
        }

        // Perfect square: proceed with factorization
        const sqrtD = Math.round(Math.sqrt(round(D, 6)));
        const x1F   = frac(-b + sqrtD, 2 * a);
        const x2F   = frac(-b - sqrtD, 2 * a);
        rootType = x1F.value === x2F.value ? 'double' : 'two_real';
        roots    = [x1F.value, x2F.value];

        if (a === 1) {
            // Simple monic trinomial: (x - x1)(x - x2) = 0
            steps.push({
                title: 'Trinomio mónico: buscar r₁, r₂ con r₁·r₂ = c y r₁+r₂ = −b',
                latex: `r_1 + r_2 = ${-b}\\quad\\text{y}\\quad r_1 \\cdot r_2 = ${c}`
            });
            steps.push({
                title: 'Valores encontrados (son las raíces con signo cambiado)',
                latex: `r_1 = ${x1F.value},\\quad r_2 = ${x2F.value}\\quad\\checkmark\\;${x1F.value}+${x2F.value}=${-b}`
            });
            const t1 = x1F.value >= 0 ? `- ${x1F.latex}` : `+ ${Math.abs(x1F.value)}`;
            const t2 = x2F.value >= 0 ? `- ${x2F.latex}` : `+ ${Math.abs(x2F.value)}`;
            steps.push({ title: 'Forma factorizada', latex: `(x ${t1})(x ${t2}) = 0` });

        } else {
            // Trinomial a ≠ 1: AC method
            const ac = round(a * c);
            steps.push({
                title: `Trinomio con a ≠ 1: método AC — calcular a·c`,
                latex: `a \\cdot c = ${a} \\cdot ${c} = ${ac}`
            });
            steps.push({
                title: 'Buscar m, n tal que m + n = b  y  m · n = a·c',
                latex: `m + n = ${b}\\quad\\text{y}\\quad m \\cdot n = ${ac}`
            });

            // Find m, n by iteration (works for integers)
            let mV = null, nV = null;
            const limit = Math.abs(Math.round(ac)) + Math.abs(Math.round(b)) + 1;
            for (let i = -limit; i <= limit; i++) {
                const j = b - i;
                if (Math.abs(i * j - ac) < 0.001) { mV = i; nV = j; break; }
            }

            if (mV !== null) {
                steps.push({ title: 'Valores encontrados', latex: `m = ${mV},\\quad n = ${nV}` });
                steps.push({
                    title: 'Descomponer el término central',
                    latex: `${a}x^2 + ${mV}x + ${nV}x + ${c} = 0`
                });
                steps.push({
                    title: 'Factorizar por agrupación',
                    latex: `\\text{Agrupar y sacar factor común en cada grupo para obtener } a(x - x_1)(x - x_2) = 0`
                });
            }

            const s1 = x1F.value >= 0 ? `- ${x1F.latex}` : `+ ${Math.abs(x1F.value)}`;
            const s2 = x2F.value >= 0 ? `- ${x2F.latex}` : `+ ${Math.abs(x2F.value)}`;
            steps.push({ title: 'Forma factorizada final', latex: `${a}(x ${s1})(x ${s2}) = 0` });
        }

        steps.push({
            title: 'Raíces de la ecuación',
            latex: `x_1 = ${x1F.latex}\\qquad x_2 = ${x2F.latex}`
        });

        return { steps, roots, rootType };
    }

    // ─── Chart Data Generation ────────────────────────────────────

    function generateChartData(a, b, c, roots, vertex, rootType) {
        const h = vertex.h;
        let spread = 5;

        if (rootType === 'two_real') {
            const r1 = roots[0], r2 = roots[1];
            spread = Math.max(Math.abs(r1 - h), Math.abs(r2 - h), 4) * 1.5;
            spread = Math.min(spread, 40);
        } else if (rootType === 'complex' || rootType === 'double') {
            const k = vertex.k;
            // Show enough of the parabola for visual clarity
            spread = Math.max(Math.sqrt(Math.abs(k / (a || 1))), 4);
            spread = Math.min(Math.max(spread, 3), 20);
        }

        const xMin = round(h - spread), xMax = round(h + spread);
        const N    = 200;
        const step = (xMax - xMin) / N;
        const curve = [];
        for (let i = 0; i <= N; i++) {
            const x = round(xMin + i * step, 6);
            const y = round(a * x * x + b * x + c, 6);
            curve.push({ x, y });
        }

        const points = [];
        points.push({ x: vertex.h, y: vertex.k, type: 'vertex', label: `Vértice (${vertex.h}, ${vertex.k})` });
        points.push({ x: 0, y: c, type: 'yintercept', label: `Intrc. Y (0, ${c})` });

        if (rootType === 'two_real') {
            if (roots[0] !== roots[1]) {
                points.push({ x: roots[0], y: 0, type: 'root', label: `x₁ = ${roots[0]}` });
                points.push({ x: roots[1], y: 0, type: 'root', label: `x₂ = ${roots[1]}` });
            } else {
                points.push({ x: roots[0], y: 0, type: 'root', label: `x = ${roots[0]} (doble)` });
            }
        } else if (rootType === 'double') {
            points.push({ x: roots[0], y: 0, type: 'root', label: `x = ${roots[0]} (doble)` });
        }

        return { curve, points, xMin, xMax };
    }

    // ─── Public API ───────────────────────────────────────────────
    return {
        classifyEquation,
        calcVertex,
        equationLatex,
        solveGeneral,
        solvePoshenLoh,
        solveFactorization,
        generateChartData
    };

})();
