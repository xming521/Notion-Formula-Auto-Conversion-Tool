// ==UserScript==
// @name         Notion-Formula-Auto-Conversion-Tool
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  自动公式转换工具(支持持久化)
// @author       YourName
// @match        https://www.notion.so/*
// @grant        GM_addStyle
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js
// ==/UserScript==

(function() {
    'use strict';

    GM_addStyle(`
        #formula-helper {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            background: white;
            padding: 10px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        #convert-btn {
            background: #37352f;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin-bottom: 8px;
        }
        #status-text {
            font-size: 12px;
            color: #666;
            max-width: 200px;
            word-break: break-word;
        }
    `);

    const panel = document.createElement('div');
    panel.id = 'formula-helper';
    panel.innerHTML = `
        <button id="convert-btn">转换公式 (0)</button>
        <div id="status-text">就绪</div>
    `;
    document.body.appendChild(panel);

    let isProcessing = false;
    let formulaCount = 0;

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function updateStatus(text, timeout = 0) {
        const status = document.querySelector('#status-text');
        status.textContent = text;
        if (timeout) {
            setTimeout(() => status.textContent = '就绪', timeout);
        }
        console.log('[状态]', text);
    }

    // 模拟点击事件
    async function simulateClick(element) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        console.log('模拟点击元素:', {
            text: element.textContent,
            class: element.className,
            position: {x: centerX, y: centerY}
        });

        // 移动到元素
        element.dispatchEvent(new MouseEvent('mousemove', {
            bubbles: true,
            clientX: centerX,
            clientY: centerY
        }));
        await sleep(50);

        // 模拟悬停
        element.dispatchEvent(new MouseEvent('mouseover', {
            bubbles: true,
            clientX: centerX,
            clientY: centerY
        }));
        element.dispatchEvent(new MouseEvent('mouseenter', {
            bubbles: true,
            clientX: centerX,
            clientY: centerY
        }));
        await sleep(50);

        // 模拟点击
        element.dispatchEvent(new MouseEvent('mousedown', {
            bubbles: true,
            clientX: centerX,
            clientY: centerY
        }));
        await sleep(50);

        element.dispatchEvent(new MouseEvent('mouseup', {
            bubbles: true,
            clientX: centerX,
            clientY: centerY
        }));
        element.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            clientX: centerX,
            clientY: centerY
        }));
    }

    // 获取所有公式
function findFormulas(text) {
    const formulas = [];
    let startIndex = 0;

    while (startIndex < text.length) {
        // 使用正则表达式查找公式开始位置
        const formulaStarts = [
            {pattern: /\$/, type: 'dollar'},
            {pattern: /\\\(|\(/, type: 'backslash'}
        ];

        let index = -1;
        let type = null;

        for (const {pattern, type: t} of formulaStarts) {
            const match = pattern.exec(text.slice(startIndex));
            if (match) {
                const pos = startIndex + match.index;
                if (index === -1 || pos < index) {
                    index = pos;
                    type = t;
                }
            }
        }

        if (index === -1) break;

        // 检查是否是公式开始
        if (text[index] === '$') {
            // 判断是块级公式还是内联公式
            if (text[index + 1] === '$') {
                // 块级公式，$$...$$
                let endIndex = text.indexOf('$$', index + 2);
                if (endIndex > -1) {
                    const formula = text.substring(index + 2, endIndex);  // 去掉 $$ 符号
                    formulas.push({
                        formula: '$$' + formula + '$$',  // 以 $$ 包裹起来
                        index
                    });
                    startIndex = endIndex + 2;
                    continue;
                }
            } else {
                // 内联公式，$...$
                let endIndex = index + 1;
                while (true) {
                    endIndex = text.indexOf('$', endIndex + 1);
                    if (endIndex === -1) break;

                    // 确保这不是块级公式的开始
                    if (text[endIndex + 1] !== '$') {
                        const formula = text.substring(index + 1, endIndex);  // 去掉 $
                        formulas.push({
                            formula: '$' + formula + '$',  // 转回 $...$ 形式
                            index
                        });
                        startIndex = endIndex + 1;
                        break;
                    }
                }
            }
        } else if (type === 'backslash') {
            let endIndex = -1;
            const formula = text.substring(index);
            const endMatch = /\\?\)/.exec(formula.slice(2));

            if (endMatch) {
                endIndex = index + 2 + endMatch.index;
            }

            if (endIndex > -1) {
                // 将各种格式转换为 $ $ 格式
                let formula = text.substring(index, endIndex + 2);
                formula = formula.replace(/\\?\(/, '$');
                formula = formula.replace(/\\?\)/, '$');
                formulas.push({
                    formula: formula,
                    index
                });
                startIndex = endIndex + 2;
                continue;
            }
        }

        startIndex = index + 1;
    }

    if (formulas.length > 0) {
        console.log('找到公式:', formulas);
    }
    return formulas;
}

    // 查找操作区域（工具栏或弹窗）
    async function findOperationArea() {
        for (let i = 0; i < 10; i++) {
            const areas = Array.from(document.querySelectorAll('.notion-overlay-container'));
            for (const area of areas) {
                if (area.style.display !== 'none' && area.querySelector('[role="button"]')) {
                    console.log('找到操作区域');
                    return area;
                }
            }
            await sleep(100);
        }
        return null;
    }

    // 查找按钮
    async function findButton(area, options = {}) {
        const {
            buttonText = [],
            hasSvg = false,
            attempts = 15
        } = options;

        console.log('开始查找按钮:', {buttonText, hasSvg});

        for (let i = 0; i < attempts; i++) {
            const buttons = Array.from(area.querySelectorAll('[role="button"]'));

            for (const button of buttons) {
                // 检查SVG
                if (hasSvg && button.querySelector('svg.equation')) {
                    console.log('找到带SVG的按钮');
                    return button;
                }

                // 检查文本
                const text = button.textContent.toLowerCase();
                if (buttonText.some(t => text.includes(t))) {
                    console.log('找到文本匹配的按钮:', text);
                    return button;
                }
            }

            await sleep(100);
        }

        return null;
    }

    // 转换单个公式
    async function convertFormula(editor, formula) {
        try {
            console.log('开始处理公式:', formula);

            const walker = document.createTreeWalker(
                editor,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            let textNode;
            let targetNode = null;

            while (textNode = walker.nextNode()) {
                if (textNode.textContent.includes(formula)) {
                    targetNode = textNode;
                    break;
                }
            }

            if (!targetNode) {
                console.warn('未找到匹配的文本');
                return;
            }

            // 设置选区
            const startOffset = targetNode.textContent.indexOf(formula);
            const range = document.createRange();
            range.setStart(targetNode, startOffset);
            range.setEnd(targetNode, startOffset + formula.length);

            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);

            // 触发选区事件并等待操作区域
            targetNode.parentElement.focus();
            document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            await sleep(300);

            // 查找操作区域
            const area = await findOperationArea();
            if (!area) {
                throw new Error('未找到操作区域');
            }

            // 查找公式按钮
            const formulaButton = await findButton(area, {
                hasSvg: true,
                buttonText: ['equation', '公式', 'math']
            });

            if (!formulaButton) {
                throw new Error('未找到公式按钮');
            }

            await simulateClick(formulaButton);
            await sleep(300);

            // 点击Done按钮
            const doneButton = await findButton(document, {
                buttonText: ['done', '完成'],
                attempts: 20
            });

            if (!doneButton) {
                throw new Error('未找到完成按钮');
            }

            await simulateClick(doneButton);
            await sleep(200);

            console.log('公式转换完成:', formula);
            return true;

        } catch (error) {
            console.error('转换公式时出错:', error);
            updateStatus(`错误: ${error.message}`);
            throw error;
        }
    }

    // 主转换函数
    async function convertFormulas() {
        if (isProcessing) return;
        isProcessing = true;

        try {
            formulaCount = 0;
            updateStatus('开始扫描文档...');

            const editors = document.querySelectorAll('[contenteditable="true"]');
            console.log('找到编辑区域数量:', editors.length);

            for (const editor of editors) {
                const text = editor.textContent;
                console.log('处理编辑区域，文本长度:', text.length);

                const formulas = findFormulas(text);
                console.log('找到公式数量:', formulas.length);

                for (const {formula} of formulas) {
                    await convertFormula(editor, formula);
                    formulaCount++;
                    await sleep(200);
                    updateStatus(`已转换 ${formulaCount} 个公式`);
                }
            }

            updateStatus(`转换完成！共处理 ${formulaCount} 个公式`, 3000);
            document.querySelector('#convert-btn').textContent = `转换公式 (${formulaCount})`;
        } catch (error) {
            console.error('转换过程出错:', error);
            updateStatus(`发生错误: ${error.message}`, 5000);
        } finally {
            isProcessing = false;
        }
    }

    // 绑定事件
    document.querySelector('#convert-btn').addEventListener('click', convertFormulas);

    // 监听页面变化
    const observer = new MutationObserver(() => {
        if (!isProcessing) {
            document.querySelector('#convert-btn').textContent = '转换公式 (!)';
        }
    });
    observer.observe(document.body, { subtree: true, childList: true });
    console.log('公式转换工具已加载');
})();
