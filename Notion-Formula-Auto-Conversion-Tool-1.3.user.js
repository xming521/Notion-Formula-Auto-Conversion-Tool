// ==UserScript==
// @name         Notion-Formula-Auto-Conversion-Tool
// @namespace    http://tampermonkey.net/
// @version      1.61
// @description  自动公式转换工具(支持持久化)
// @author       YourName
// @match        https://www.notion.so/*
// @grant        GM_addStyle
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js

// ==/UserScript==
(function () {
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
        }

        #formula-helper.collapsed .content-wrapper {
            opacity: 0;
            transform: scale(0.8);
            pointer-events: none;
            transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
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
    let isCollapsed = true;
    let hoverTimer = null;

    function createPanel() {
        panel = document.createElement('div');
        panel.id = 'formula-helper';
        panel.classList.add('collapsed');
        panel.innerHTML = `
            <button id="collapse-btn">
                <svg viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
            </button>
            <div class="content-wrapper">
                <button id="convert-btn">🔄 (0)</button>
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

    // 公式按钮操作函数
    async function handleLineFormulaButton(area) {
        const MAX_RETRIES = 3; // 最大重试次数

        const formulaButton = await findButton(area, {
            hasSvg: true,
            buttonText: ['equation', '公式', 'math']
        });

        // currentSelection.removeAllRanges();
        // await sleep(200); // 增加等待时间
        // currentSelection.addRange(savedRange);
        // await sleep(200); // 增加等待时间
        if (!formulaButton) {
            if (retryCount < MAX_RETRIES) {
                console.log(`未找到公式按钮，正在重试(${retryCount + 1}/${MAX_RETRIES})...`);
                await sleep(500 * (retryCount + 1)); // 每次重试增加等待时间
                return false;
            }
            throw new Error(`未找到公式按钮(已重试${MAX_RETRIES}次)`);
        }

        await simulateClick(formulaButton);
        await sleep(200); // 增加等待时间

        const doneButton = await findButton(document, {
            buttonText: ['done', '完成'],
            attempts: 10
        });
        if (!doneButton) throw new Error('未找到完成按钮');

        await simulateClick(doneButton);
        await sleep(200);

        return true;
    }



    // region 公式查找
    function findFormulas(text) {
        const formulas = [];

        // 使用原始文本，保留换行符以匹配块级公式
        const normalizedText = text;

        // 打印原始文本内容，帮助调试
        console.log('原始文本:', text);
        console.log('文本长度:', text.length);
        console.log('换行符情况:', text.match(/\r|\n|\r\n/g));

        // 修改正则表达式
        const blockRegex = /\$\$[\r\n]?([\s\S]+?)[\r\n]?\$\$/g;  // 更宽松的块级公式匹配
        const inlineRegex = /(?<!\$)\$([^\$]+?)\$(?!\$)/g;  // 行内公式，移除\n限制
        const latexRegex = /\\\(([\s\S]*?)\\\)/g;  // 匹配LaTeX公式
        const bracketRegex = /\\\[([\s\S]*?)\\\]/g;  // 匹配 \[...\] 格式的公式

        // 查找所有公式
        function findMatches(regex) {
            let match;
            const matches = [];
            let content = normalizedText;

            while ((match = regex.exec(content)) !== null) {
                console.log('找到匹配:', match);
                console.log('完整匹配内容:', match[0]);
                console.log('捕获组内容:', match[1]);
                console.log('匹配位置:', match.index);
                console.log('周围上下文:', content.substring(Math.max(0, match.index - 20), match.index + match[0].length + 20));

                let formula = match[0];
                let index = match.index;
                let length = formula.length;

                if (formula.length > 2 && // 确保公式有实际内容
                    ((formula.startsWith('$') && formula.endsWith('$')) ||
                        (formula.startsWith('\\(') && formula.endsWith('\\)')) ||
                        (formula.startsWith('\\[') && formula.endsWith('\\]'))
                    )) {
                    matches.push({
                        formula: [match[0], match[1].replace(/\n/g, '')],
                        index: index,
                        length: length
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
        addNonOverlappingFormulas(findMatches(bracketRegex));

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
            attempts = 8,
            role = 'button' // 新增role参数，默认为'button'
        } = options;

        const buttons = area.querySelectorAll(`[role="${role}"]`);
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
            await sleep(20);
        }
        return null;
    }

    function findAllFormulaIndexes(text, formula) {
        let indexes = [];
        let lastIndex = 0;

        while ((lastIndex = text.indexOf(formula, lastIndex)) !== -1) {
            indexes.push(lastIndex);
            lastIndex += formula.length;
        }

        console.log(`找到 ${formula} 的所有位置:`, indexes);
        return indexes;
    }
    function findIndependentSubstring(text, pattern, excludePatterns) {
        // 存储所有匹配（包括要排除的模式）的位置和范围
        const allMatches = [];

        // 首先添加要排除的模式的匹配位置
        excludePatterns.forEach(excludePattern => {
            let pos = 0;
            while ((pos = text.indexOf(excludePattern, pos)) !== -1) {
                allMatches.push({
                    start: pos,
                    end: pos + excludePattern.length - 1,
                    pattern: excludePattern,
                    isTarget: false
                });
                pos += 1;
            }
        });

        // 添加目标模式的匹配位置
        let pos = 0;
        while ((pos = text.indexOf(pattern, pos)) !== -1) {
            allMatches.push({
                start: pos,
                end: pos + pattern.length - 1,
                pattern: pattern,
                isTarget: true
            });
            pos += 1;
        }

        // 筛选出独立的目标子串
        return allMatches
            .filter(match => {
                if (!match.isTarget) return false; // 只关注目标模式

                // 检查当前匹配是否被任何其他匹配包含
                return !allMatches.some(other => {
                    if (match === other) return false; // 跳过自身比较
                    // 检查当前匹配的范围是否完全在其他匹配的范围内
                    return (other.start <= match.start &&
                        other.end >= match.end &&
                        other.pattern.length > match.pattern.length);
                });
            })
            .map(match => match.start);
    };




    // 优化的公式转换
    async function convertFormula(editor, formula_data, retryCount = 0, formulaInfo) {
        let isblock_formula = false;
        let isline_formula = false;
        async function handleFormulaButton(editor, formula, retryCount = 0) {
            try {
                // ...其他代码保持不变...

                const area = await findOperationArea();
                if (!area) throw new Error('未找到操作区域');

                if (isblock_formula) {
                    await sleep(200);
                    const formulaButton = await findButton(area, {
                        hasSvg: false,
                        buttonText: ['文本']
                    });
                    if (!formulaButton) {
                        //还是不是块级公式 是行内公式
                        isline_formula = true;
                        const result = await handleLineFormulaButton(area);
                        return result;
                    };
                    await simulateClick(formulaButton);
                    await sleep(200);

                    const formulaButton1 = await findButton(area, {
                        buttonText: ['公式块','公式区块'],
                        role: 'menuitem'
                    });

                    await simulateClick(formulaButton1);
                    await sleep(200);

                    return true;
                }
                const result = await handleLineFormulaButton(area);
                if (!result && retryCount < MAX_RETRIES) {
                    console.log(`公式按钮操作失败，正在重试(${retryCount + 1}/${MAX_RETRIES})...`);
                    await sleep(500 * (retryCount + 1));
                    return await convertFormula(editor, formula, retryCount + 1);
                }
                return result;

            } catch (error) {
                console.error('转换公式时出错:', error);
                updateStatus(`错误: ${error.message}`);
                throw error;
            }
        }

        const MAX_RETRIES = 3; // 最大重试次数
        const formula = formula_data[1];
        const origin_formula = formula_data[0];
        try {
            // 获取文本内容
            let fullText = editor.textContent;

            // 获取所有文本节点和位置信息
            let textNodes = [];
            let walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
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

            // 检查是否已是转换后的公式
            if (fullText.includes('⁡')) {
                return true;
            }

            let formulaIndex;
            let formulaEnd;

            const blockRegex = /\$\$[\r\n]?([\s\S]+?)[\r\n]?\$\$/g;  // 更宽松的块级公式匹配
            const inlineRegex = /(?<!\$)\$([^\$]+?)\$(?!\$)/g;  // 行内公式，移除\n限制
            const latexRegex = /\\\(([\s\S]*?)\\\)/g;  // 匹配LaTeX公式
            const bracketRegex = /\\\[([\s\S]*?)\\\]/g;  // 匹配 \[...\] 格式的公式


            // 块级和不是块级取决于第一个字符是不是公式



            //找原始公式 还是用lastIndexOf 找真实公式要按下标
            // region 找原始公式
            formulaIndex = fullText.lastIndexOf(origin_formula);
            if (formulaIndex === -1 || formulaIndex === undefined || formulaIndex === null) {
                console.warn('未找到匹配的文本');
                return;
            }
            formulaEnd = formulaIndex + origin_formula.length;
            let relevantNodes = textNodes.filter(nodeInfo => {
                return !(nodeInfo.end <= formulaIndex || nodeInfo.start >= formulaEnd);
            });

            if (relevantNodes.length === 0) {
                console.warn('未找到包含公式的文本节点');
                return;
            }

            let targetNode = relevantNodes[0].node;
            let startOffset, endOffset;
            startOffset = formulaIndex - relevantNodes[0].start;
            endOffset = startOffset + origin_formula.length;

            //如果startOffset 不是0 表示还是行内公式
            if (startOffset !== 0) {
                isline_formula = true;
            } else {
                isblock_formula = true;
            }

            let range = document.createRange();
            range.setStart(targetNode, startOffset);
            range.setEnd(targetNode, Math.min(endOffset, targetNode.length));

            let selection = window.getSelection();
            selection.removeAllRanges();
            await sleep(200);
            selection.addRange(range);
            await sleep(200);

            document.execCommand('insertText', false, formula.replace(/\n/g, ''));
            await sleep(300);

            //重新获取文本节点
            // 获取文本内容
            fullText = editor.textContent;

            // 获取所有文本节点和位置信息
            textNodes = [];
            walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
            accumulatedLength = 0;

            while (node = walker.nextNode()) {
                const nodeLength = node.textContent.length;
                textNodes.push({
                    node,
                    start: accumulatedLength,
                    end: accumulatedLength + nodeLength
                });
                accumulatedLength += nodeLength;
            }

            // endregion
            // region 找真实公式
            formulaIndex = findIndependentSubstring(fullText, formula, formulaInfo.otherFormulas);


            if (formulaIndex === -1 || Array.isArray(formulaIndex) && formulaIndex.length === 0) {
                console.warn('未找到匹配的文本');
                return;
            }
            formulaIndex = formulaIndex[0];
            formulaEnd = formulaIndex + formula.length;
            relevantNodes = textNodes.filter(nodeInfo => {
                return !(nodeInfo.end <= formulaIndex || nodeInfo.start >= formulaEnd);
            });

            if (relevantNodes.length === 0) {
                console.warn('未找到包含公式的文本节点');
                return;
            }

            targetNode = relevantNodes[0].node;
            startOffset = formulaIndex - relevantNodes[0].start;
            endOffset = startOffset + formula.length;

            range = document.createRange();
            range.setStart(targetNode, startOffset);
            range.setEnd(targetNode, Math.min(endOffset, targetNode.length));

            selection = window.getSelection();
            selection.removeAllRanges();
            await sleep(200);
            selection.addRange(range);
            await sleep(150);

            // 验证选择是否成功
            if (selection.rangeCount === 0) {
                console.warn('选择范围设置失败，尝试重新设置...');
                selection.removeAllRanges();
                await sleep(200);
                selection.addRange(range);
            }

            targetNode.parentElement.focus();
            document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            await sleep(250);

            await handleFormulaButton(editor, formula_data);

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
                totalFormulas += formulas.length;
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
            // 需要在这里加上公式的索引，来防止一个大公式里包括了其他小公式
            for (const { editor, formulas } of allFormulas.reverse()) {
                for (let i = formulas.length - 1; i >= 0; i--) {
                    const formula = formulas[i].formula;
                    const formulasArray = formulas.map(f => f.formula[1]).filter((f, index) => index !== i);
                    await convertFormula(editor, formula, 0, {
                        index: i,
                        otherFormulas: formulasArray,
                        length: formulasArray.length
                    });
                    formulaCount++;
                    updateProgress(formulaCount, totalFormulas);
                    updateStatus(`正在转换... (${formulaCount}/${totalFormulas})`);
                }
            }

            updateStatus(`Done:${formulaCount}`, 3000);
            convertBtn.textContent = `🔄 (${formulaCount})`;

            // 转换完成后自动收起面板
            setTimeout(() => {
                if (!panel.classList.contains('collapsed')) {
                    panel.classList.add('collapsed');
                    isCollapsed = true;
                }
            }, 1000);

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

    // 查找指定位置的文本节点
    function findNodeAtIndex(editor, index, textNodes) {
        for (const nodeInfo of textNodes) {
            if (index >= nodeInfo.start && index < nodeInfo.end) {
                return nodeInfo;
            }
        }
        return null;
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
            await sleep(30);
        }
    }

    // 初始化
    createPanel();
    convertBtn.addEventListener('click', convertFormulas);

    // 页面加载完成后检查公式数量
    setTimeout(() => {
        const formulas = findFormulas(document.body.textContent);
        if (formulas.length > 0) {
            convertBtn.textContent = `🔄(${formulas.length})`;
        }
    }, 1000);

    console.log('公式转换工具已加载');
})();
