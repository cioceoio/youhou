// ==UserScript==
// @name        集思录 LOF基金 溢价率大到小排序
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  集思录LOF基金页面自动按溢价率从大到小排序
// @author       Your Name
// @match        *://www.jisilu.cn/data/lof/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 查找表格数据
    function findTableData() {
        // 获取两个表格的容器
        const indexContainer = document.querySelector('#topic_index');
        const stockContainer = document.querySelector('#topic_stock');

        // 判断哪个容器是可见的（检查 style.display）
        const indexVisible = indexContainer && window.getComputedStyle(indexContainer).display !== 'none';
        const stockVisible = stockContainer && window.getComputedStyle(stockContainer).display !== 'none';

        let table = null;

        if (indexVisible) {
            table = document.querySelector('#flex_index');
        } else if (stockVisible) {
            table = document.querySelector('#flex_stock');
        } else {
            table = document.querySelector('#flex_index') || document.querySelector('#flex_stock');
        }

        if (!table) return null;

        const tbody = table.querySelector('tbody');
        if (!tbody) return null;

        const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => row.style.display !== 'none');
        return { rows };
    }

    // 解析溢价率数值
    function parseDiscountRate(text) {
        if (!text) return 0;
        // 移除百分号并转换为数字
        const rate = parseFloat(text.replace('%', '').replace('+', ''));
        return isNaN(rate) ? 0 : rate;
    }

    // 按溢价率排序（从大到小）
    function sortByDiscountRate(rows) {
        const sortedRows = rows.sort((a, b) => {
            const aDiscountCell = a.querySelector('td[data-name="discount_rt"]');
            const bDiscountCell = b.querySelector('td[data-name="discount_rt"]');

            const aDiscountRate = parseDiscountRate(aDiscountCell?.textContent.trim() || '');
            const bDiscountRate = parseDiscountRate(bDiscountCell?.textContent.trim() || '');

            return bDiscountRate - aDiscountRate;
        });

        const tbody = rows[0].parentNode;
        sortedRows.forEach(row => tbody.appendChild(row));
    }

    // 监听页面变化
    function setupObserver() {
        const observer = new MutationObserver((mutations) => {
            const shouldRecheck = mutations.some(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    return [...mutation.addedNodes].some(node =>
                        node.nodeType === 1 && (node.tagName === 'TR' || node.querySelector?.('tr'))
                    );
                }
                return mutation.type === 'attributes' && mutation.attributeName === 'style';
            });

            if (shouldRecheck) {
                setTimeout(main, 500);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });
    }

    // 主函数
    function main() {
        const tableData = findTableData();
        if (!tableData || tableData.rows.length === 0) return;
        sortByDiscountRate(tableData.rows);
    }

    main();
    setupObserver();

})();
