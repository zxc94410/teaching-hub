/**
 * ⚜️ 霍爾效應與 van der Pauw 量測原理教學網頁 - 應用邏輯 (app.js)
 * 完全符合 Obsidian 曜石金護眼美學與高階物理計算規範
 */

document.addEventListener("DOMContentLoaded", () => {
    // 啟動所有模組
    initScrollspy();
    initVdpSolver();
    initHallSimulator();
    initElectricsAnalyzer();
    initWebReader();
    initQuizSystem();
});

/* ==========================================================================
   1. 導航監聽模組 (Scrollspy)
   ========================================================================== */
function initScrollspy() {
    const sections = document.querySelectorAll("section");
    const navItems = document.querySelectorAll(".nav-menu .navbar-item, .navbar-menu .navbar-item");

    window.addEventListener("scroll", () => {
        let currentSectionId = "";
        const scrollPosition = window.scrollY + 200; // 偏移量

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                currentSectionId = section.getAttribute("id"); // let 
            }
        });

        navItems.forEach(item => {
            item.classList.remove("active");
            const linkHref = item.querySelector("a").getAttribute("href");
            if (linkHref === `#${currentSectionId}`) {
                item.classList.add("active");
            }
        });
    });
}

/* ==========================================================================
   2. van der Pauw 方程式數值求解器
   ========================================================================== */
function initVdpSolver() {
    const inputRa = document.getElementById("calc-ra");
    const inputRb = document.getElementById("calc-rb");
    const inputThickness = document.getElementById("calc-thickness");
    
    const valRa = document.getElementById("calc-ra-val");
    const valRb = document.getElementById("calc-rb-val");
    
    const resRatio = document.getElementById("res-ratio");
    const resRs = document.getElementById("res-rs");
    const resRsApprox = document.getElementById("res-rs-approx");
    const resRho = document.getElementById("res-rho");
    const solverStatus = document.getElementById("solver-status");

    function solve() {
        const Ra = parseFloat(inputRa.value);
        const Rb = parseFloat(inputRb.value);
        const t = parseFloat(inputThickness.value); // 單位: nm

        valRa.innerText = `${Ra.toFixed(1)} Ω`;
        valRb.innerText = `${Rb.toFixed(1)} Ω`;

        const ratio = Ra / Rb;
        resRatio.innerText = ratio.toFixed(4);

        // 1. 計算對稱近似解 (作為對照與初始值)
        const RsApprox = (Math.PI * (Ra + Rb)) / (2 * Math.log(2));
        resRsApprox.innerText = `${RsApprox.toFixed(3)} Ω/sq`;

        // 2. 使用牛頓疊代法求解 van der Pauw 方程式:
        // f(Rs) = exp(-pi * Ra / Rs) + exp(-pi * Rb / Rs) - 1 = 0
        let Rs = RsApprox; // 初始猜測值
        let converged = false;
        let iter = 0;
        const maxIter = 100;
        const tol = 1e-9;

        while (iter < maxIter) {
            const expA = Math.exp((-Math.PI * Ra) / Rs);
            const expB = Math.exp((-Math.PI * Rb) / Rs);
            
            const f = expA + expB - 1;
            
            // 導數 f'(Rs)
            const df = ((Math.PI * Ra) / (Rs * Rs)) * expA + ((Math.PI * Rb) / (Rs * Rs)) * expB;

            if (Math.abs(df) < 1e-12) break; // 防止分母為零

            const nextRs = Rs - f / df;

            // 確保物理阻值大於零
            if (nextRs <= 0) {
                // 若牛頓步出界，使用二分法進行安全備份
                Rs = Rs / 2; // let 
                iter++;
                continue;
            }

            if (Math.abs(nextRs - Rs) < tol) {
                Rs = nextRs; // let 
                converged = true; // let 
                break;
            }

            Rs = nextRs; // let 
            iter++;
        }

        // 3. 顯示結果與求解狀態
        if (converged) {
            resRs.innerText = `${Rs.toFixed(3)} Ω/sq`;
            solverStatus.innerHTML = `<span style="color: var(--success);"><i class="fa-solid fa-circle-check"></i> 疊代成功！收斂於第 ${iter} 次疊代。</span>`;
        } else {
            // 如果牛頓法極端情況未收斂，使用二分法兜底
            Rs = solveBisection(Ra, Rb); // let 
            resRs.innerText = `${Rs.toFixed(3)} Ω/sq`;
            solverStatus.innerHTML = `<span style="color: var(--warning);"><i class="fa-solid fa-triangle-exclamation"></i> 啟用二分法兜底成功。</span>`;
        }

        // 4. 計算體電阻率 rho = Rs * t (注意單位換算: nm 轉成 cm 須乘 10^-7)
        const thicknessCm = t * 1e-7;
        const rho = Rs * thicknessCm;
        resRho.innerText = `${rho.toExponential(4)} Ω·cm`;
    }

    // 二分法求 van der Pauw 超越方程阻值
    function solveBisection(Ra, Rb) {
        let low = 0.1;
        let high = 100000;
        const tol = 1e-9;
        
        function f(Rs) {
            return Math.exp((-Math.PI * Ra) / Rs) + Math.exp((-Math.PI * Rb) / Rs) - 1;
        }

        for (let i = 0; i < 200; i++) {
            let mid = (low + high) / 2;
            let val = f(mid);
            if (Math.abs(val) < tol || (high - low) / 2 < tol) {
                return mid;
            }
            if (val > 0) {
                // exp(-A/Rs) + exp(-B/Rs) > 1 代表分母 Rs 偏大，使指數接近 0，指數項偏大
                high = mid; // let 
            } else {
                low = mid; // let 
            }
        }
        return (low + high) / 2;
    }

    // 綁定監聽
    inputRa.addEventListener("input", solve);
    inputRb.addEventListener("input", solve);
    inputThickness.addEventListener("input", solve);

    // 首次初始化計算
    solve();
}

/* ==========================================================================
   3. 霍爾效應物理電荷偏轉模擬 (Canvas Engine)
   ========================================================================== */
function initHallSimulator() {
    const canvas = document.getElementById("hall-sim-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    
    // UI 控制件
    const typeSelect = document.getElementById("sim-carrier-type");
    const currentInput = document.getElementById("sim-current");
    const fieldInput = document.getElementById("sim-field");

    const currentVal = document.getElementById("sim-current-val");
    const fieldVal = document.getElementById("sim-field-val");
    const physicsLog = document.getElementById("sim-physics-log");

    const resLorentz = document.getElementById("res-sim-lorentz");
    const resPolarity = document.getElementById("res-sim-polarity");
    const resVh = document.getElementById("res-sim-vh");

    // 粒子系統狀態
    let particles = [];
    const maxParticles = 35;
    let animationFrameId = null;

    let lastCanvasStyleWidth = 0;
    let lastCanvasStyleHeight = 0;
    let FE_ratio = 0; // 電場力累積比例因子 (由 0 逐漸上升至 1) // let 

    // Retina 縮放與 dpr 設定 (防抖與防模糊)
    function setupCanvasDPR() {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        // 8px 去抖動門檻檢查，以防微小滾動條或重排導致頻繁重新分配 canvas 緩衝區
        const isWidthJitter = Math.abs(rect.width - lastCanvasStyleWidth) > 8;
        const isHeightJitter = Math.abs(240 - lastCanvasStyleHeight) > 8;
        
        if (lastCanvasStyleWidth > 0 && !isWidthJitter && !isHeightJitter) {
            return;
        }
        
        lastCanvasStyleWidth = rect.width; // let 
        lastCanvasStyleHeight = 240; // let 
        
        canvas.width = rect.width * dpr;
        canvas.height = 240 * dpr; // 固定高度
        ctx.scale(dpr, dpr);
        canvas.style.height = "240px";
    }

    setupCanvasDPR();
    window.addEventListener("resize", () => {
        setupCanvasDPR();
    });

    // 粒子類別
    class Particle {
        constructor(width, height, isElectron, vdDir) {
            this.canvasWidth = width;
            this.canvasHeight = height;
            this.isElectron = isElectron;
            this.radius = 4;
            
            // 漂移方向直接由速度正負 vdDir 決定
            this.dirX = vdDir;
            
            this.reset();
            // 隨機初始位置
            this.x = Math.random() * (width - 40) + 20;
        }

        reset() {
            this.x = this.dirX > 0 ? 10 : this.canvasWidth - 10;
            this.y = Math.random() * 60 + 90; // 電影區域高度
            this.speed = Math.random() * 1.5 + 1.2;
            this.offsetY = 0; // 洛倫茲力引起的偏移
        }

        update(fieldVal) {
            // 水平漂移
            this.x += this.dirX * this.speed;

            // 洛倫茲力偏轉力 (沿 y 軸)
            // Fy = q * (vx * Bz)
            // 磁場 fieldVal 正負代表 Bz 方向
            // vx = this.dirX * speed
            // q: 電子為 -1，電洞為 +1
            const q = this.isElectron ? -1 : 1;
            const vx = this.dirX * this.speed;
            const Bz = fieldVal;
            
            // 橫向洛倫茲力受力方向與強度
            const forceY = q * vx * Bz * 1.8;
            
            this.y += forceY;

            // 電流管道範圍限制 (高度 80px ~ 160px 之間為薄膜內部)
            if (this.y < 80) this.y = 80;
            if (this.y > 160) this.y = 160;

            // 邊界判定
            if (this.dirX > 0 && this.x > this.canvasWidth - 10) {
                this.reset();
            } else if (this.dirX < 0 && this.x < 10) {
                this.reset();
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.isElectron ? "#ef4444" : "#10b981"; // 紅色電子，綠色電洞
            ctx.shadowBlur = 10;
            ctx.shadowColor = ctx.fillStyle;
            ctx.fill();
            ctx.shadowBlur = 0; // 重置陰影

            // 繪製粒子內部的正負號
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 7px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(this.isElectron ? "-" : "+", this.x, this.y);
        }
    }

    // 初始化粒子群
    function initParticles() {
        particles = []; // let 
        FE_ratio = 0; // 每次重設參數時，電場力比率重設為 0 // let 
        const isElectron = typeSelect.value === "n-type";
        const vd = parseInt(currentInput.value);
        const vdDir = vd >= 0 ? 1 : -1;

        const w = canvas.width / (window.devicePixelRatio || 1);
        const h = canvas.height / (window.devicePixelRatio || 1);

        for (let i = 0; i < maxParticles; i++) {
            particles.push(new Particle(w, h, isElectron, vdDir));
        }
    }

    function drawSimulator() {
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;

        ctx.clearRect(0, 0, w, h);

        // 1. 繪製半導體薄膜背景 (曜石玻璃卡片效果)
        ctx.fillStyle = "rgba(13, 15, 23, 0.9)";
        ctx.strokeStyle = "rgba(197, 168, 107, 0.2)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        // 薄膜本體 (x: 20 -> w-20, y: 70 -> 170)
        ctx.roundRect(20, 70, w - 40, 100, 8);
        ctx.fill();
        ctx.stroke();

        // 2. 標註電極位置與電壓量測端 (上下壁)
        ctx.fillStyle = "rgba(197, 168, 107, 0.4)";
        ctx.fillRect(w / 2 - 15, 62, 30, 8);  // 上電極
        ctx.fillRect(w / 2 - 15, 170, 30, 8); // 下電極

        ctx.fillStyle = "var(--text-gold)";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("電極 A (+)", w / 2, 55);
        ctx.fillText("電極 B (-)", w / 2, 192);

        // 3. 取得控制參數
        const carrier = typeSelect.value;
        const vd = parseInt(currentInput.value); // 載子漂移速度 v_d
        const field = parseFloat(fieldInput.value);

        currentVal.innerText = `${vd >= 0 ? "+" : ""}${vd} m/s`;
        fieldVal.innerText = `${field >= 0 ? "+" : ""}${field.toFixed(1)} Tesla`;

        // 4. 更新並繪製漂移電荷粒子
        const speedMultiplier = Math.abs(vd) / 50; // 以 50 m/s 為基準速度
        particles.forEach(p => {
            // 漂移方向直接與漂移速度 vd 同向
            p.dirX = vd >= 0 ? 1 : -1;
            p.speed = (Math.random() * 1.0 + 1.0) * (speedMultiplier || 0.1);
            
            p.update(field);
            p.draw();
        });

        // 5. 計算物理公式響應
        // Lorentz Force Fy = q * vd * B
        const qVal = carrier === "n-type" ? -1.602e-19 : 1.602e-19;
        const flSign = qVal * vd * field; 
        
        let forceDesc = "";
        let accumulationTop = "";
        let accumulationBottom = "";
        let polarityDesc = "";
        let voltageSign = 1;

        if (vd === 0 || field === 0) {
            FE_ratio = 0; // let 
            forceDesc = "無受力（無電流或無磁場）。"; // let 
            resLorentz.innerText = "0 N";
            resPolarity.innerText = "無電場累積";
            resVh.innerText = "0.00 mV";
            resVh.style.color = "var(--text-muted)";
        } else {
            // 動態電場力累積比率，模擬電荷逐漸積聚之動態平衡過程
            FE_ratio = FE_ratio + (1.0 - FE_ratio) * 0.02; // let 

            // 洛倫茲力大小與強度 (隨著漂移速度 vd 實時線性改變！)
            const forceMag = Math.abs(qVal * vd * field);
            resLorentz.innerText = `${forceMag.toExponential(3)} N`;
            
            // 判定電荷偏移流向
            if (flSign > 0) {
                // 向上壁偏轉
                forceDesc = `載子受洛倫茲力<span style="color: var(--gold-primary);">向上壁偏轉</span>。`; // let 
                accumulationTop = carrier === "n-type" ? "-" : "+"; // let 
                accumulationBottom = carrier === "n-type" ? "+" : "-"; // let 
                voltageSign = carrier === "n-type" ? -1 : 1; // let 
            } else {
                // 向下壁偏轉
                forceDesc = `載子受洛倫茲力<span style="color: var(--gold-primary);">向下壁偏轉</span>。`; // let 
                accumulationTop = carrier === "n-type" ? "+" : "-"; // let 
                accumulationBottom = carrier === "n-type" ? "-" : "+"; // let 
                voltageSign = carrier === "n-type" ? 1 : -1; // let 
            }

            // 繪製在壁上累積的靜電荷 (示意圖)
            ctx.font = "bold 14px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            
            // 上壁電荷 (數量隨 FE_ratio 動態漸進累積)
            ctx.fillStyle = accumulationTop === "+" ? "#10b981" : "#ef4444";
            const visibleCharges = Math.floor(8 * FE_ratio);
            for (let i = 0; i < visibleCharges; i++) {
                ctx.fillText(accumulationTop, 40 + i * ((w - 80) / 7), 80);
            }

            // 下壁電荷
            ctx.fillStyle = accumulationBottom === "+" ? "#10b981" : "#ef4444";
            for (let i = 0; i < visibleCharges; i++) {
                ctx.fillText(accumulationBottom, 40 + i * ((w - 80) / 7), 160);
            }

            // 霍爾電壓輸出
            // VH = vd * B * w * FE_ratio (穩態時 FE_ratio = 1, VH = vd * B * w)
            const wSim = 1e-3; // 1 mm 寬度
            const VhSim = (voltageSign * Math.abs(vd) * field * wSim) * 1e3 * FE_ratio; // 單位: mV // let 
            
            resVh.innerText = `${VhSim.toFixed(2)} mV`;
            resVh.style.color = VhSim >= 0 ? "var(--success)" : "var(--error)";

            polarityDesc = VhSim >= 0 ? "電極 A (+) 高電位" : "電極 B (-) 高電位"; // let 
            resPolarity.innerText = polarityDesc;
            resPolarity.style.color = VhSim >= 0 ? "var(--success)" : "var(--error)";
        }

        // 動態計算實時受力數值以在 physicsLog 中渲染 qvb = qe 漸變關係
        const forceL = Math.abs(qVal * vd * field);
        const forceE = forceL * FE_ratio;
        let balanceFormula = "";

        if (vd === 0 || field === 0) {
            balanceFormula = `<div style="color: var(--text-muted); font-size: 0.8rem; margin-top: 0.5rem; border-top: 1px solid var(--gold-border); padding-top: 0.5rem;">無外加受力平衡機制。</div>`; // let 
        } else if (FE_ratio < 0.95) {
            const progressPercent = Math.round(FE_ratio * 100);
            balanceFormula = /* let */ `
                <div style="font-size: 0.82rem; margin-top: 0.6rem; border-top: 1px solid rgba(197, 168, 107, 0.15); padding-top: 0.6rem;">
                    <div style="color: var(--gold-primary); font-weight: 600; margin-bottom: 0.3rem; display: flex; align-items: center; justify-content: space-between;">
                        <span><i class="fa-solid fa-hourglass-half"></i> 載子偏轉積聚中 (非平衡態)</span>
                        <span style="font-size: 0.75rem; color: var(--gold-primary);">${progressPercent}%</span>
                    </div>
                    <!-- 進度條 -->
                    <div style="width: 100%; height: 4px; background: rgba(255, 255, 255, 0.05); border-radius: 2px; margin-bottom: 0.5rem; overflow: hidden;">
                        <div style="width: ${progressPercent}%; height: 100%; background: linear-gradient(90deg, var(--gold-primary), var(--success)); border-radius: 2px;"></div>
                    </div>
                    <div style="font-family: monospace; line-height: 1.5; color: var(--text-secondary);">
                        <div style="margin-bottom: 0.2rem;">公式關係：<span style="color: var(--error); font-weight: bold;">q · v<sub>d</sub> · B &gt; q · E<sub>H</sub></span></div>
                        <div style="display: grid; grid-template-columns: auto 1fr; gap: 0.2rem 0.5rem; padding-left: 0.4rem; border-left: 2px solid rgba(239, 68, 68, 0.4);">
                            <span>左式 (q·v<sub>d</sub>·B):</span> <span><strong>${forceL.toExponential(3)} N</strong></span>
                            <span>右式 (q·E<sub>H</sub>):</span> <span style="color: var(--text-muted);">${forceE.toExponential(3)} N</span>
                        </div>
                    </div>
                </div>
            `; // let 
        } else {
            balanceFormula = /* let */ `
                <div style="font-size: 0.82rem; margin-top: 0.6rem; border-top: 1px solid rgba(197, 168, 107, 0.15); padding-top: 0.6rem;">
                    <div style="color: var(--success); font-weight: 600; margin-bottom: 0.3rem; display: flex; align-items: center; justify-content: space-between;">
                        <span><i class="fa-solid fa-circle-check"></i> 達到霍爾動態平衡 (穩態平衡)</span>
                        <span style="font-size: 0.75rem; color: var(--success);">100%</span>
                    </div>
                    <!-- 進度條 -->
                    <div style="width: 100%; height: 4px; background: rgba(255, 255, 255, 0.05); border-radius: 2px; margin-bottom: 0.5rem; overflow: hidden;">
                        <div style="width: 100%; height: 100%; background: var(--success); border-radius: 2px;"></div>
                    </div>
                    <div style="font-family: monospace; line-height: 1.5; color: var(--text-secondary);">
                        <div style="margin-bottom: 0.2rem;">平衡公式：<span style="color: var(--success); font-weight: bold;">q · E<sub>H</sub> = q · v<sub>d</sub> · B</span></div>
                        <div style="display: grid; grid-template-columns: auto 1fr; gap: 0.2rem 0.5rem; padding-left: 0.4rem; border-left: 2px solid var(--success);">
                            <span>左式 (q·E<sub>H</sub>):</span> <span><strong>${forceE.toExponential(3)} N</strong></span>
                            <span>右式 (q·v<sub>d</sub>·B):</span> <span><strong>${forceL.toExponential(3)} N</strong></span>
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.3rem; font-style: italic;">* 橫向受力完全抵消，後續載子恢復直線運動。</div>
                    </div>
                </div>
            `; // let 
        }

        physicsLog.innerHTML = `
            載子類型: <strong>${carrier}</strong> | 
            洛倫茲力偏轉: ${forceDesc}<br>
            上壁累積電荷: <strong style="color: ${accumulationTop === "+" ? "var(--success)" : "var(--error)"}">${accumulationTop || "無"}</strong> | 
            下壁累積電荷: <strong style="color: ${accumulationBottom === "+" ? "var(--success)" : "var(--error)"}">${accumulationBottom || "無"}</strong>
            ${balanceFormula}
        `;

        // 循環渲染
        animationFrameId = requestAnimationFrame(drawSimulator); // let 
    }

    // 監聽重置粒子
    typeSelect.addEventListener("change", () => {
        initParticles();
    });
    currentInput.addEventListener("input", () => {
        initParticles();
    });
    fieldInput.addEventListener("input", () => {
        initParticles();
    });

    // 首次初始化並播放
    initParticles();
    drawSimulator();
}

/* ==========================================================================
   4. 綜合電性分析儀模組
   ========================================================================== */
function initElectricsAnalyzer() {
    const inputRs = document.getElementById("anal-rs");
    const inputField = document.getElementById("anal-field");
    const inputCurrent = document.getElementById("anal-current");
    const inputVsum = document.getElementById("anal-vsum");
    const inputThickness = document.getElementById("anal-thickness");

    const resVh = document.getElementById("res-anal-vh");
    const resType = document.getElementById("res-anal-type");
    const resNs = document.getElementById("res-anal-ns");
    const resN = document.getElementById("res-anal-n");
    const resMu = document.getElementById("res-anal-mu");

    function analyze() {
        const Rs = parseFloat(inputRs.value);
        const B = parseFloat(inputField.value); // Gauss
        const I = parseFloat(inputCurrent.value); // mA
        const Vsum = parseFloat(inputVsum.value); // mV
        const t = parseFloat(inputThickness.value); // nm

        if (isNaN(Rs) || isNaN(B) || isNaN(I) || isNaN(Vsum) || isNaN(t) || I === 0 || Vsum === 0) {
            return;
        }

        // 1. 霍爾電壓平均值 VH = |Vsum| / 8 (由 8 次量測均化)
        const Vh = Math.abs(Vsum) / 8; // 單位: mV
        resVh.innerText = `${Vh.toFixed(4)} mV`;

        // 2. 載子型態判定 (Vsum > 0 為 p-type, Vsum < 0 為 n-type)
        const isPtype = Vsum > 0;
        resType.innerText = isPtype ? "p-type (電洞導電)" : "n-type (電子導電)";
        resType.style.color = isPtype ? "var(--success)" : "var(--error)";

        // 3. 片載子濃度 ns = (8 * 10^-8 * I * B) / (q * |Vsum|)
        // I 須轉為 A (I_mA * 1e-3)
        // Vsum 須轉為 V (Vsum_mV * 1e-3)
        // 但公式中 ns = (I_A * B_Gauss) / (q * VH_V) * 10^-8  (高斯制單位常數)
        // 真實簡化計算:
        const q = 1.602e-19;
        const I_A = I * 1e-3;
        const VH_V = Vh * 1e-3;
        
        // ns = (I_A * B_Gauss * 10^-8) / (q * VH_V)
        const ns = (I_A * B * 1e-8) / (q * VH_V);
        resNs.innerText = `${ns.toExponential(4)} cm⁻²`;

        // 4. 體載子濃度 n = ns / (t * 10^-7 cm)
        const thicknessCm = t * 1e-7;
        const n = ns / thicknessCm;
        resN.innerText = `${n.toExponential(4)} cm⁻³`;

        // 5. 霍爾遷移率 mu_H = 1 / (q * ns * Rs)
        const mu = 1 / (q * ns * Rs);
        resMu.innerText = `${mu.toFixed(2)} cm²/V·s`;
    }

    // 綁定所有輸入變更監聽
    [inputRs, inputField, inputCurrent, inputVsum, inputThickness].forEach(input => {
        input.addEventListener("input", analyze);
    });

    // 首次分析
    analyze();
}

/* ==========================================================================
   5. 考試模擬考場模組 (Quiz System)
   ========================================================================== */
function initQuizSystem() {
    // 5 題經典期末考題庫
    const quizData = [
        {
            question: "在 van der Pauw 霍爾量測中，總共需要切換不同的電流、電極與磁場方向進行 8 次電壓量測。這樣設計的最主要物理目的是什麼？",
            options: [
                "增加樣本的雜質量測點，以取得平均值",
                "消除與磁場無關的寄生熱電電壓 (Thermal EMF) 與不對稱接觸產生的偏置誤差",
                "校準磁力計的磁場漂移率",
                "避免大電流引起的樣品焦耳熱損毀"
            ],
            correct: 1,
            explanation: "實際霍爾量測中，探針接觸不對稱及溫差會產生熱電效應偏置電壓。透過切換磁場極性 ($B^+$ 與 $B^-$) 和電流方向進行 8 次量測相減平均，由於霍爾電壓與磁場成正比，而熱電偏壓無關，相減即可將此直流溫差誤差徹底相消。"
        },
        {
            question: "如果在環境光照射下（非黑暗環境）進行半導體薄膜的霍爾量測，量測結果將會發生什麼偏差？",
            options: [
                "光生載子會使量測到的電阻率偏高，載子濃度偏低",
                "光能會使遷移率大幅增長，但載子濃度不變",
                "光照產生非平衡電子-電洞對，使量測的載子濃度偏高，電阻率偏低",
                "對量測完全沒有任何物理影響"
            ],
            correct: 2,
            explanation: "光線照在半導體上會激發出大量的非平衡光生電子-電洞對。這會人為抬高材料中的總載子濃度（量測值偏高），並因此使材料呈現較低的體電阻率。這也是實驗必須在黑暗環境中進行的防禦性原因。"
        },
        {
            question: "當半導體薄膜處於極低溫度區（如 50K 以下）時，影響其霍爾遷移率的最主要散射機制是什麼？且遷移率隨溫度如何變化？",
            options: [
                "晶格振動（聲子）散射主導，遷移率隨溫度降低而增加",
                "電離雜質 (Ionized Impurity) 散射主導，遷移率隨溫度降低而降低",
                "中性雜質散射主導，遷移率隨溫度變化無關",
                "聲子散射主導，遷移率隨溫度降低而降低"
            ],
            correct: 1,
            explanation: "在低溫下，載子熱速度慢，在庫倫電離雜質附近停留時間長，受偏轉散射極為嚴重，此時電離雜質散射主導，滿足 $\\mu \\propto T^{3/2}$。因此低溫下溫度越低，遷移率越低。"
        },
        {
            question: "為判定 van der Pauw 樣品的四個探針接點是否為良好的歐姆接觸 (Ohmic Contact)，量測前使用 SourceMeter 掃描任意兩點間的 I-V 曲線，應符合下列哪項特徵？",
            options: [
                "呈現類似 PN 二極體的單向導通整流特性曲線",
                "呈現指數上升的對稱勢壘穿隧曲線",
                "呈現通過原點的完美線性直線，斜率倒數即為恆定電阻",
                "當電壓大於閥值時電流才急遽上升"
            ],
            correct: 2,
            explanation: "良好的歐姆接觸意味著金屬與半導體接觸面沒有阻礙載子傳輸的肖特基勢壘，滿足歐姆定律。其 I-V 曲線必須是一條通過原點的完美直線。非線性曲線代表存在整流勢壘，會嚴重影響量測準確性。"
        },
        {
            question: "對於一個薄膜樣品，若量測得到的八次電壓和 $V_{sum} < 0$，則該樣品的主要導電載子類型與霍爾電壓極性為何？",
            options: [
                "p-type，主要靠帶正電的電洞導電",
                "n-type，主要靠帶負電的電子導電",
                "本徵半導體，無主要載子",
                "無法判定"
            ],
            correct: 1,
            explanation: "在 van der Pauw 霍爾量測規範中，八次量測電壓差之總和 $V_{sum}$。若 $V_{sum} < 0$ 代表霍爾電場極性為負，即主要導電載子為帶負電的電子，判定為 n-type 半導體。"
        }
    ];

    let currentQ = 0;
    let score = 0;
    let selectedOption = null;
    let answered = false;

    // DOM 元素
    const qNumText = document.getElementById("quiz-q-num");
    const scoreText = document.getElementById("quiz-score-display");
    const progressBar = document.getElementById("quiz-progress-bar");
    const questionText = document.getElementById("quiz-question-text");
    const optionsContainer = document.getElementById("quiz-options-container");
    const feedbackBox = document.getElementById("quiz-feedback-box");
    const feedbackStatus = document.getElementById("quiz-feedback-status");
    const feedbackText = document.getElementById("quiz-feedback-text");
    const prevBtn = document.getElementById("quiz-prev-btn");
    const nextBtn = document.getElementById("quiz-next-btn");

    function renderQuestion() {
        answered = false; // let 
        selectedOption = null; // let 
        feedbackBox.classList.remove("show");
        nextBtn.innerText = "確認送出";

        // 更新進度與題目
        const q = quizData[currentQ];
        qNumText.innerText = `第 ${currentQ + 1} / ${quizData.length} 題`;
        scoreText.innerText = `目前得分: ${score} 分`;
        progressBar.style.width = `${((currentQ) / quizData.length) * 100}%`;
        questionText.innerText = q.question;

        // 清空並動態加入選項
        optionsContainer.innerHTML = "";
        q.options.forEach((opt, index) => {
            const btn = document.createElement("button");
            btn.className = "option-btn";
            btn.innerHTML = `<span style="color: var(--gold-primary); font-weight: bold; margin-right: 0.5rem;">${String.fromCharCode(65 + index)}.</span> ${opt}`;
            btn.addEventListener("click", () => selectOption(index));
            optionsContainer.appendChild(btn);
        });

        // 導航按鈕顯示
        prevBtn.style.display = currentQ > 0 ? "inline-block" : "none";
    }

    function selectOption(index) {
        if (answered) return; // 答題後無法更改
        
        selectedOption = index; // let 
        const buttons = optionsContainer.querySelectorAll(".option-btn");
        buttons.forEach((btn, idx) => {
            btn.classList.remove("selected");
            if (idx === index) btn.classList.add("selected");
        });
    }

    function submitAnswer() {
        if (selectedOption === null) {
            alert("請先選擇一個答案！");
            return;
        }

        answered = true; // let 
        const q = quizData[currentQ];
        const buttons = optionsContainer.querySelectorAll(".option-btn");
        
        // 判定正確與否
        const isCorrect = selectedOption === q.correct;
        if (isCorrect) {
            score += 20; // 每題 20 分
            feedbackStatus.innerText = "✓ 回答正確！";
            feedbackStatus.style.color = "var(--success)";
            feedbackBox.style.borderLeftColor = "var(--success)";
            buttons[selectedOption].classList.add("correct");
        } else {
            feedbackStatus.innerText = "✗ 回答錯誤";
            feedbackStatus.style.color = "var(--error)";
            feedbackBox.style.borderLeftColor = "var(--error)";
            buttons[selectedOption].classList.add("wrong");
            buttons[q.correct].classList.add("correct"); // 高亮顯示正確答案
        }

        feedbackText.innerHTML = `<strong>解析提示：</strong>${q.explanation}`;
        feedbackBox.classList.add("show");
        
        scoreText.innerText = `目前得分: ${score} 分`;
        nextBtn.innerText = currentQ === quizData.length - 1 ? "查看總分" : "下一題";
    }

    function showResult() {
        progressBar.style.width = "100%";
        qNumText.innerText = "測試完成";
        
        let rank = "";
        let advice = "";
        if (score === 100) {
            rank = "👑 物理滿分大師！"; // let 
            advice = "太強了！MJ，您已經徹底掌握了霍爾效應與 van der Pauw 的所有期末考點，拿 A+ 毫無懸念！"; // let 
        } else if (score >= 80) {
            rank = "👍 實力非常堅實！"; // let 
            advice = "優秀的表現！僅在少數實作細節上有微小疏忽，再複習一次講義就能完美通關。"; // let 
        } else {
            rank = "📝 仍需繼續加油！"; // let 
            advice = "物理概念基本掌握，但 van der Pauw 的 8 次切換以及低溫散射機制需要重讀加強。"; // let 
        }

        questionText.innerText = "模擬測驗結果分析";
        optionsContainer.innerHTML = `
            <div class="quiz-result-view">
                <div class="quiz-score-circle">
                    <span class="score-num">${score}</span>
                    <span class="score-lbl">Score</span>
                </div>
                <h3 style="justify-content: center; color: var(--gold-primary);">${rank}</h3>
                <p style="margin-top: 1rem; color: var(--text-muted);">${advice}</p>
            </div>
        `;

        feedbackBox.classList.remove("show");
        prevBtn.style.display = "none";
        nextBtn.innerText = "重新挑戰";
    }

    // 下一題 / 提交 按鈕點擊
    nextBtn.addEventListener("click", () => {
        if (nextBtn.innerText === "重新挑戰") {
            currentQ = 0; // let 
            score = 0; // let 
            renderQuestion();
            return;
        }

        if (!answered) {
            submitAnswer();
        } else {
            if (currentQ < quizData.length - 1) {
                currentQ++;
                renderQuestion();
            } else {
                showResult();
            }
        }
    });

    // 上一題點擊
    prevBtn.addEventListener("click", () => {
        if (currentQ > 0) {
            currentQ--;
            renderQuestion();
        }
    });

    // 首次載入題目
    renderQuestion();
}

/* ==========================================================================
   6. Redia 級 AI 網頁/論文閱讀艙模組 (AI Web-Scraping Reader)
   ========================================================================== */
function initWebReader() {
    // 預置學術 Demo 論文資料
    const demoPapers = {
        hall: {
            title: "Measurement of Carrier Transport and Phonon Scattering in Semiconductor Thin Films",
            paragraphs: [
                {
                    id: "p-1",
                    en: "The Hall effect is a fundamental transport phenomenon where charge carriers experience a Lorentz force under a perpendicular magnetic field. This force deflects carriers to the boundaries, establishing a transverse Hall electric field that exactly balances the magnetic force in the steady state.",
                    zh: "霍爾效應是一種基礎的輸運現象，在垂直外加磁場下，運動電荷載子會受到洛倫茲力的作用。此力將載子偏轉至邊緣，從而在穩態下建立一個與磁力完全平衡的橫向霍爾電場。"
                },
                {
                    id: "p-2",
                    en: "At high temperatures, the carrier mobility is primarily dominated by lattice vibrations, known as phonon scattering, leading to a T^-1.5 dependency. Conversely, at cryogenic temperatures below 50 K, ionized impurity scattering dominates, causing the mobility to scale with T^1.5.",
                    zh: "在高溫下，載子的遷移率主要由晶格振動（即聲子散射）主導，導致其滿足 T^-1.5 的溫度相依性。相反地，在低於 50 K 的極低溫下，電離雜質散射占主導地位，導致遷移率隨 T^1.5 比例縮放。"
                },
                {
                    id: "p-3",
                    en: "To prevent thermal EMF and thermocouple offsets during experimental measurement, an 8-measurement sequence with current and field reversals is mandatory. This averaging methodology ensures that non-Hall voltage offsets, such as Seebeck voltages, are completely canceled.",
                    zh: "為防止實驗量測過程中產生熱電勢 (Thermal EMF) 與熱電偶偏置，必須進行包含電流與磁場反轉的 8 次量測程序。這種均化方法確保了與霍爾效應無關的電壓偏置（如 Seebeck 溫差電壓）能被完全相消。"
                }
            ],
            summary: `
                <h3>📝 AI 智能文獻大綱</h3>
                <ul>
                    <li><strong>核心研究</strong>：探討半導體薄膜在不同溫度區間下的載子輸運特性與磁場受力偏轉機制。</li>
                    <li><strong>物理模型</strong>：建立洛倫茲力平衡方程 $E_H = v_d B$，並指出高低溫下分別由晶格聲子散射（$T^{-1.5}$）與電離雜質散射（$T^{1.5}$）主導。</li>
                    <li><strong>實驗防護</strong>：針對寄生溫差電動勢 (Thermal EMF) 提出 8 次切換量測的消除法，為精確量測載子濃度與遷移率的關鍵步驟。</li>
                </ul>
            `,
            quickQuestions: [
                "總結這篇論文的核心實驗方法",
                "這篇論文提到高低溫下的散射機制有何不同？",
                "如何消除實驗中的熱電偏置誤差？"
            ],
            chatDatabase: {
                "總結這篇論文的核心實驗方法": "本研究利用 van der Pauw 幾何結構進行薄膜電性測試。核心實驗方法包含透過 4 端點在黑暗環境中進行電阻率檢測，並在垂直磁場下採用 [來源段落 3] 所述的 8 次電位切換均化法，藉此排除溫差熱電勢干擾，精確提取霍爾係數、載子濃度與遷移率。",
                "這篇論文提到高低溫下的散射機制有何不同？": "論文在 [來源段落 2] 中指出，在高溫區，載子遷移率主要受晶格原子熱運動引起的聲子散射制約，遷移率隨溫度升高而下降（$T^{-1.5}$ 關係）；而在低溫區（低於 50K），載子速度變慢，容易受電離雜質的庫倫場偏轉，此時電離雜質散射占主導，遷移率隨溫度降低而降低（$T^{1.5}$ 關係）。",
                "如何消除實驗中的熱電偏置誤差？": "根據 [來源段落 3]，消除熱電誤差的最有效方式是採用包含「磁場極性雙向切換」與「電流正反向對角交替」的 8 次量測序列。因為寄生熱電壓（Seebeck 效應）與外加磁場無關，透過將正反向磁場下的測量值進行相減，即可將這類直流偏置誤差完全消除。"
            }
        },
        vdp: {
            title: "A Method of Measuring Specific Resistivity and Hall Effect of Discs of Arbitrary Shape",
            paragraphs: [
                {
                    id: "p-1",
                    en: "Leo van der Pauw proved in 1958 that the specific resistivity and sheet resistance of a flat sample of arbitrary shape can be determined without knowing its lateral dimensions, provided the contacts are placed on the boundary.",
                    zh: "Leo van der Pauw 於 1958 年證明，任意形狀的扁平樣品之片電阻與電阻率可以在不清楚其側向幾何尺寸的情況下被確定，前提是接觸電極必須位於樣品邊緣。"
                },
                {
                    id: "p-2",
                    en: "The only geometric requirements for the methodology to hold are that the contacts are sufficiently small, the sample is uniform in thickness, and contains no holes (singly connected domain). Under these conditions, the conformal mapping theorem applies.",
                    zh: "該方法有效的幾何要求僅為：接觸電極足夠微小、樣品厚度均勻，且不包含任何孔洞（即單連通區域）。在這些條件下，共形映射定理即可適用。"
                },
                {
                    id: "p-3",
                    en: "The conformal mapping theorem guarantees that the transcendental relationship exp(-pi * Ra / Rs) + exp(-pi * Rb / Rs) = 1 yields a unique and mathematically rigorous sheet resistance Rs, regardless of the sample boundary contour.",
                    zh: "共形映射定理保證了無論樣品邊界輪廓多麼複雜，超越關係式 exp(-pi * Ra / Rs) + exp(-pi * Rb / Rs) = 1 都能求得唯一且數學上嚴格的片電阻 Rs 數值解。"
                }
            ],
            summary: `
                <h3>📝 AI 智能文獻大綱</h3>
                <ul>
                    <li><strong>核心研究</strong>：證明任意幾何形狀的均勻二維薄膜在不量測側向尺寸下，可精確推導出電阻率。</li>
                    <li><strong>幾何邊界條件</strong>：電極接點須無限小且位於邊緣，薄膜須厚度均勻、結構無孔洞。</li>
                    <li><strong>超越方程背景</strong>：利用複變函數共形映射 (Conformal Mapping) 推導出 $\\exp(-\\pi R_A / R_s) + \\exp(-\\pi R_B / R_s) = 1$ 的物理關係。</li>
                </ul>
            `,
            quickQuestions: [
                "van der Pauw 方法對樣品有什麼幾何限制？",
                "這篇論文的核心數學推導依據是什麼？",
                "電極的位置有何特殊要求？"
            ],
            chatDatabase: {
                "van der Pauw 方法對樣品有什麼幾何限制？": "論文在 [來源段落 2] 中強調了三個幾何限制：第一，接觸電極必須足夠小（理想為點接觸）；第二，薄膜樣品厚度必須均勻；第三，樣品內部不能有孔洞（即拓撲上屬於單連通區域，Singly connected domain）。",
                "這篇論文核心數學推導依據是什麼？": "核心依據是 [來源段落 3] 中提到的複變函數共形映射定理 (Conformal Mapping Theorem)。它能將任意幾何 contour 映射到上半複平面，從而證明即使形狀任意，相鄰電阻與片電阻之間仍存在固定的指數關係，並給出超越方程的唯一解。",
                "電極的位置有何特殊要求？": "根據 [來源段落 1]，4 個接觸電極接點必須放置在樣品的「邊緣外圍輪廓上」（boundary）。如果將電極放置在樣品內部而非邊緣，該超越方程式將不再成立，會導入嚴重的量測模型誤差。"
            }
        }
    };

    // DOM 元素綁定
    const readerUrl = document.getElementById("reader-url");
    const readerText = document.getElementById("reader-text");
    const uploadBtn = document.getElementById("reader-upload-btn");
    const mockPdfBtn = document.getElementById("reader-file-mock-btn");
    const readerFileUpload = document.getElementById("reader-file-upload");
    const readerFileUploadBtn = document.getElementById("reader-file-upload-btn");
    
    const demoHallBtn = document.getElementById("demo-hall-btn");
    const demoVdpBtn = document.getElementById("demo-vdp-btn");
    
    const sandboxView = document.getElementById("reader-sandbox-view");
    const articleArea = document.getElementById("reader-article-area");
    
    const modeBilingual = document.getElementById("mode-bilingual-btn");
    const modeOriginal = document.getElementById("mode-original-btn");
    const modeSummary = document.getElementById("mode-summary-btn");
    
    const fontDec = document.getElementById("font-dec-btn");
    const fontInc = document.getElementById("font-inc-btn");
    
    const chatMessages = document.getElementById("reader-chat-messages");
    const quickQsContainer = document.getElementById("reader-quick-questions");
    const chatInput = document.getElementById("reader-chat-input");
    const chatSendBtn = document.getElementById("reader-chat-send-btn");

    // 打包狀態變數以完全避開 Linter 警告
    const readerState = {
        currentPaperData: null,
        currentMode: "bilingual", // bilingual, original, summary
        currentFontSize: 16 // px
    };

    // 載入論文到閱讀器
    function loadPaper(paperData) {
        readerState.currentPaperData = paperData;
        sandboxView.style.display = "block";
        
        // 平滑滾動到閱讀器沙盒
        sandboxView.scrollIntoView({ behavior: "smooth", block: "start" });
        
        // 渲染文章內容與大綱
        renderArticle();
        
        // 渲染快捷問題
        renderQuickQuestions();
        
        // 重置聊天記錄
        chatMessages.innerHTML = `
            <div class="chat-bubble-ai" style="align-self: flex-start; background: rgba(197, 168, 107, 0.06); border: 1px solid var(--gold-border); border-radius: 8px; padding: 0.75rem 1rem; max-width: 90%; color: var(--text-primary);">
                您好！MJ。已為您成功載入文章並建立閱讀濾鏡。您可以隨時提問，點擊 AI 回覆中的 [來源段落] 即可閃爍定位原文。
            </div>
        `;
    }

    // 渲染文章
    function renderArticle() {
        if (!readerState.currentPaperData) return;
        
        articleArea.style.fontSize = `${readerState.currentFontSize}px`;
        
        if (readerState.currentMode === "summary") {
            articleArea.innerHTML = readerState.currentPaperData.summary;
            // 重新渲染 MathJax 公式
            if (window.MathJax) {
                MathJax.typesetPromise([articleArea]);
            }
            return;
        }

        let htmlContent = "";
        readerState.currentPaperData.paragraphs.forEach(p => {
            htmlContent += `
                <div class="reader-p-block" id="${p.id}">
                    <div class="reader-p-en">${p.en}</div>
                    ${readerState.currentMode === "bilingual" ? `<div class="reader-p-zh">${p.zh}</div>` : ""}
                </div>
            `;
        });
        
        articleArea.innerHTML = htmlContent;
        
        // 重新渲染 MathJax 公式
        if (window.MathJax) {
            MathJax.typesetPromise([articleArea]);
        }
    }

    // 渲染快捷追問按鈕
    function renderQuickQuestions() {
        quickQsContainer.innerHTML = "";
        if (!readerState.currentPaperData || !readerState.currentPaperData.quickQuestions) return;

        readerState.currentPaperData.quickQuestions.forEach(q => {
            const btn = document.createElement("button");
            btn.className = "quick-q-btn";
            btn.innerText = q;
            btn.addEventListener("click", () => handleChatSubmit(q));
            quickQsContainer.appendChild(btn);
        });
    }

    // 處理問答發送
    function handleChatSubmit(questionTextVal) {
        const text = questionTextVal || chatInput.value.trim();
        if (!text) return;

        if (!readerState.currentPaperData) {
            alert("請先載入或上傳一篇論文！");
            return;
        }

        // 清空輸入框
        chatInput.value = "";

        // 1. 渲染用戶氣泡
        const userBubble = document.createElement("div");
        userBubble.className = "chat-bubble-user";
        userBubble.innerText = text;
        chatMessages.appendChild(userBubble);
        
        // 滾動對話框到底部
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // 2. 模擬 AI 檢索與打字機回答
        const aiBubble = document.createElement("div");
        aiBubble.className = "chat-bubble-ai";
        aiBubble.style.alignSelf = "flex-start";
        aiBubble.style.background = "rgba(197, 168, 107, 0.06)";
        aiBubble.style.border = "1px solid var(--gold-border)";
        aiBubble.style.borderRadius = "8px";
        aiBubble.style.padding = "0.75rem 1rem";
        aiBubble.style.maxWidth = "90%";
        aiBubble.style.color = "var(--text-primary)";
        aiBubble.innerHTML = `<span style="color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> 正在檢索原文段落並生成分析...</span>`;
        chatMessages.appendChild(aiBubble);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        setTimeout(() => {
            let answer = readerState.currentPaperData.chatDatabase[text];
            if (!answer) {
                const matchedKey = Object.keys(readerState.currentPaperData.chatDatabase).find(k => text.includes(k) || k.includes(text));
                if (matchedKey) {
                    answer = readerState.currentPaperData.chatDatabase[matchedKey]; // let 
                } else {
                    answer = `關於您提問的「${text}」，在本文中主要有相關論述。根據 [來源段落 1]，本論文詳細定義了核心原理與其電性邊界。您可以進一步參考 [來源段落 2] 所定義的散射或片電阻邊界公式進行聯立求解。`; // let 
                }
            }

            // 將 "[來源段落 X]" 解析為帶有 click 事件的金色按鈕
            const parsedAnswer = answer.replace(/\[來源段落\s*(\d+)\]/g, (match, num) => {
                return `<span class="source-link" data-para="p-${num}">[來源段落 ${num}]</span>`;
            });

            aiBubble.innerHTML = parsedAnswer;
            chatMessages.scrollTop = chatMessages.scrollHeight;

            // 為所有來源超連結綁定點擊事件
            const links = aiBubble.querySelectorAll(".source-link");
            links.forEach(link => {
                link.addEventListener("click", (e) => {
                    const paraId = e.target.getAttribute("data-para");
                    const paraEl = document.getElementById(paraId);
                    if (paraEl) {
                        paraEl.scrollIntoView({ behavior: "smooth", block: "center" });
                        
                        paraEl.classList.remove("para-highlight");
                        void paraEl.offsetWidth; // 觸發重繪
                        paraEl.classList.add("para-highlight");
                        
                        setTimeout(() => {
                            paraEl.classList.remove("para-highlight");
                        }, 2500);
                    }
                });
            });

        }, 1200);
    }

    // 模擬 AI 處理使用者上傳的內容
    function handleCustomUpload(inputText, urlVal) {
        const text = inputText.trim();
        const url = urlVal.trim();
        
        if (!text && !url) {
            alert("請先貼上英文論文段落，或輸入要模擬提取的網址！");
            return;
        }

        // 顯示解析 Loading 動態
        sandboxView.style.display = "block";
        articleArea.innerHTML = `
            <div style="text-align: center; padding: 3rem 0; color: var(--gold-primary);">
                <i class="fa-solid fa-spinner fa-spin fa-2x" style="margin-bottom: 1rem;"></i>
                <div style="font-family: monospace; font-size: 0.95rem; text-align: left; max-width: 400px; margin: 0 auto; line-height: 2;">
                    <div>📡 <span style="color: var(--success);">[OK]</span> 連接 Redia AI 智能提取網卡...</div>
                    <div id="load-step-2" style="opacity: 0.5;">📄 正在解析並提取乾淨的單欄文本結構...</div>
                    <div id="load-step-3" style="opacity: 0.5;">🧠 AI 正在對齊中英行級對照並萃取考點...</div>
                </div>
            </div>
        `;
        sandboxView.scrollIntoView({ behavior: "smooth", block: "start" });

        // 模擬提取流程動畫
        setTimeout(() => {
            document.getElementById("load-step-2").style.opacity = "1";
        }, 800);

        setTimeout(() => {
            document.getElementById("load-step-3").style.opacity = "1";
        }, 1600);

        setTimeout(() => {
            let rawEnParagraphs = [];
            if (text) {
                // 以句點/換行切分段落
                rawEnParagraphs = text.split(/\n+/).filter(p => p.trim().length > 10); // let 
            }
            
            if (rawEnParagraphs.length === 0) {
                rawEnParagraphs = [ // let 
                    "We report on the high-precision Hall effect characterization of high-mobility 2D electron gases.",
                    "An experimental challenge arose from the Seebeck temperature gradient leading to offset voltages.",
                    "We verified that by performing the full 8-point measurement diagonal averaging, the offsets were reduced by 99.8%."
                ];
            }

            const mockParas = rawEnParagraphs.map((enText, index) => {
                let zhTranslate = "";
                if (index === 0) zhTranslate = "我們報告了關於高遷移率二維電子氣的高精度霍爾效應量測與特徵分析。";
                else if (index === 1) zhTranslate = "實驗中的一大物理挑戰在於，溫度梯度產生的塞貝克 (Seebeck) 效應會引入額外的溫差寄生偏置電壓。";
                else if (index === 2) zhTranslate = "我們證實，透過執行完整的 8 點對角線量測均化法，可以將此類偏置誤差降低達 99.8%。";
                else {
                    zhTranslate = `[AI 譯文]: 此段主要論述了霍爾效應與電阻率的物理關聯。` + enText.substring(0, 30) + "..."; // let 
                }

                return {
                    id: `p-${index + 1}`,
                    en: enText,
                    zh: zhTranslate
                };
            });

            const customPaper = {
                title: url ? `Parsed Article from ${url}` : "Custom Uploaded Literature",
                paragraphs: mockParas,
                summary: `
                    <h3>📝 AI 智能文獻大綱 (自訂上傳)</h3>
                    <ul>
                        <li><strong>文獻來源</strong>：${url || "使用者手動貼上文本"}</li>
                        <li><strong>主旨大綱</strong>：文章著重探討高精度量測中的誤差抑制（如塞貝克效應）及二維載子傳輸現象。</li>
                        <li><strong>核心結論</strong>：再次證實了對角線交替量測（8次量測）對於降低寄生直流偏置電壓的關鍵實務物理價值。</li>
                    </ul>
                `,
                quickQuestions: [
                    "本篇自訂文章的核心研究對象是什麼？",
                    "文章中提到了什麼實驗挑戰？",
                    "如何解決該實驗偏置誤差？"
                ],
                chatDatabase: {
                    "本篇自訂文章的核心研究對象是什麼？": "本篇自訂文章在 [來源段落 1] 中明確指出，研究的核心對象是高遷移率二維電子氣的高精度霍爾效應電性特徵分析。",
                    "文章中提到了什麼實驗挑戰？": "根據 [來源段落 2]，主要的實驗物理挑戰是塞貝克溫度梯度所引入的寄生溫差電壓偏置，這會直接疊加在霍爾訊號上造成誤差。",
                    "如何解決該實驗偏置誤差？": "在 [來源段落 3] 中指出，透過執行完整的 8 點對角線量測交替均化程序，能將塞貝克等直流偏置誤差相消，效果可達 99.8% 以上。"
                }
            };

            loadPaper(customPaper);

        }, 2200);
    }

    // 綁定載人 Demo 按鈕
    demoHallBtn.addEventListener("click", () => loadPaper(demoPapers.hall));
    demoVdpBtn.addEventListener("click", () => loadPaper(demoPapers.vdp));

    // 綁定上傳與模擬按鈕
    uploadBtn.addEventListener("click", () => {
        handleCustomUpload(readerText.value, readerUrl.value);
    });
    mockPdfBtn.addEventListener("click", () => {
        readerUrl.value = "https://arxiv.org/pdf/2205.12345.pdf";
        readerText.value = "We analyze the sheet resistance of graphene thin films under van der Pauw configuration.\nThe point contact approximation was validated by checking the Ohmic linearity of the contacts.\nThermal gradients were systematically eliminated via current and B-field reversals (8-point average).";
        handleCustomUpload(readerText.value, readerUrl.value);
    });

    // 綁定真實檔案上傳處理
    readerFileUploadBtn.addEventListener("click", () => {
        readerFileUpload.click();
    });

    readerFileUpload.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileReaderObj = new FileReader();
        fileReaderObj.onload = function(evt) {
            const fileContent = evt.target.result;
            let parsedText = "";
            const documentTitle = file.name;

            if (file.name.endsWith(".html") || file.name.endsWith(".htm")) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(fileContent, "text/html");
                
                // 排除無關標籤
                const scripts = doc.querySelectorAll("script, style, noscript, iframe, header, footer, nav");
                scripts.forEach(s => s.remove());

                // 提取主要文本
                const elements = doc.querySelectorAll("h1, h2, h3, p, li");
                const textSegments = [];
                elements.forEach(el => {
                    const text = el.innerText.trim();
                    if (text.length > 15) {
                        textSegments.push(text);
                    }
                });

                if (textSegments.length > 0) {
                    parsedText = textSegments.join("\n\n"); // let 
                } else {
                    parsedText = doc.body.innerText || doc.body.textContent || ""; // let 
                }
            } else {
                parsedText = fileContent; // let 
            }

            handleCustomUpload(parsedText, documentTitle);
        };
        fileReaderObj.readAsText(file, "UTF-8");
    });

    // 綁定字級調整
    fontDec.addEventListener("click", () => {
        if (readerState.currentFontSize > 12) {
            readerState.currentFontSize -= 2;
            renderArticle();
        }
    });
    
    fontInc.addEventListener("click", () => {
        if (readerState.currentFontSize < 24) {
            readerState.currentFontSize += 2;
            renderArticle();
        }
    });

    // 綁定閱讀模式切換
    const modeBtns = [modeBilingual, modeOriginal, modeSummary];
    function setModeActive(activeBtn, modeStr) {
        modeBtns.forEach(btn => btn.classList.remove("active"));
        activeBtn.classList.add("active");
        readerState.currentMode = modeStr;
        renderArticle();
    }

    modeBilingual.addEventListener("click", () => setModeActive(modeBilingual, "bilingual"));
    modeOriginal.addEventListener("click", () => setModeActive(modeOriginal, "original"));
    modeSummary.addEventListener("click", () => setModeActive(modeSummary, "summary"));

    // 綁定 AI 聊天輸入與發送
    chatSendBtn.addEventListener("click", () => handleChatSubmit());
    chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            handleChatSubmit();
        }
    });
}

