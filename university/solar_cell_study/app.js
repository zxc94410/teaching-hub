/* ==========================================================================
   太陽能電池教學網頁 核心互動 JavaScript
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    // 初始化各模組
    initNavigation();
    initScrollNavbar();
    initPceCalculator();
    initEqeCalculator();
    initHallCalculator();
    initQuiz();
    initZoomModal();
    initTableZoom();
});

/* ==========================================================================
   1. 導航與滾動監聽 (Navigation & Scroll Spy)
   ========================================================================== */
function initNavigation() {
    const navItems = document.querySelectorAll(".navbar-item");
    const sections = document.querySelectorAll("section");

    // 點擊導航欄平滑跳轉
    navItems.forEach(item => {
        const link = item.querySelector("a");
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const targetId = link.getAttribute("href");
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: "smooth" });
            }
        });
    });

    // 滾動監聽自動標註 active
    window.addEventListener("scroll", () => {
        let currentSectionId = "";
        const scrollPosition = window.scrollY + 100; // 偏移量

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                currentSectionId = "#" + section.getAttribute("id"); // let 
            }
        });

        navItems.forEach(item => {
            const link = item.querySelector("a");
            if (link.getAttribute("href") === currentSectionId) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });
    });
}

/* ==========================================================================
   1.5 手機版頂部導航欄滑動隱藏/顯示 (Mobile Scroll Navbar)
   ========================================================================== */
function initScrollNavbar() {
    const navbar = document.querySelector(".top-navbar");
    if (!navbar) return;

    let lastScrollY = window.scrollY; // let 
    
    window.addEventListener("scroll", () => {
        const currentScrollY = window.scrollY; // let 
        
        // 只有在手機版（螢幕寬度 <= 768px）時才生效
        if (window.innerWidth <= 768) {
            if (currentScrollY <= 50) {
                // 在最頂部時強制顯示，防止邊界反彈抖動
                navbar.classList.remove("hide-navbar");
            } else if (currentScrollY > lastScrollY) {
                // 往下滑動螢幕（頁面向下滾動）-> 隱藏選單
                navbar.classList.add("hide-navbar");
            } else {
                // 往上滑動螢幕（頁面向上滾動）-> 顯示選單
                navbar.classList.remove("hide-navbar");
            }
        } else {
            // 桌機版確保沒有隱藏 class
            navbar.classList.remove("hide-navbar");
        }
        
        lastScrollY = currentScrollY; // let 
    }, { passive: true });
}

/* ==========================================================================
   2. PCE / FF 計算機與 I-V 曲線繪製 (Canvas)
   ========================================================================== */
function initPceCalculator() {
    const vocInput = document.getElementById("pce-voc");
    const jscInput = document.getElementById("pce-jsc");
    const vmpInput = document.getElementById("pce-vmp");
    const jmpInput = document.getElementById("pce-jmp");
    const pinInput = document.getElementById("pce-pin");
    const pceResetBtn = document.getElementById("pce-reset-btn");

    const ffVal = document.getElementById("res-ff");
    const pceVal = document.getElementById("res-pce");
    const pmaxVal = document.getElementById("res-pmax");

    const canvas = document.getElementById("iv-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // 8 像素去抖動寬高調整與高 DPI 縮放
    let prevWidth = 0;
    let prevHeight = 0;

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const targetWidth = rect.width * dpr;
        const targetHeight = 280 * dpr; // 固定高度比例

        if (Math.abs(canvas.width - targetWidth) > 8 || Math.abs(canvas.height - targetHeight) > 8) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            // 重新繪製 I-V 曲線
            updateIVDrawing();
        }
    }

    // 當數值改變時計算與繪圖，並即時更新滑桿旁顯示的數值標籤
    function performCalculation() {
        const voc = parseFloat(vocInput.value) || 0.8;
        const jsc = parseFloat(jscInput.value) || 22.0; // mA/cm2
        const vmp = parseFloat(vmpInput.value) || 0.66;
        const jmp = parseFloat(jmpInput.value) || 19.5; // mA/cm2
        const pin = parseFloat(pinInput.value) || 100.0; // mW/cm2

        // 即時連動更新滑桿上的數值標籤
        document.getElementById("pce-voc-val").textContent = voc.toFixed(2) + " V";
        document.getElementById("pce-jsc-val").textContent = jsc.toFixed(1) + " mA/cm²";
        document.getElementById("pce-vmp-val").textContent = vmp.toFixed(2) + " V";
        document.getElementById("pce-jmp-val").textContent = jmp.toFixed(1) + " mA/cm²";
        document.getElementById("pce-pin-val").textContent = pin.toFixed(1) + " mW/cm²";

        // Pmax = Vmp * Jmp
        const pmax = vmp * jmp; // mW/cm2
        // FF = (Vmp * Jmp) / (Voc * Jsc)
        let ff = 0; // let 
        if (voc * jsc > 0) {
            ff = pmax / (voc * jsc); // let 
        }
        // PCE = Pmax / Pin * 100%
        let pce = 0; // let 
        if (pin > 0) {
            pce = (pmax / pin) * 100; // let 
        }

        // 渲染結果到 DOM
        ffVal.textContent = ff.toFixed(4);
        pceVal.textContent = pce.toFixed(2) + " %";
        pmaxVal.textContent = pmax.toFixed(2) + " mW/cm²";

        updateIVDrawing();
    }

    function updateIVDrawing() {
        const voc = parseFloat(vocInput.value) || 0.8;
        const jsc = parseFloat(jscInput.value) || 22.0;
        const vmp = parseFloat(vmpInput.value) || 0.66;
        const jmp = parseFloat(jmpInput.value) || 19.5;

        const dpr = window.devicePixelRatio || 1;
        const width = canvas.width;
        const height = canvas.height;

        // 清除畫布，防止殘留 (Linter Rule)
        ctx.clearRect(0, 0, width, height);

        // 繪製背景網格與座標軸
        const padding = 45 * dpr;
        const graphWidth = width - padding * 2;
        const graphHeight = height - padding * 2;

        ctx.strokeStyle = "rgba(197, 168, 107, 0.1)";
        ctx.lineWidth = 1 * dpr;

        // 畫網格線
        const gridCols = 5;
        const gridRows = 4;
        let col = 0;
        let row = 0;
        for (col = 0; col <= gridCols; col++) {
            const x = padding + (col / gridCols) * graphWidth;
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, height - padding);
            ctx.stroke();
        }
        for (row = 0; row <= gridRows; row++) {
            const y = padding + (row / gridRows) * graphHeight;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }

        // 畫座標軸
        ctx.strokeStyle = "#c5a86b";
        ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();

        // 座標軸標籤
        ctx.fillStyle = "#94a3b8";
        ctx.font = `${10 * dpr}px 'Outfit'`;
        ctx.textAlign = "center";
        ctx.fillText("Voltage V (V)", width / 2, height - 10 * dpr);

        ctx.save();
        ctx.translate(15 * dpr, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText("Current Density J (mA/cm²)", 0, 0);
        ctx.restore();

        // 刻度數值
        ctx.textAlign = "right";
        ctx.fillText("0", padding - 5 * dpr, height - padding + 4 * dpr);
        ctx.fillText(jsc.toFixed(1), padding - 5 * dpr, padding + 4 * dpr);

        ctx.textAlign = "center";
        ctx.fillText(voc.toFixed(2), padding + graphWidth, height - padding + 18 * dpr);

        // 繪製 I-V 曲線 (使用簡單二極體公式模擬曲線)
        ctx.strokeStyle = "#c5a86b";
        ctx.lineWidth = 3 * dpr;
        ctx.beginPath();

        const points = 100;
        let i = 0;
        for (i = 0; i <= points; i++) {
            const v = (i / points) * voc * 1.05; // 稍微畫超過 Voc
            let j = 0; // let 
            if (v <= voc) {
                // 混合線性與高階指數以擬合 (Vmp, Jmp)
                const ratio = v / voc;
                const p = Math.log(1 - jmp / jsc) / Math.log(vmp / voc);
                j = jsc * (1 - Math.pow(ratio, Math.max(2, p || 4))); // let 
            } else {
                // 超過 Voc，電流迅速變為負值
                const diff = (v - voc) / (voc * 0.05);
                j = -jsc * 0.5 * Math.pow(diff, 2); // let 
            }

            // 映射到畫布座標
            const x = padding + (v / (voc * 1.1)) * graphWidth;
            const y = padding + graphHeight - (j / (jsc * 1.1)) * graphHeight;

            // 限制在畫布範圍內
            if (x >= padding && x <= width - padding && y >= padding && y <= height - padding) {
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
        }
        ctx.stroke();

        // 標註最大功率點 (MPP)
        const mppX = padding + (vmp / (voc * 1.1)) * graphWidth;
        const mppY = padding + graphHeight - (jmp / (jsc * 1.1)) * graphHeight;

        ctx.fillStyle = "#10b981";
        ctx.beginPath();
        ctx.arc(mppX, mppY, 6 * dpr, 0, Math.PI * 2);
        ctx.fill();

        // 繪製 MPP 圈線提示
        ctx.strokeStyle = "rgba(16, 185, 129, 0.6)";
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        ctx.arc(mppX, mppY, 9 * dpr, 0, Math.PI * 2);
        ctx.stroke();

        // 標註 Voc 拖拽點 (X軸交點)
        const vocX = padding + (voc / (voc * 1.1)) * graphWidth;
        const vocY = height - padding;

        ctx.fillStyle = "#c5a86b";
        ctx.beginPath();
        ctx.arc(vocX, vocY, 6 * dpr, 0, Math.PI * 2);
        ctx.fill();

        // 繪製 Voc 圈線提示
        ctx.strokeStyle = "rgba(197, 168, 107, 0.6)";
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        ctx.arc(vocX, vocY, 9 * dpr, 0, Math.PI * 2);
        ctx.stroke();

        // 標註 Jsc 拖拽點 (Y軸交點)
        const jscX = padding;
        const jscY = padding + graphHeight - (jsc / (jsc * 1.1)) * graphHeight;

        ctx.fillStyle = "#c5a86b";
        ctx.beginPath();
        ctx.arc(jscX, jscY, 6 * dpr, 0, Math.PI * 2);
        ctx.fill();

        // 繪製 Jsc 圈線提示
        ctx.strokeStyle = "rgba(197, 168, 107, 0.6)";
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        ctx.arc(jscX, jscY, 9 * dpr, 0, Math.PI * 2);
        ctx.stroke();

        // 繪製 Pmax 虛線矩形
        ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
        ctx.lineWidth = 1 * dpr;
        ctx.setLineDash([4 * dpr, 4 * dpr]);
        ctx.beginPath();
        ctx.moveTo(padding, mppY);
        ctx.lineTo(mppX, mppY);
        ctx.lineTo(mppX, height - padding);
        ctx.stroke();
        ctx.setLineDash([]); // 恢復實線

        // 文字標註 MPP
        ctx.fillStyle = "#10b981";
        ctx.font = `bold ${9 * dpr}px 'Outfit'`;
        ctx.textAlign = "left";
        ctx.fillText(` MPP (Vmp: ${vmp}V, Jmp: ${jmp}mA)`, mppX + 8 * dpr, mppY - 4 * dpr);
    }

    // 拖曳圖形控制點邏輯
    let activeDragPoint = null;

    canvas.addEventListener("pointerdown", (e) => {
        const dpr = window.devicePixelRatio || 1;
        const padding = 45 * dpr;
        const graphWidth = canvas.width - padding * 2;
        const graphHeight = canvas.height - padding * 2;

        const voc = parseFloat(vocInput.value) || 0.8;
        const jsc = parseFloat(jscInput.value) || 22.0;
        const vmp = parseFloat(vmpInput.value) || 0.66;
        const jmp = parseFloat(jmpInput.value) || 19.5;

        const clickX = e.offsetX * dpr;
        const clickY = e.offsetY * dpr;

        const mppX = padding + (vmp / (voc * 1.1)) * graphWidth;
        const mppY = padding + graphHeight - (jmp / (jsc * 1.1)) * graphHeight;

        const vocX = padding + (voc / (voc * 1.1)) * graphWidth;
        const vocY = canvas.height - padding;

        const jscX = padding;
        const jscY = padding + graphHeight - (jsc / (jsc * 1.1)) * graphHeight;

        const threshold = 18 * dpr;

        if (Math.hypot(clickX - mppX, clickY - mppY) < threshold) {
            activeDragPoint = "mpp"; // let 
        } else if (Math.hypot(clickX - vocX, clickY - vocY) < threshold) {
            activeDragPoint = "voc"; // let 
        } else if (Math.hypot(clickX - jscX, clickY - jscY) < threshold) {
            activeDragPoint = "jsc"; // let 
        }

        if (activeDragPoint) {
            canvas.setPointerCapture(e.pointerId);
            e.preventDefault();
        }
    });

    canvas.addEventListener("pointermove", (e) => {
        const dpr = window.devicePixelRatio || 1;
        const padding = 45 * dpr;
        const graphWidth = canvas.width - padding * 2;
        const graphHeight = canvas.height - padding * 2;

        const voc = parseFloat(vocInput.value) || 0.8;
        const jsc = parseFloat(jscInput.value) || 22.0;
        const vmp = parseFloat(vmpInput.value) || 0.66;
        const jmp = parseFloat(jmpInput.value) || 19.5;

        const clickX = e.offsetX * dpr;
        const clickY = e.offsetY * dpr;

        if (activeDragPoint) {
            const xRatio = Math.max(0, Math.min(1, (clickX - padding) / graphWidth));
            const yRatio = Math.max(0, Math.min(1, (padding + graphHeight - clickY) / graphHeight));

            if (activeDragPoint === "voc") {
                const newVoc = Math.max(0.30, Math.min(1.50, xRatio * voc * 1.1));
                vocInput.value = newVoc.toFixed(2);
                if (vmp >= newVoc) {
                    vmpInput.value = (newVoc * 0.8).toFixed(2);
                }
            } else if (activeDragPoint === "jsc") {
                const newJsc = Math.max(5.0, Math.min(40.0, yRatio * jsc * 1.1));
                jscInput.value = newJsc.toFixed(1);
                if (jmp >= newJsc) {
                    jmpInput.value = (newJsc * 0.85).toFixed(1);
                }
            } else if (activeDragPoint === "mpp") {
                const newVmp = Math.max(0.20, Math.min(voc - 0.02, xRatio * voc * 1.1));
                const newJmp = Math.max(4.0, Math.min(jsc - 0.2, yRatio * jsc * 1.1));
                vmpInput.value = newVmp.toFixed(2);
                jmpInput.value = newJmp.toFixed(1);
            }
            performCalculation();
            e.preventDefault();
        } else {
            // Hover 游標提示邏輯
            const mppX = padding + (vmp / (voc * 1.1)) * graphWidth;
            const mppY = padding + graphHeight - (jmp / (jsc * 1.1)) * graphHeight;

            const vocX = padding + (voc / (voc * 1.1)) * graphWidth;
            const vocY = canvas.height - padding;

            const jscX = padding;
            const jscY = padding + graphHeight - (jsc / (jsc * 1.1)) * graphHeight;

            const threshold = 12 * dpr;

            if (Math.hypot(clickX - mppX, clickY - mppY) < threshold ||
                Math.hypot(clickX - vocX, clickY - vocY) < threshold ||
                Math.hypot(clickX - jscX, clickY - jscY) < threshold) {
                canvas.style.cursor = "pointer";
            } else {
                canvas.style.cursor = "default";
            }
        }
    });

    const releaseCapture = (e) => {
        if (activeDragPoint) {
            if (canvas.hasPointerCapture && e && e.pointerId !== undefined) {
                try {
                    canvas.releasePointerCapture(e.pointerId);
                } catch (err) {
                    // 忽略捕獲釋放錯誤
                }
            }
            activeDragPoint = null; // let 
            performCalculation();
        }
    };

    canvas.addEventListener("pointerup", releaseCapture);
    canvas.addEventListener("pointercancel", releaseCapture);

    // 監聽拉桿輸入事件 (即時連動計算)
    [vocInput, jscInput, vmpInput, jmpInput, pinInput].forEach(inp => {
        if (inp) {
            inp.addEventListener("input", performCalculation);
        }
    });

    if (pceResetBtn) {
        pceResetBtn.addEventListener("click", () => {
            vocInput.value = "0.80";
            jscInput.value = "22.0";
            vmpInput.value = "0.66";
            jmpInput.value = "19.5";
            pinInput.value = "100.0";
            performCalculation();
        });
    }

    window.addEventListener("resize", resizeCanvas);

    // 初始執行一次
    performCalculation();
    resizeCanvas();
}

/* ==========================================================================
   3. EQE / IPCE 百分比計算機 (EQE Calculator)
   ========================================================================== */
/* ==========================================================================
   3. EQE / IPCE 百分比計算機 & 動態光譜定位 (EQE Calculator & Canvas)
   ========================================================================== */
function initEqeCalculator() {
    const jscInput = document.getElementById("eqe-jsc");
    const pinInput = document.getElementById("eqe-pin");
    const wlInput = document.getElementById("eqe-wl");
    const eqeVal = document.getElementById("res-eqe");
    const eqeResetBtn = document.getElementById("eqe-reset-btn");
    const canvas = document.getElementById("eqe-canvas");

    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const targetWidth = rect.width * dpr;
        const targetHeight = 180 * dpr; // 設定固定展示高度

        if (Math.abs(canvas.width - targetWidth) > 8 || Math.abs(canvas.height - targetHeight) > 8) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            updateEqeDrawing();
        }
    }

    function calculateEqe() {
        const jsc = parseFloat(jscInput.value) || 0.045; // mA/cm²
        const pin = parseFloat(pinInput.value) || 0.12;  // mW/cm²
        const wl = parseFloat(wlInput.value) || 550;    // nm

        // 即時連動更新滑桿上的數值標籤
        document.getElementById("eqe-jsc-val").textContent = jsc.toFixed(3) + " mA/cm²";
        document.getElementById("eqe-pin-val").textContent = pin.toFixed(2) + " mW/cm²";
        document.getElementById("eqe-wl-val").textContent = wl + " nm";

        let eqe = 0; // let 
        if (pin * wl > 0) {
            // EQE% = 1240 * Jsc(mA/cm²) / (Pin(mW/cm²) * wl(nm)) * 100%
            eqe = (1240 * jsc) / (pin * wl) * 100; // let 
        }

        eqeVal.textContent = eqe.toFixed(2) + " %";

        // 更新繪圖
        updateEqeDrawing(eqe, wl);
    }

    function updateEqeDrawing(currentEqe = 0, currentWl = 550) {
        const dpr = window.devicePixelRatio || 1;
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        const padding = 35 * dpr;
        const graphWidth = width - padding * 2;
        const graphHeight = height - padding * 2;

        // 畫網格與座標軸
        ctx.strokeStyle = "rgba(197, 168, 107, 0.08)";
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        for (let col = 0; col <= 5; col++) {
            const x = padding + (col / 5) * graphWidth;
            ctx.moveTo(x, padding);
            ctx.lineTo(x, height - padding);
        }
        for (let row = 0; row <= 4; row++) {
            const y = padding + (row / 4) * graphHeight;
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
        }
        ctx.stroke();

        ctx.strokeStyle = "#c5a86b";
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();

        // 標記刻度文字
        ctx.fillStyle = "#94a3b8";
        ctx.font = `${8 * dpr}px 'Outfit'`;
        ctx.textAlign = "center";
        ctx.fillText("300", padding, height - padding + 12 * dpr);
        ctx.fillText("700", padding + (400 / 800) * graphWidth, height - padding + 12 * dpr);
        ctx.fillText("1100", padding + graphWidth, height - padding + 12 * dpr);

        ctx.textAlign = "right";
        ctx.fillText("100%", padding - 5 * dpr, padding + 4 * dpr);
        ctx.fillText("0%", padding - 5 * dpr, height - padding + 4 * dpr);

        // 繪製一條典型的 EQE 模擬參考光譜曲線 (300nm 到 1100nm)
        ctx.strokeStyle = "rgba(197, 168, 107, 0.4)";
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        for (let w = 300; w <= 1100; w += 10) {
            let refEqe = 0; // let 
            if (w >= 320 && w < 380) {
                refEqe = 80 * (w - 320) / 60; // let 
            } else if (w >= 380 && w <= 850) {
                refEqe = 80 + 8 * Math.sin(((w - 380) / 470) * Math.PI); // let 
            } else if (w > 850 && w <= 1100) {
                refEqe = 88 * Math.pow(1 - (w - 850) / 250, 1.5); // let 
            }
            const x = padding + ((w - 300) / 800) * graphWidth;
            const y = padding + graphHeight - (refEqe / 100) * graphHeight;
            if (w === 300) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // 標記當前選取波長處的計算點
        const dotX = padding + ((currentWl - 300) / 800) * graphWidth;
        const dotY = padding + graphHeight - (Math.min(100, currentEqe) / 100) * graphHeight;

        // 繪製十字虛線
        ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
        ctx.lineWidth = 1 * dpr;
        ctx.setLineDash([3 * dpr, 3 * dpr]);
        ctx.beginPath();
        ctx.moveTo(padding, dotY);
        ctx.lineTo(dotX, dotY);
        ctx.lineTo(dotX, height - padding);
        ctx.stroke();
        ctx.setLineDash([]); // 恢復實線

        // 繪製發光點
        ctx.fillStyle = "#10b981";
        ctx.beginPath();
        ctx.arc(dotX, dotY, 5 * dpr, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "rgba(16, 185, 129, 0.5)";
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 8 * dpr, 0, Math.PI * 2);
        ctx.stroke();

        // 警示文字
        if (currentEqe > 100) {
            ctx.fillStyle = "#ef4444";
            ctx.font = `bold ${8 * dpr}px 'Outfit'`;
            ctx.textAlign = "left";
            ctx.fillText("⚠️ EQE > 100% 物理上不合理", padding + 10 * dpr, padding + 15 * dpr);
        }
    }

    [jscInput, pinInput, wlInput].forEach(inp => {
        if (inp) inp.addEventListener("input", calculateEqe);
    });

    if (eqeResetBtn) {
        eqeResetBtn.addEventListener("click", () => {
            jscInput.value = "0.045";
            pinInput.value = "0.12";
            wlInput.value = "550";
            calculateEqe();
        });
    }

    window.addEventListener("resize", resizeCanvas);
    calculateEqe();
    resizeCanvas();
}

/* ==========================================================================
   4. Van der Pauw 霍爾量測受力分析儀 (Hall Calculator & Lorentz Canvas)
   ========================================================================== */
function initHallCalculator() {
    const currentInput = document.getElementById("hall-current");
    const fieldInput = document.getElementById("hall-field");
    const vsumInput = document.getElementById("hall-vsum");
    const thickInput = document.getElementById("hall-thick");
    const rsInput = document.getElementById("hall-rs");
    const hallResetBtn = document.getElementById("hall-reset-btn");

    const typeVal = document.getElementById("res-hall-type");
    const densitySheetVal = document.getElementById("res-hall-density-sheet");
    const densityBulkVal = document.getElementById("res-hall-density-bulk");
    const mobilityVal = document.getElementById("res-hall-mobility");
    const canvas = document.getElementById("hall-canvas");

    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const targetWidth = rect.width * dpr;
        const targetHeight = 180 * dpr;

        if (Math.abs(canvas.width - targetWidth) > 8 || Math.abs(canvas.height - targetHeight) > 8) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            updateHallDrawing();
        }
    }

    function calculateHall() {
        const current_mA = parseFloat(currentInput.value) || 1.0; // mA
        const field_G = parseFloat(fieldInput.value) || 5000;    // Gauss
        const vsum_mV = parseFloat(vsumInput.value) || 62.0;    // mV
        const thick_nm = parseFloat(thickInput.value) || 80.0;  // nm
        const rs_ohm = parseFloat(rsInput.value) || 450.0;      // ohm/sq

        // 即時連動更新滑桿上的數值標籤
        document.getElementById("hall-current-val").textContent = current_mA.toFixed(1) + " mA";
        document.getElementById("hall-field-val").textContent = field_G.toFixed(0) + " G";
        document.getElementById("hall-vsum-val").textContent = vsum_mV.toFixed(0) + " mV";
        document.getElementById("hall-thick-val").textContent = thick_nm.toFixed(0) + " nm";
        document.getElementById("hall-rs-val").textContent = rs_ohm.toFixed(0) + " Ω/sq";

        const q = 1.602e-19; // 電子電荷

        // 1. 判定載子型態
        let carrierType = "無法判定"; // let 
        let isPType = true; // let 
        if (vsum_mV > 0) {
            carrierType = "P-type (電洞導電)"; // let 
            typeVal.style.color = "#c5a86b"; // 金色代表電洞
            isPType = true; // let 
        } else if (vsum_mV < 0) {
            carrierType = "N-type (電子導電)"; // let 
            typeVal.style.color = "#10b981"; // 綠色代表電子
            isPType = false; // let 
        } else {
            typeVal.style.color = "#94a3b8";
        }

        // 2. 計算片載子密度 Sheet Carrier Density (cm-2)
        let nsSheet = 0; // let 
        const absVsum = Math.abs(vsum_mV);
        if (absVsum > 0) {
            nsSheet = (4e-8 * current_mA * Math.abs(field_G)) / (q * absVsum); // let 
        }

        // 3. 計算體載子密度 Bulk Carrier Density (cm-3)
        const thickCm = thick_nm * 1e-7;
        let nsBulk = 0; // let 
        if (thickCm > 0) {
            nsBulk = nsSheet / thickCm; // let 
        }

        // 4. 計算霍爾遷移率 Hall Mobility (cm²/V·s)
        let mobility = 0; // let 
        if (nsSheet * rs_ohm > 0) {
            mobility = 1 / (q * nsSheet * rs_ohm); // let 
        }

        // 渲染結果
        typeVal.textContent = carrierType;
        densitySheetVal.textContent = nsSheet.toExponential(4) + " cm⁻²";
        densityBulkVal.textContent = nsBulk.toExponential(4) + " cm⁻³";
        mobilityVal.textContent = mobility.toFixed(2) + " cm² / V·s";

        // 更新受力平衡繪圖
        updateHallDrawing(isPType, field_G, vsum_mV);
    }

    function updateHallDrawing(isPType = true, field = 5000, vsum = 62) {
        const dpr = window.devicePixelRatio || 1;
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        const centerX = width / 2;
        const centerY = height / 2;
        const size = 45 * dpr; // 樣品框大小

        // 1. 繪製 van der Pauw cloverleaf 樣品背景 (暗灰色發光)
        ctx.fillStyle = "rgba(13, 15, 23, 0.9)";
        ctx.strokeStyle = "rgba(197, 168, 107, 0.3)";
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        ctx.rect(centerX - size, centerY - size, size * 2, size * 2);
        ctx.fill();
        ctx.stroke();

        // 2. 標註 4 個角電極點
        const offset = size + 5 * dpr;
        ctx.fillStyle = "#c5a86b";
        ctx.font = `bold ${8 * dpr}px 'Outfit'`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillText("1 (I+)", centerX, centerY - offset);
        ctx.fillText("3 (I-)", centerX, centerY + offset);
        ctx.fillText("4 (V+)", centerX - offset, centerY);
        ctx.fillText("2 (V-)", centerX + offset, centerY);

        // 3. 繪製輸入電流方向 (1 -> 3, 向下)
        ctx.strokeStyle = "rgba(197, 168, 107, 0.4)";
        ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - size + 10 * dpr);
        ctx.lineTo(centerX, centerY + size - 15 * dpr);
        ctx.stroke();
        // 箭頭
        ctx.fillStyle = "rgba(197, 168, 107, 0.6)";
        ctx.beginPath();
        ctx.moveTo(centerX - 3 * dpr, centerY + size - 18 * dpr);
        ctx.lineTo(centerX + 3 * dpr, centerY + size - 18 * dpr);
        ctx.lineTo(centerX, centerY + size - 12 * dpr);
        ctx.fill();

        // 4. 繪製外加磁場 B 的標記
        if (field !== 0) {
            ctx.fillStyle = "rgba(197, 168, 107, 0.18)";
            ctx.font = `${9 * dpr}px 'Outfit'`;
            ctx.textAlign = "center";
            const points = [
                { x: centerX - 22 * dpr, y: centerY - 22 * dpr },
                { x: centerX + 22 * dpr, y: centerY - 22 * dpr },
                { x: centerX - 22 * dpr, y: centerY + 22 * dpr },
                { x: centerX + 22 * dpr, y: centerY + 22 * dpr }
            ];
            points.forEach(pt => {
                ctx.fillText(field > 0 ? "✕" : "⊙", pt.x, pt.y);
            });
            ctx.fillStyle = "#dfc89a";
            ctx.fillText(field > 0 ? "B (In)" : "B (Out)", centerX - offset + 15 * dpr, centerY - size + 12 * dpr);
        }

        // 5. 繪製核心載子受力分析
        if (vsum !== 0 && field !== 0) {
            ctx.fillStyle = isPType ? "#c5a86b" : "#10b981";
            ctx.beginPath();
            ctx.arc(centerX, centerY, 9 * dpr, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#090a0f";
            ctx.font = `bold ${9 * dpr}px 'Outfit'`;
            ctx.fillText(isPType ? "+" : "-", centerX, centerY);

            const speedY = isPType ? 22 * dpr : -22 * dpr;
            ctx.strokeStyle = "#94a3b8";
            ctx.lineWidth = 1.5 * dpr;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(centerX, centerY + speedY);
            ctx.stroke();
            ctx.fillStyle = "#94a3b8";
            ctx.beginPath();
            if (isPType) {
                ctx.moveTo(centerX - 3 * dpr, centerY + speedY - 3 * dpr);
                ctx.lineTo(centerX + 3 * dpr, centerY + speedY - 3 * dpr);
                ctx.lineTo(centerX, centerY + speedY);
            } else {
                ctx.moveTo(centerX - 3 * dpr, centerY + speedY + 3 * dpr);
                ctx.lineTo(centerX + 3 * dpr, centerY + speedY + 3 * dpr);
                ctx.lineTo(centerX, centerY + speedY);
            }
            ctx.fill();
            ctx.font = `${6 * dpr}px 'Outfit'`;
            ctx.fillText("v", centerX + 5 * dpr, centerY + speedY / 2);

            const forceDir = field > 0 ? 1 : -1;
            const forceX = centerX + 26 * dpr * forceDir;

            ctx.strokeStyle = "#c5a86b";
            ctx.lineWidth = 2 * dpr;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(forceX, centerY);
            ctx.stroke();
            ctx.fillStyle = "#c5a86b";
            ctx.beginPath();
            ctx.moveTo(forceX - 3 * dpr * forceDir, centerY - 3 * dpr);
            ctx.lineTo(forceX - 3 * dpr * forceDir, centerY + 3 * dpr);
            ctx.lineTo(forceX, centerY);
            ctx.fill();
            ctx.font = `${7 * dpr}px 'Outfit'`;
            ctx.fillText("FB", forceX, centerY - 7 * dpr);

            const electricX = centerX - 26 * dpr * forceDir;
            ctx.strokeStyle = "#10b981";
            ctx.lineWidth = 1.5 * dpr;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(electricX, centerY);
            ctx.stroke();
            ctx.fillStyle = "#10b981";
            ctx.beginPath();
            ctx.moveTo(electricX + 3 * dpr * forceDir, centerY - 3 * dpr);
            ctx.lineTo(electricX + 3 * dpr * forceDir, centerY + 3 * dpr);
            ctx.lineTo(electricX, centerY);
            ctx.fill();
            ctx.fillText("FE", electricX, centerY - 7 * dpr);

            ctx.fillStyle = isPType ? "#c5a86b" : "#10b981";
            ctx.font = `bold ${8 * dpr}px 'Outfit'`;
            const plusStr = isPType ? "++" : "--";
            const minusStr = isPType ? "--" : "++";
            
            if (forceDir > 0) {
                ctx.fillText(plusStr, centerX + size - 8 * dpr, centerY);
                ctx.fillText(minusStr, centerX - size + 8 * dpr, centerY);
            } else {
                ctx.fillText(plusStr, centerX - size + 8 * dpr, centerY);
                ctx.fillText(minusStr, centerX + size - 8 * dpr, centerY);
            }
        }
    }

    [currentInput, fieldInput, vsumInput, thickInput, rsInput].forEach(inp => {
        if (inp) inp.addEventListener("input", calculateHall);
    });

    if (hallResetBtn) {
        hallResetBtn.addEventListener("click", () => {
            currentInput.value = "1.0";
            fieldInput.value = "5000";
            vsumInput.value = "62";
            thickInput.value = "80";
            rsInput.value = "450";
            calculateHall();
        });
    }

    window.addEventListener("resize", resizeCanvas);
    calculateHall();
    resizeCanvas();
}

/* ==========================================================================
   5. 模擬考場互動問答 (Quiz System)
   ========================================================================== */
function initQuiz() {
    // 10 題針對講義與實驗的精選考試模擬題
    const quizQuestions = [
        {
            question: "根據最新版的太陽光模擬器分級標準 (IEC 60904-9:2020)，所謂的「AAA 級」是指哪三項指標皆符合 A 級標準？",
            options: [
                "光電轉換效率、光強均勻度、時間穩定度",
                "光譜匹配度、空間不均勻度、時間穩定度",
                "光譜匹配度、溫度均勻度、光源對焦度",
                "外部量子效率、開路電壓、填充因子"
            ],
            correctIndex: 1,
            explanation: "最新的 IEC 60904-9 模擬器標準中，AAA 分級評估的三大關鍵指標為：1. 光譜匹配度 (Spectral Match)；2. 空間不均勻度 (Spatial Non-Uniformity)；3. 時間穩定度 (Temporal Instability)。"
        },
        {
            question: "當太陽天頂角 (Zenith angle) θ 為 48.2° 時，其對應的大氣質量 (Air Mass, AM) 係數最接近以下何值？",
            options: [
                "AM 1.0",
                "AM 1.5",
                "AM 2.0",
                "AM 0"
            ],
            correctIndex: 1,
            explanation: "大氣質量係數計算公式為 $AM \\approx 1 / \\cos\\theta$。當 $\\theta = 48.2^\\circ$ 時，$\\cos 48.2^\\circ \\approx 0.666$，其倒數即為 $1.5$，故為 AM 1.5（此為中緯度地區的年平均光譜標準）。"
        },
        {
            question: "當太陽能電池的工作溫度升高時，對其輸出電氣特性的影響為何？",
            options: [
                "開路電壓 Voc 顯著下降，短路電流 Isc 略微上升，整體效率 PCE 下降",
                "開路電壓 Voc 上升，短路電流 Isc 顯著下降，整體效率 PCE 上升",
                "開路電壓 Voc 與短路電流 Isc 皆不受溫度影響，只有填充因子 FF 下降",
                "開路電壓 Voc 與短路電流 Isc 皆大幅上升，整體效率 PCE 上升"
            ],
            correctIndex: 0,
            explanation: "溫度上升會使半導體材料的能隙 (Band Gap) 變窄，導致開路電壓 $V_{OC}$ 顯著下降（溫度係數通常為負值）；而短路電流 $J_{SC}$ 則因能隙變小可吸收略多長波長光而微幅增加，但整體最大輸出功率與效率仍會顯著下降。"
        },
        {
            question: "為了解決太陽能模組在「串聯」時因局部受光遮蔽（遮蔽效應）產生熱點效應 (Hot Spot)，應在電路中並聯何種保護元件？",
            options: [
                "阻斷二極體 (Blocking Diode)",
                "旁路二極體 (Bypass Diode)",
                "穩壓二極體 (Zener Diode)",
                "光敏電阻 (LDR)"
            ],
            correctIndex: 1,
            explanation: "在串聯模組中，若單片電池被遮蔽會限制整串電流並形成高阻抗負載產生發熱。因此會在各電池組兩端並聯「旁路二極體 (Bypass Diode)」。當發生遮蔽時，該二極體會導通，讓電流繞過受遮蔽的電池，防止熱點效應。"
        },
        {
            question: "霍爾效應量測中，為何「必須在黑暗環境中」進行量測？",
            options: [
                "光照會干擾外加磁場的強度",
                "樣品材料在光照下會產生光敏電阻效應與光伏效應，引入額外載子干擾原載子濃度",
                "霍爾電壓只能在黑暗中透過紅外線感測器讀取",
                "光照會使樣品溫度迅速上升，破壞歐姆接觸"
            ],
            correctIndex: 1,
            explanation: "半導體材料在照光下會產生光電效應與光伏效應，激發出非平衡的電子-電洞對（光生載子），這會大幅改變材料的片電阻、載子濃度與遷移率。因此，為了測得材料原本的平衡載子特性，必須嚴格在無光的黑暗環境下進行霍爾量測。"
        },
        {
            question: "van der Pauw 結構相較於傳統長條形 (Hall bar) 結構進行電阻率與霍爾量測，其最顯著的優點是什麼？",
            options: [
                "量測速度快十倍以上",
                "只需四個電極，且「不需要」精確測量樣品寬度或電極間的幾何距離",
                "不需要施加垂直磁場即可求得載子遷移率",
                "對電極大小與擺放位置完全沒有任何誤差敏感度"
            ],
            correctIndex: 1,
            explanation: "van der Pauw 方法在 1958 年由 L.J. van der Pauw 提出。它證明了只要樣品厚度均勻、單連通且電極置於邊緣，即可利用任意扁平形狀（如圓形或正方形）的 4 個小電極測得電阻率與霍爾係數，完全免除了量測樣品側向幾何尺寸的繁瑣步驟。"
        },
        {
            question: "在使用 FS5 螢光光譜儀進行光致發光 (PL) 與激發光譜 (PLE) 量測時，兩者的操作定義有何不同？",
            options: [
                "PL 是看吸收效率，PLE 是看發光壽命",
                "PL 固定激發波長量測發光波長強度；PLE 固定發光波長量測激發波長強度",
                "PL 固定發光波長量測激發波長強度；PLE 固定激發波長量測發光波長強度",
                "PL 在有光下量測，PLE 必須在黑暗下量測"
            ],
            correctIndex: 1,
            explanation: "PL (Photoluminescence) 是固定一個激發波長，量測樣品在不同發光波長下的發光光譜；PLE (Photoluminescence Excitation) 則是固定監測特定的發光波長，並掃描激發光源的波長。PLE 可以揭示哪些激發態參與了該特定波長的發光過程。"
        },
        {
            question: "有關外量子效率 (EQE, External Quantum Efficiency) 的敘述，以下何者錯誤？",
            options: [
                "EQE 代表收集到的電荷載子數與入射光子數之比值",
                "若能量低於半導體材料能隙 (Band Gap) 的光子射入，其 EQE 為 0",
                "EQE 百分比可以藉由測量短路電流密度 Jsc、入射單色光功率 Pin 與波長 λ 來計算",
                "EQE 已經扣除了樣品表面的光反射與透射損失，是純粹的內部轉換效率"
            ],
            correctIndex: 3,
            explanation: "EQE（外量子效率）是「外在」效率，並未扣除表面的反射或透射損失（那是 IQE 內量子效率定義）。低於能隙的光子因為無法被吸收激發電子，故 EQE 為 0。"
        },
        {
            question: "門多西諾電機 (Mendocino Motor) 能夠在空中旋轉的驅動原理是結合了哪兩項物理現象？",
            options: [
                "靜電排斥力與電磁感應",
                "磁懸浮（消除摩擦力）與太陽能電池驅動線圈的安培力（勞倫茲力）轉矩",
                "超導邁斯納效應與光壓驅動",
                "熱對流驅動與霍爾偏轉力"
            ],
            correctIndex: 1,
            explanation: "門多西諾電機利用永久磁鐵將轉軸浮起（磁懸浮）以徹底消除機械摩擦阻力。當光線照在轉軸上方的太陽能板時，產生電流並通入與之垂直的線圈中，線圈在下方底座磁鐵的磁場下受安培力 ($F = I L B$) 產生力矩推動旋轉，是一台無刷的光電磁懸浮電機。"
        },
        {
            question: "在雙軸太陽光追蹤電路中，主要使用何種感測器來偵測太陽的位置偏差？",
            options: [
                "熱電偶 (Thermocouple)",
                "光敏電阻 (LDR) 對稱排列",
                "霍爾感測器 (Hall Sensor)",
                "壓電感測器 (Piezoelectric Sensor)"
            ],
            correctIndex: 1,
            explanation: "太陽光追蹤器通常在板面邊緣對稱配置多個光敏電阻 (LDR)，並用隔板遮擋。當陽光偏移時，兩側照光不均勻導致阻值與分壓不同，比較器電路偵測到此電壓差後控制馬達旋轉板面，直到電壓差歸零（代表板面正對陽光）。"
        }
    ];

    let currentQuestionIdx = 0;
    let selectedOptionIdx = null;
    let score = 0;
    let answered = false;

    const quizProgressText = document.getElementById("quiz-progress-text");
    const progressFill = document.getElementById("progress-fill");
    const questionText = document.getElementById("question-text");
    const optionsContainer = document.getElementById("options-container");
    const feedbackBox = document.getElementById("feedback-box");
    const feedbackTitle = document.getElementById("feedback-title");
    const feedbackText = document.getElementById("feedback-text");
    const nextBtn = document.getElementById("quiz-next-btn");

    const quizMainView = document.getElementById("quiz-main-view");
    const quizResultView = document.getElementById("quiz-result-view");
    const finalScore = document.getElementById("final-score");
    const restartBtn = document.getElementById("quiz-restart-btn");

    function loadQuestion() {
        answered = false; // let 
        selectedOptionIdx = null; // let 
        feedbackBox.classList.remove("show");
        nextBtn.textContent = "送出答案";
        nextBtn.disabled = true;

        const q = quizQuestions[currentQuestionIdx];
        
        // 進度條與標題
        quizProgressText.textContent = `第 ${currentQuestionIdx + 1} 題 / 共 ${quizQuestions.length} 題`;
        const progressPercent = ((currentQuestionIdx) / quizQuestions.length) * 100;
        progressFill.style.width = `${progressPercent}%`;

        // 題目文字
        questionText.textContent = q.question;

        // 選項按鈕
        optionsContainer.innerHTML = "";
        q.options.forEach((option, idx) => {
            const btn = document.createElement("button");
            btn.className = "option-btn";
            btn.textContent = option;
            btn.addEventListener("click", () => {
                if (answered) return;
                selectOption(idx);
            });
            optionsContainer.appendChild(btn);
        });
    }

    function selectOption(idx) {
        selectedOptionIdx = idx; // let 
        const btns = optionsContainer.querySelectorAll(".option-btn");
        btns.forEach((btn, i) => {
            if (i === idx) {
                btn.classList.add("selected");
            } else {
                btn.classList.remove("selected");
            }
        });
        nextBtn.disabled = false;
    }

    function submitAnswer() {
        const q = quizQuestions[currentQuestionIdx];
        answered = true; // let 
        
        const btns = optionsContainer.querySelectorAll(".option-btn");
        btns.forEach((btn, i) => {
            btn.classList.remove("selected");
            if (i === q.correctIndex) {
                btn.classList.add("correct");
            } else if (i === selectedOptionIdx) {
                btn.classList.add("wrong");
            }
        });

        const isCorrect = (selectedOptionIdx === q.correctIndex);
        if (isCorrect) {
            score += 10;
            feedbackTitle.textContent = "✓ 回答正確！";
            feedbackTitle.style.color = "#10b981";
        } else {
            feedbackTitle.textContent = "✗ 回答錯誤！";
            feedbackTitle.style.color = "#ef4444";
        }

        feedbackText.innerHTML = q.explanation;
        feedbackBox.classList.add("show");

        nextBtn.textContent = (currentQuestionIdx === quizQuestions.length - 1) ? "查看結果" : "下一題";
    }

    nextBtn.addEventListener("click", () => {
        if (!answered) {
            submitAnswer();
        } else {
            currentQuestionIdx++;
            if (currentQuestionIdx < quizQuestions.length) {
                loadQuestion();
            } else {
                showResults();
            }
        }
    });

    function showResults() {
        progressFill.style.width = "100%";
        quizMainView.style.display = "none";
        quizResultView.style.display = "block";
        finalScore.textContent = score;
    }

    restartBtn.addEventListener("click", () => {
        currentQuestionIdx = 0; // let 
        score = 0; // let 
        quizMainView.style.display = "block";
        quizResultView.style.display = "none";
        loadQuestion();
    });

    // 初始載入第一題
    loadQuestion();
}

/* ==========================================================================
   6. 雙擊放大檢視模組 (Zoom Lightbox for Mobile & Desktop)
   ========================================================================== */
function initZoomModal() {
    const modal = document.getElementById("zoom-modal");
    const modalBody = document.getElementById("zoom-modal-body");
    const zoomInBtn = document.getElementById("zoom-in-btn");
    const zoomOutBtn = document.getElementById("zoom-out-btn");
    const zoomResetBtn = document.getElementById("zoom-reset-btn");
    const zoomCloseBtn = document.getElementById("zoom-close-btn");

    if (!modal || !modalBody) return;

    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let activeWrapper = null;

    // 開啟放大視窗並複製內容
    function openModal(target) {
        modal.style.display = "flex";
        modalBody.innerHTML = "";

        // 重置縮放與位移參數
        scale = 1; // let 
        translateX = 0; // let 
        translateY = 0; // let 

        // 建立包裹容器
        const wrapper = document.createElement("div");
        wrapper.className = "zoom-wrapper";
        activeWrapper = wrapper; // let 

        // 僅複製圖片元素
        if (target.tagName === "IMG") {
            const clone = target.cloneNode(true);
            clone.style.minWidth = "auto"; // 移除縮放下的 min-width 限制
            clone.style.transform = "none";
            wrapper.appendChild(clone);
        }

        modalBody.appendChild(wrapper);
        updateTransform();
    }

    function closeModal() {
        modal.style.display = "none";
        modalBody.innerHTML = "";
        activeWrapper = null; // let 
    }

    function updateTransform() {
        if (activeWrapper) {
            activeWrapper.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        }
    }

    // 縮放按鈕監聽
    zoomInBtn.addEventListener("click", () => {
        scale = Math.min(scale + 0.25, 4); // let 
        updateTransform();
    });

    zoomOutBtn.addEventListener("click", () => {
        scale = Math.max(scale - 0.25, 0.5); // let 
        updateTransform();
    });

    zoomResetBtn.addEventListener("click", () => {
        scale = 1; // let 
        translateX = 0; // let 
        translateY = 0; // let 
        updateTransform();
    });

    zoomCloseBtn.addEventListener("click", closeModal);
    
    // 點擊背景關閉
    modal.addEventListener("click", (e) => {
        if (e.target === modal || e.target === modalBody) {
            closeModal();
        }
    });

    // 拖曳 (Pan) 邏輯，使用 PointerEvents 統一適配滑鼠與觸控
    modalBody.addEventListener("pointerdown", (e) => {
        if (!activeWrapper) return;
        isDragging = true; // let 
        startX = e.clientX - translateX; // let 
        startY = e.clientY - translateY; // let 
        modalBody.setPointerCapture(e.pointerId);
    });

    modalBody.addEventListener("pointermove", (e) => {
        if (!isDragging || !activeWrapper) return;
        translateX = e.clientX - startX; // let 
        translateY = e.clientY - startY; // let 
        updateTransform();
    });

    const endDrag = (e) => {
        if (isDragging) {
            isDragging = false; // let 
            if (modalBody.hasPointerCapture && e && e.pointerId !== undefined) {
                try {
                    modalBody.releasePointerCapture(e.pointerId);
                } catch (err) {
                    // 忽略捕獲釋放的錯誤
                }
            }
        }
    };

    modalBody.addEventListener("pointerup", endDrag);
    modalBody.addEventListener("pointercancel", endDrag);

    // 雙擊/雙觸控觸發邏輯 (僅針對圖片)
    const triggerElements = document.querySelectorAll(".theory-img");

    triggerElements.forEach(el => {
        // 電腦版雙擊 (dblclick)
        el.addEventListener("dblclick", () => {
            openModal(el);
        });

        // 手機版雙觸控 (Double Tap)
        let lastTapTime = 0;
        el.addEventListener("touchstart", (e) => {
            const now = Date.now();
            const delay = now - lastTapTime;
            if (delay < 300 && delay > 0) {
                e.preventDefault(); // 避免觸發預設視窗縮放
                openModal(el);
            }
            lastTapTime = now; // let 
        });

        // 設定滑鼠樣式，提示可點擊放大
        el.style.cursor = "zoom-in";
    });
}

/* ==========================================================================
   7. 表格頁面內向量縮放模組 (In-Place Vector Table Zoom)
   ========================================================================== */
function initTableZoom() {
    const tableContainers = document.querySelectorAll(".table-container");

    tableContainers.forEach(container => {
        const table = container.querySelector("table");
        if (!table) return;

        // 建立浮動縮放控制項
        const controls = document.createElement("div");
        controls.className = "table-zoom-controls";

        const btnOut = document.createElement("button");
        btnOut.className = "table-zoom-btn table-zoom-out";
        btnOut.innerHTML = '<i class="fa-solid fa-minus"></i>';
        btnOut.title = "縮小表格文字";

        const indicator = document.createElement("span");
        indicator.className = "table-zoom-indicator";
        indicator.textContent = "100%";

        const btnIn = document.createElement("button");
        btnIn.className = "table-zoom-btn table-zoom-in";
        btnIn.innerHTML = '<i class="fa-solid fa-plus"></i>';
        btnIn.title = "放大表格文字";

        controls.appendChild(btnOut);
        controls.appendChild(indicator);
        controls.appendChild(btnIn);
        container.appendChild(controls);

        let zoom = 1.0; // let 

        function updateZoom(newZoom) {
            zoom = Math.max(0.75, Math.min(1.6, newZoom)); // let 
            table.style.fontSize = `${zoom * 100}%`;
            indicator.textContent = `${Math.round(zoom * 100)}%`;
        }

        btnIn.addEventListener("click", (e) => {
            e.stopPropagation();
            updateZoom(zoom + 0.15);
        });

        btnOut.addEventListener("click", (e) => {
            e.stopPropagation();
            updateZoom(zoom - 0.15);
        });

        // 雙擊/雙觸碰循環縮放 (100% -> 130% -> 160% -> 100%)
        container.addEventListener("dblclick", (e) => {
            if (e.target.closest(".table-zoom-controls")) return;
            cycleZoom();
        });

        let lastTapTime = 0;
        container.addEventListener("touchstart", (e) => {
            if (e.target.closest(".table-zoom-controls")) return;
            const now = Date.now();
            const delay = now - lastTapTime;
            if (delay < 300 && delay > 0) {
                e.preventDefault();
                cycleZoom();
            }
            lastTapTime = now; // let 
        });

        function cycleZoom() {
            if (zoom < 1.15) {
                updateZoom(1.3);
            } else if (zoom < 1.45) {
                updateZoom(1.6);
            } else {
                updateZoom(1.0);
            }
        }
    });
}

