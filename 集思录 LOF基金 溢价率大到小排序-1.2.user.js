// ==UserScript==
// @name        集思录 LOF基金 溢价率大到小排序
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  集思录LOF基金页面自动按溢价率从大到小排序
// @author       Your Name
// @match        *://www.jisilu.cn/data/lof/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    /**
     * 查找并返回当前可见表格的数据行
     * 支持指数LOF和股票LOF两种表格
     * @returns {Object|null} 返回包含表格行的对象 { rows: Array<HTMLTableRowElement> }，查找失败则返回null
     */
    function findTableData() {
        // 获取指数LOF和股票LOF表格
        const indexTable = document.querySelector('#flex_index');
        const stockTable = document.querySelector('#flex_stock');

        // 获取对应的容器元素
        const indexContainer = document.querySelector('#topic_index');
        const stockContainer = document.querySelector('#topic_stock');

        // 改进的可见性检查逻辑：指数和股票LOF是互斥显示的
        let table = null;

        // 检查容器的可见性（直接检查容器的style.display属性）
        // 如果容器的style.display不为'none'，则它是可见的
        const isIndexContainerVisible = indexContainer && indexContainer.style.display !== 'none';
        const isStockContainerVisible = stockContainer && stockContainer.style.display !== 'none';

        // 根据容器的可见性来选择表格
        if (isIndexContainerVisible && indexTable) {
            // 指数容器可见
            table = indexTable;
        } else if (isStockContainerVisible && stockTable) {
            // 股票容器可见
            table = stockTable;
        }

        // 表格不存在则返回null
        if (!table) return null;

        // 获取表格的tbody元素
        const tbody = table.querySelector('tbody');
        if (!tbody) return null;

        // 获取所有可见的表格行（排除display: none的行）
        const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => row.style.display !== 'none');
        return { rows };
    }

    /**
     * 解析溢价率文本为数字
     * @param {string} text - 包含溢价率的文本字符串（如"12.34%"或"+5.67%"）
     * @returns {number} 解析后的溢价率数值，失败则返回0
     */
    function parseDiscountRate(text) {
        if (!text) return 0;
        // 移除百分号和加号，转换为浮点数
        const rate = parseFloat(text.replace('%', '').replace('+', ''));
        return isNaN(rate) ? 0 : rate;
    }

    /**
     * 按溢价率对表格行进行排序（从大到小）
     * @param {Array<HTMLTableRowElement>} rows - 要排序的表格行数组
     */
    function sortByDiscountRate(rows) {
        // 使用自定义比较函数按溢价率降序排序
        const sortedRows = rows.sort((a, b) => {
            // 找到包含溢价率数据的单元格（通过data-name属性标识）
            const aDiscountCell = a.querySelector('td[data-name="discount_rt"]');
            const bDiscountCell = b.querySelector('td[data-name="discount_rt"]');

            // 解析溢价率数值
            const aDiscountRate = parseDiscountRate(aDiscountCell?.textContent.trim() || '');
            const bDiscountRate = parseDiscountRate(bDiscountCell?.textContent.trim() || '');

            // 降序排列（b - a）
            return bDiscountRate - aDiscountRate;
        });

        // 获取tbody元素，将排序后的行重新添加到表格中
        const tbody = rows[0].parentNode;
        const table = tbody.parentNode;
        const tableType = table.id === 'flex_index' ? '指数LOF' : '股票LOF';

        // 添加排序成功日志
        //console.log(`LOF基金排序成功：${tableType}表格，共${rows.length}行数据按溢价率从大到小排序完成`);

        sortedRows.forEach(row => tbody.appendChild(row));
    }

    // 全局变量，用于存储Observer实例
    let observer = null;

    /**
     * 设置页面变化监听器，当表格内容或可见性变化时重新排序
     */
    function setupObserver() {
        // 创建MutationObserver实例，监听DOM变化
        observer = new MutationObserver((mutations) => {
            // 检查是否有需要重新排序的变化
            const shouldRecheck = mutations.some(mutation => {
                // 元素样式发生变化（可能影响表格可见性）
                return mutation.type === 'attributes' && mutation.attributeName === 'style';
            });

            // 如果检测到相关变化，延迟执行排序
            if (shouldRecheck) {
                setTimeout(main, 800);
            }
        });

        // 配置并启动监听器，监听整个文档的变化
        observer.observe(document.body, {
            childList: true,        // 监听子节点变化
            subtree: true,          // 监听整个DOM树
            attributes: true,       // 监听属性变化
            attributeFilter: ['style', 'class']  // 只监听style和class属性
        });
    }

    /**
     * 主函数：执行排序逻辑
     */
    function main() {
        // 查找当前可见的表格数据
        const tableData = findTableData();
        // 表格不存在或无数据则不执行
        if (!tableData || tableData.rows.length === 0) return;

        // 在排序前暂时禁用Observer，避免无限循环
        if (observer) {
            observer.disconnect();
        }

        // 执行排序
        sortByDiscountRate(tableData.rows);

        // 排序完成后重新启用Observer
        if (observer) {
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class']
            });
        }
    }

    // 初始执行排序
    main();
    // 设置页面变化监听器，实现动态排序
    setupObserver();

})();

/**
 * 脚本运行逻辑分析：
 * 1. 脚本加载：当页面加载完成后（document-end），脚本自动执行
 * 2. 初始排序：调用main()函数，查找当前可见的LOF基金表格并按溢价率排序
 * 3. 动态监听：设置MutationObserver监听页面变化
 * 4. 智能触发：当检测到表格内容变化（如新增行）或表格可见性变化（如切换标签）时
 * 5. 延迟重排：等待500ms确保数据加载完成后，重新执行排序逻辑
 *
 * 表格识别机制：
 * - 指数LOF表格：容器#topic_index，表格#flex_index
 * - 股票LOF表格：容器#topic_stock，表格#flex_stock
 * - 通过检测容器的display样式判断当前哪个表格可见
 *
 * 排序规则：
 * - 从表格行中提取data-name="discount_rt"的单元格内容
 * - 将溢价率文本（如"12.34%"）解析为数字
 * - 按溢价率数值从大到小排序
 * - 通过DOM操作重新排列表格行顺序
 */
