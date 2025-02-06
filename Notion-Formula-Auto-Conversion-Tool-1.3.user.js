// ==UserScript==
// @name         Notion-Formula-Auto-Conversion-Tool
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  自动公式转换工具(支持持久化)
// @author       YourName
// @match        https://www.notion.so/*
// @grant        GM_addStyle
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js
// ==/UserScript==

(function() {
    'use strict';

    GM_addStyle(`
        /* 基础样式 */
        #formula-helper {
            position: fixed;
            bottom: 90px;
            right: 20px;
            z-index: 9999;
            background: white;
            padding: 0;
            border-radius: 12px;
            box-shadow: rgba(0, 0, 0, 0.1) 0px 10px 30px,
                       rgba(0, 0, 0, 0.1) 0px 1px 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            min-width: 200px;
            transform-origin: center;
            will-change: transform;
            overflow: hidden;
        }

        .content-wrapper {
            padding: 16px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            transform-origin: center;
        }

        /* 收起状态 */
        #formula-helper.collapsed {
            width: 48px;
            min-width: 48px;
            height: 48px;
            padding: 12px;
            opacity: 0.9;
            transform: scale(0.98);
            border-radius: 50%;
            transform-origin: bottom right;
        }

        #formula-helper.collapsed .content-wrapper {
            opacity: 0;
            transform: scale(0.8);
            pointer-events: none;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) 0.05s;
            transform-origin: bottom right;
        }

        #formula-helper.collapsed #convert-btn,
        #formula-helper.collapsed #progress-container,
        #formula-helper.collapsed #status-text {
            opacity: 0;
            transform: scale(0.8);
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            transform-origin: bottom right;
        }

        #formula-helper #convert-btn,
        #formula-helper #progress-container,
        #formula-helper #status-text {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            opacity: 1;
            transform: translateY(0);
            transform-origin: center;
        }

        /* 收起按钮样式 */
        #collapse-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            width: 24px;
            height: 24px;
            border: none;
            background: transparent;
            cursor: pointer;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            transform-origin: center;
            z-index: 2;
        }

        #collapse-btn:hover {
            transform: scale(1.1);
        }

        #collapse-btn:active {
            transform: scale(0.95);
        }

        #collapse-btn svg {
            width: 16px;
            height: 16px;
            fill: #4b5563;
            transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        #formula-helper.collapsed #collapse-btn {
            position: static;
            width: 100%;
            height: 100%;
            transform-origin: center;
        }

        #formula-helper.collapsed #collapse-btn svg {
            transform: rotate(180deg);
        }

        @media (hover: hover) {
            #formula-helper:not(.collapsed):hover {
                transform: translateY(-2px);
                box-shadow: rgba(0, 0, 0, 0.15) 0px 15px 35px,
                           rgba(0, 0, 0, 0.12) 0px 3px 10px;
            }

            #formula-helper.collapsed:hover {
                opacity: 1;
                transform: scale(1.05);
            }
        }

        /* 按钮样式 */
        #convert-btn {
            background: #2563eb;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            margin-top: 20px;
            margin-bottom: 12px;
            width: 100%;
            font-weight: 500;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            position: relative;
            overflow: hidden;
        }

        #convert-btn::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.1);
            opacity: 0;
            transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        #convert-btn:hover {
            background: #1d4ed8;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
        }

        #convert-btn:hover::after {
            opacity: 1;
        }

        #convert-btn:active {
            transform: translateY(1px);
            box-shadow: 0 2px 6px rgba(37, 99, 235, 0.15);
        }

        #convert-btn.processing {
            background: #9ca3af;
            pointer-events: none;
            transform: scale(0.98);
            box-shadow: none;
        }

        /* 状态和进度显示 */
        #status-text {
            font-size: 13px;
            color: #4b5563;
            margin-bottom: 10px;
            line-height: 1.5;
        }

        #progress-container {
            background: #e5e7eb;
            height: 4px;
            border-radius: 2px;
            overflow: hidden;
            margin-bottom: 15px;
            transform-origin: center;
        }

        #progress-bar {
            background: #2563eb;
            height: 100%;
            width: 0%;
            transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }

        #progress-bar::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(
                90deg,
                transparent,
                rgba(255, 255, 255, 0.3),
                transparent
            );
            animation: progress-shine 1.5s linear infinite;
        }

        @keyframes progress-shine {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }

        /* 动画效果 */
        @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(0.98); }
            100% { opacity: 1; transform: scale(1); }
        }

        .processing #status-text {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
    `);

    // 缓存DOM元素
    let panel, statusText, convertBtn, progressBar, progressContainer, collapseBtn;
    let isProcessing = false;
    let formulaCount = 0;
    let isCollapsed = false;
    let hoverTimer = null;

    function createPanel() {
        panel = document.createElement('div');
        panel.id = 'formula-helper';
        panel.innerHTML = `
            <button id="collapse-btn">
                <svg viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
            </button>
            <div class="content-wrapper">
                <button id="convert-btn">🔄</button>
                <div id="progress-container">
                    <div id="progress-bar"></div>
                </div>
                <div id="status-text">就绪</div>
            </div>
        `;
        document.body.appendChild(panel);

        statusText = panel.querySelector('#status-text');
        convertBtn = panel.querySelector('#convert-btn');
        progressBar = panel.querySelector('#progress-bar');
        progressContainer = panel.querySelector('#progress-container');
        collapseBtn = panel.querySelector('#collapse-btn');

        // 添加收起按钮事件
        collapseBtn.addEventListener('click', toggleCollapse);

        // 添加鼠标悬停事件
        panel.addEventListener('mouseenter', () => {
            clearTimeout(hoverTimer);
            if (isCollapsed) {
                hoverTimer = setTimeout(() => {
                    panel.classList.remove('collapsed');
                    isCollapsed = false;
                }, 150); // 减少展开延迟时间
            }
        });

        panel.addEventListener('mouseleave', () => {
            clearTimeout(hoverTimer);
            if (!isCollapsed && !isProcessing) { // 添加处理中状态判断
                hoverTimer = setTimeout(() => {
                    panel.classList.add('collapsed');
                    isCollapsed = true;
                }, 800); // 适当减少收起延迟
            }
        });
    }

    function toggleCollapse() {
        isCollapsed = !isCollapsed;
        panel.classList.toggle('collapsed');
    }

    function updateProgress(current, total) {
        const percentage = total > 0 ? (current / total) * 100 : 0;
        progressBar.style.width = `${percentage}%`;
    }

    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    function updateStatus(text, timeout = 0) {
        statusText.textContent = text;
        if (timeout) {
            setTimeout(() => statusText.textContent = '就绪', timeout);
        }
        console.log('[状态]', text);
    }

    // 公式查找
    function findFormulas(text) {
        const formulas = [];

        // 预处理文本，确保所有公式都在一行内
        const normalizedText = text.replace(/\n/g, ' ');

        // 使用更精确的正则表达式
        const blockRegex = /\$\$([\s\S]*?)\$\$/g;  // 匹配块级公式，包括所有字符
        const inlineRegex = /\$([^\$]+?)\$/g;      // 匹配行内公式
        const latexRegex = /\\\(([\s\S]*?)\\\)/g;  // 匹配LaTeX公式

        // 查找所有公式
        function findMatches(regex) {
            let match;
            const matches = [];
            let content = normalizedText;

            while ((match = regex.exec(content)) !== null) {
                const formula = match[0];
                // 验证公式结构的完整性
                if (formula.length > 4 && // 确保公式有实际内容
                    ((formula.startsWith('$$') && formula.endsWith('$$')) ||
                     (formula.startsWith('$') && formula.endsWith('$') && !formula.includes('$$')) ||
                     (formula.startsWith('\\(') && formula.endsWith('\\)')))) {

                    matches.push({
                        formula: formula,
                        index: match.index,
                        length: formula.length
                    });
                }
            }
            return matches;
        }

        // 优先查找块级公式
        const blockFormulas = findMatches(blockRegex);
        formulas.push(...blockFormulas);

        // 查找其他类型的公式，确保不与已找到的公式重叠
        function addNonOverlappingFormulas(newFormulas) {
            for (const formula of newFormulas) {
                const overlaps = formulas.some(existing => {
                    const existingEnd = existing.index + existing.length;
                    const newEnd = formula.index + formula.length;
                    return !(formula.index >= existingEnd || newEnd <= existing.index);
                });
                if (!overlaps) {
                    formulas.push(formula);
                }
            }
        }

        addNonOverlappingFormulas(findMatches(inlineRegex));
        addNonOverlappingFormulas(findMatches(latexRegex));

        // 按位置排序
        formulas.sort((a, b) => a.index - b.index);

        console.log('找到的公式:', formulas.map(f => f.formula));

        return formulas;
    }

    // 操作区域查找
    async function findOperationArea() {
        const selector = '.notion-overlay-container';
        for (let i = 0; i < 5; i++) {
            const areas = document.querySelectorAll(selector);
            const area = Array.from(areas).find(a =>
                a.style.display !== 'none' && a.querySelector('[role="button"]')
            );

            if (area) {
                console.log('找到操作区域');
                return area;
            }
            await sleep(50);
        }
        return null;
    }

    // 按钮查找
    async function findButton(area, options = {}) {
        const {
            buttonText = [],
            hasSvg = false,
            attempts = 8
        } = options;

        const buttons = area.querySelectorAll('[role="button"]');
        const cachedButtons = Array.from(buttons);

        for (let i = 0; i < attempts; i++) {
            const button = cachedButtons.find(btn => {
                if (hasSvg && btn.querySelector('svg.equation')) return true;
                const text = btn.textContent.toLowerCase();
                return buttonText.some(t => text.includes(t));
            });

            if (button) {
                return button;
            }
            await sleep(50);
        }
        return null;
    }

    // 优化的公式转换
    async function convertFormula(editor, formula, retryCount = 0) {
        const MAX_RETRIES = 3; // 最大重试次数
        try {
            // 精确查找公式的首次出现位置
            const fullText = editor.textContent;
            const formulaIndex = fullText.indexOf(formula);
            if (formulaIndex === -1) {
                console.warn('未找到匹配的文本');
                return;
            }

            // 获取所有文本节点和它们的位置信息
            const textNodes = [];
            const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
            let accumulatedLength = 0;
            let node;

            while (node = walker.nextNode()) {
                const nodeLength = node.textContent.length;
                textNodes.push({
                    node,
                    start: accumulatedLength,
                    end: accumulatedLength + nodeLength
                });
                accumulatedLength += nodeLength;
            }

            // 找到公式跨越的所有节点
            const formulaEnd = formulaIndex + formula.length;
            const relevantNodes = textNodes.filter(nodeInfo => {
                return !(nodeInfo.end <= formulaIndex || nodeInfo.start >= formulaEnd);
            });

            if (relevantNodes.length === 0) {
                console.warn('未找到包含公式的文本节点');
                return;
            }

            const targetNode = relevantNodes[0].node;
            const startOffset = formulaIndex - relevantNodes[0].start;

            // 设置选区
            const range = document.createRange();
            try {
                // 如果公式跨越多个节点，确保选择完整的公式
                range.setStart(targetNode, startOffset);
                if (relevantNodes.length === 1) {
                    // 公式在单个节点内
                    range.setEnd(targetNode, Math.min(startOffset + formula.length, targetNode.length));
                } else {
                    // 公式跨越多个节点，选择最后一个节点
                    const lastNode = relevantNodes[relevantNodes.length - 1];
                    const endOffset = Math.min(formulaEnd - lastNode.start, lastNode.node.length);
                    range.setEnd(lastNode.node, endOffset);
                }
            } catch(e) {
                console.warn('Range设置失败:', e);
                return false;
            }

            // 添加调试信息
            console.log('选区信息:', {
                formula,
                nodeCount: relevantNodes.length,
                startOffset,
                text: range.toString()
            });

            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);

            targetNode.parentElement.focus();
            document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            await sleep(50);

            const area = await findOperationArea();
            if (!area) throw new Error('未找到操作区域');

            const formulaButton = await findButton(area, {
                hasSvg: true,
                buttonText: ['equation', '公式', 'math']
            });
            if (!formulaButton) {
                if (retryCount < MAX_RETRIES) {
                    console.log(`未找到公式按钮，正在重试(${retryCount + 1}/${MAX_RETRIES})...`);
                    await sleep(500 * (retryCount + 1)); // 每次重试增加等待时间
                    return await convertFormula(editor, formula, retryCount + 1);
                }
                throw new Error(`未找到公式按钮(已重试${MAX_RETRIES}次)`);
            }

            await simulateClick(formulaButton);
            await sleep(100); // 增加等待时间

            const doneButton = await findButton(document, {
                buttonText: ['done', '完成'],
                attempts: 10
            });
            if (!doneButton) throw new Error('未找到完成按钮');

            await simulateClick(doneButton);
            await sleep(10);

            return true;
        } catch (error) {
            console.error('转换公式时出错:', error);
            updateStatus(`错误: ${error.message}`);
            throw error;
        }
    }

    // 优化的主转换函数
    async function convertFormulas() {
        if (isProcessing) return;
        isProcessing = true;
        convertBtn.classList.add('processing');

        try {
            formulaCount = 0;
            updateStatus('开始扫描文档...');

            const editors = document.querySelectorAll('[contenteditable="true"]');
            console.log('找到编辑区域数量:', editors.length);

            // 预先收集所有公式
            const allFormulas = [];
            let totalFormulas = 0;
            for (const editor of editors) {
                const text = editor.textContent;
                const formulas = findFormulas(text);
                totalFormulas += formulas.length / 2;
                allFormulas.push({ editor, formulas });
            }

            if (totalFormulas === 0) {
                updateStatus('未找到需要转换的公式', 3000);
                updateProgress(0, 0);
                convertBtn.classList.remove('processing');
                isProcessing = false;
                return;
            }

            updateStatus(`找到 ${totalFormulas} 个公式，开始转换...`);

            // 从末尾开始处理公式
            for (const { editor, formulas } of allFormulas.reverse()) {
                for (const { formula } of formulas.reverse()) {
                    await convertFormula(editor, formula);
                    formulaCount++;
                    updateProgress(formulaCount, totalFormulas);
                    updateStatus(`正在转换... (${formulaCount}/${totalFormulas})`);
                }
            }

            updateStatus(`Completed!`, 3000);
            convertBtn.textContent = `🔄`; // (${formulaCount})

        } catch (error) {
            console.error('转换过程出错:', error);
            updateStatus(`发生错误: ${error.message}`, 5000);
            updateProgress(0, 0);
        } finally {
            isProcessing = false;
            convertBtn.classList.remove('processing');

            setTimeout(() => {
                if (!isProcessing) {
                    updateProgress(0, 0);
                }
            }, 1000);
        }
    }

    // 点击事件模拟
    async function simulateClick(element) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const events = [
            new MouseEvent('mousemove', { bubbles: true, clientX: centerX, clientY: centerY }),
            new MouseEvent('mouseenter', { bubbles: true, clientX: centerX, clientY: centerY }),
            new MouseEvent('mousedown', { bubbles: true, clientX: centerX, clientY: centerY }),
            new MouseEvent('mouseup', { bubbles: true, clientX: centerX, clientY: centerY }),
            new MouseEvent('click', { bubbles: true, clientX: centerX, clientY: centerY })
        ];

        for (const event of events) {
            element.dispatchEvent(event);
            await sleep(20);
        }
    }

    // 初始化
    createPanel();
    convertBtn.addEventListener('click', convertFormulas);

    // 页面加载完成后检查公式数量
    setTimeout(() => {
        const formulas = findFormulas(document.body.textContent);
        if (formulas.length > 0) {
            convertBtn.textContent = `🔄`; // (${formulas.length})
        }
    }, 1000);

    console.log('公式转换工具已加载');
})();
