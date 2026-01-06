// ==UserScript==
// @name         集思录 可转债 三低
// @namespace    http://tampermonkey.net/
// @version      1.3.3
// @description  可转债三低策略：选取价格<150（价格可调），溢价率<60%，剩余规模<5亿，按价格+溢价率*100+剩余规模*10 排序。已排除公告强赎、强赎满足天数小于8天、信用等级低、正股ST、正股股价低于2元、净资产为负，剩余年限小于1年，可转债概念为空。
// @author       melville0333
// @match        https://www.jisilu.cn/data/cbnew/*
// @match        https://www.jisilu.cn/web/data/cb*
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 配置区（小白可改的地方） ====================
    let defaultPriceThreshold = 150;   // 默认现价阈值，超过此价格的转债三低显示9999
    let ascending = true;              // 三低排序方向：true=从小到大（好券在前）

    // ==================== 全局变量（脚本运行时使用） ====================
    let indexes = {};                  // 记录各关键列的位置（因为集思录表头可能变）
    let priceThreshold = defaultPriceThreshold;  // 当前现价阈值（输入框可改）
    let doubleLowIndex = -1;           // 双低列的位置索引
    let calculationCount = 0;          // 计算次数计数器
    let maxCalculations = 6;           // 最大计算次数

    // ==================== 计算三低得分的核心函数 ====================
    // 输入：单行所有单元格文字数组（rowData）, 转债名称完整HTML内容（bondNameFull）
    // 输出：得分（正常数字或9999表示垃圾券）
    function calculateScore(rowData, bondNameFull = '') {
        // 安全读取各列数据（找不到列就用默认值防止崩溃）
        const price        = parseFloat(rowData[indexes.price] || 0);           // 现价
        const stockPrice   = parseFloat(rowData[indexes.stockPrice] || 999);    // 正股价
        const pb           = parseFloat(rowData[indexes.pb] || 999);            // 正股PB
        const remainYearStr= (rowData[indexes.remainYear] || '').trim();        // 剩余年限（字符串，可能带"天"）
        const remainYear   = parseFloat(remainYearStr) || 999;                  // 转成数字
        const redeemStatus = (rowData[indexes.redeemStatus] || '').trim();      // 强赎状态
        const premium      = parseFloat((rowData[indexes.premium] || '0%').replace('%', '')) || 0;  // 转股溢价率
        const scale        = parseFloat(rowData[indexes.scale] || 0);           // 剩余规模（亿元）

        // ==================== 垃圾券过滤条件（满足任一就直接9999） ====================
        if (price > priceThreshold) return 9999;                                // 现价太高
        if (stockPrice < 2) return 9999;                                        // 正股仙股
        if (pb < 1) return 9999;                                                // 正股破净
        if (remainYearStr.includes('天')) return 9999;                          // 剩余年限不到1年（显示“XX天”）
        if (remainYear < 1.5) return 9999;                                      // 剩余年限太短
        if (redeemStatus.includes('最后交易') ||
            redeemStatus.includes('已公告强赎') ||
            redeemStatus.includes('已满足强赎条件')) return 9999;                 // 各种强赎状态
        // 强赎倒计时≤8天
        const dayMatch = redeemStatus.match(/至少还需(\d+)天/);
        if (dayMatch && parseInt(dayMatch[1], 10) <= 8) return 9999;

        // 检查转债名称HTML中是否包含公告要强赎
        if (bondNameFull.includes('公告要强赎')) return 9997;

        // 检查转债名称HTML中是否包含最后转股
        if (bondNameFull.includes('最后转股')) return 9998;

        // ==================== 正常三低计算 ====================
        return (price + premium + scale * 10).toFixed(2);
    }

    // ==================== 更新三低得分列 ====================
    function updateThreeLowScores(dataRows) {
        //console.log(`开始更新${dataRows.length}行的三低评分...`);
        dataRows.forEach((row, i) => {
            //console.log(`处理第${i+1}行数据...`);
            // 读取当前行所有文字
            const rowData = Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim());
            //console.log(`第${i+1}行数据长度: ${rowData.length}`);

            // 获取转债名称的完整信息（包括子元素的title属性）
            let bondNameFull = '';
            if (indexes.bondName !== -1 && row.children[indexes.bondName]) {
                const bondNameCell = row.children[indexes.bondName];
                bondNameFull = bondNameCell.innerHTML.trim(); // 获取完整HTML内容
                // 额外检查所有子元素的title属性
                const titleElements = bondNameCell.querySelectorAll('[title]');
                titleElements.forEach(el => {
                    bondNameFull += ' ' + el.getAttribute('title');
                });
            }

            const score = calculateScore(rowData, bondNameFull);
            //console.log(`第${i+1}行评分: ${score}`);

            // 创建或获取"三低"单元格（放在排名列前面）
            let scoreCell = row.querySelector('.jsl-three-low');
            if (!scoreCell) {
                scoreCell = document.createElement('td');
                scoreCell.classList.add('jsl-three-low');

                if (window.doubleLowIndex !== -1) {
                    // 找到双低列位置，在其后插入三低列
                    const targetPosition = window.doubleLowIndex + 1; // 双低列后的位置，与表头保持一致
                    const referenceCell = row.children[targetPosition];
                    if (referenceCell) {
                        row.insertBefore(scoreCell, referenceCell);
                    } else {
                        row.appendChild(scoreCell);
                    }
                } else {
                    // 未找到双低列，默认添加在末尾
                    const rankCell = row.querySelector('.jsl-rank');
                    if (rankCell) {
                        row.insertBefore(scoreCell, rankCell);
                    } else {
                        row.appendChild(scoreCell);
                    }
                }
            }

            scoreCell.textContent = score;
            scoreCell.style.fontWeight = 'bold';
            scoreCell.style.textAlign = 'center';
            scoreCell.style.padding = '1px 1px';
            scoreCell.style.fontSize = '12px';
            scoreCell.style.minWidth = '80px';
            scoreCell.style.width = '80px';
            scoreCell.style.transition = 'background-color 0.3s ease, color 0.3s ease'; // 添加过渡效果

            // 延时涂色，确保数据完全加载
            setTimeout(() => {
                if (score > 9990 && score <= 9999) {
                    scoreCell.style.backgroundColor = '#ffcdd2';  // 垃圾券红底
                    //scoreCell.style.color = 'white';
                } else {
                    scoreCell.style.backgroundColor = '#c8e6c9';  // 正常绿底
                }
            }, 500);
        });
        console.log('所有行三低评分更新完成！');
    }

    // ==================== 更新排名列（实时） ====================
    function updateRanks(dataRows) {
        dataRows.forEach((row, i) => {
            let rankCell = row.querySelector('.jsl-rank');
            if (!rankCell) {
                rankCell = document.createElement('td');
                rankCell.classList.add('jsl-rank');

                if (window.doubleLowIndex !== -1) {
                    // 找到双低列位置，在其后插入排名列
                    const targetPosition = window.doubleLowIndex + 2; // 双低列后的第二个位置（三低列后），与表头保持一致
                    const referenceCell = row.children[targetPosition];
                    if (referenceCell) {
                        row.insertBefore(rankCell, referenceCell);
                    } else {
                        row.appendChild(rankCell);
                    }
                } else {
                    // 未找到双低列，默认添加在末尾
                    row.appendChild(rankCell);
                }
            }
            const rank = i + 1;
            rankCell.textContent = rank;
            rankCell.style.fontWeight = 'bold';
            rankCell.style.textAlign = 'center';
            rankCell.style.padding = '1px 1px';
            rankCell.style.minWidth = '50px';
            rankCell.style.width = '50px';
            rankCell.style.fontSize = '12px';
            rankCell.style.transition = 'background-color 0.3s ease, color 0.3s ease'; // 添加过渡效果

            // 延时涂色，确保数据完全加载
            setTimeout(() => {
                // 每5名标红（5、10、15...）
                if (rank % 5 === 0) {
                    rankCell.style.backgroundColor = '#ffcdd2';
                    //rankCell.style.color = 'white';
                } else {
                    rankCell.style.backgroundColor = '#e3f2fd';
                }
            }, 500);
        });
    }



    // ==================== 三低点击排序 ====================
    function sortByThreeLow(dataRows, headerText) {
        // 先改变排序方向
        ascending = !ascending;

        dataRows.forEach(row => {
            const rowData = Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim());
            // 获取转债名称的完整信息（包括子元素的title属性）
            let bondNameFull = '';
            if (indexes.bondName !== -1 && row.children[indexes.bondName]) {
                const bondNameCell = row.children[indexes.bondName];
                bondNameFull = bondNameCell.innerHTML.trim(); // 获取完整HTML内容
                // 额外检查所有子元素的title属性
                const titleElements = bondNameCell.querySelectorAll('[title]');
                titleElements.forEach(el => {
                    bondNameFull += ' ' + el.getAttribute('title');
                });
            }
            row._tempScore = parseFloat(calculateScore(rowData, bondNameFull)) || 9999;
        });

        // 使用新的排序方向进行排序
        dataRows.sort((a, b) => ascending ? (a._tempScore - b._tempScore) : (b._tempScore - a._tempScore));

        const parent = dataRows[0].parentNode;
        dataRows.forEach(row => parent.appendChild(row));

        updateRanks(dataRows);
        // 显示与当前排序方向一致的箭头
        headerText.textContent = ascending ? '三低 ↓' : '三低 ↑';
    }

    // ==================== 主刷新函数（初始化 + 重新加载） ====================
    function refreshTable() {
        // 检查是否超过最大计算次数
        if (calculationCount >= maxCalculations) {
            console.log(`计算次数已达到上限（${maxCalculations}次），停止刷新表格`);
            return false;
        }

        calculationCount++;
        console.log(`JSL脚本开始刷新表格... (第${calculationCount}次计算)`);

        // 适配Vue.js + Element UI架构，查找表格数据行
        // 方法1: 使用前缀匹配查找所有Vue相关属性（data-v-）的行
        let vueRows = Array.from(document.querySelectorAll('tr[data-v-]'));
        console.log(`方法1 - 使用前缀匹配查找所有Vue相关行: ${vueRows.length}`);

        // 方法2: 如果前缀匹配结果不够，使用属性过滤器进行更严格的匹配
        if (vueRows.length < 10) {
            vueRows = Array.from(document.querySelectorAll('tr')).filter(row => {
                const hasVueAttr = Array.from(row.attributes).some(attr =>
                    attr.name.startsWith('data-v-') && /^[a-f0-9]{8}$/i.test(attr.name.replace('data-v-', ''))
                );
                return hasVueAttr;
            });
            console.log(`方法2 - 使用属性过滤器查找Vue相关行: ${vueRows.length}`);
        }

        // 方法4: 查找包含大量单元格的行（可能是数据行）
        const cellCountRows = Array.from(document.querySelectorAll('tr')).filter(row =>
            row.querySelectorAll('td').length > 10
        );
        console.log(`方法4 - 查找包含大量单元格的行: ${cellCountRows.length}`);

        let allRows = vueRows.length > 0 ? vueRows : cellCountRows;

        console.log(`最终找到表格行数量: ${allRows.length}`);

        // 如果数据行数量过少，可能需要等待数据加载完成
        if (allRows.length < 10) {
            console.log(`表格数据行数量不足（${allRows.length}行），可能正在加载中...`);
            console.log('Vue行数量:', vueRows.length, '大单元格行数量:', cellCountRows.length);
            return false;
        }

        // 查找表头 - 适配Vue.js架构
        let headerRow = null;

        // 方法1: 查找带有Vue特定属性的表头行
        const vueHeaderRows = Array.from(document.querySelectorAll('tr')).filter(row => {
            // 检查是否包含Vue特定属性，并且包含th元素或大量td元素
            const hasVueAttr = Array.from(row.attributes).some(attr =>
                attr.name.startsWith('data-v-') && /^[a-f0-9]{8}$/i.test(attr.name.replace('data-v-', ''))
            );
            const hasManyTh = row.querySelectorAll('th').length > 5;
            const hasManyTd = row.querySelectorAll('td').length > 15;
            return hasVueAttr && (hasManyTh || hasManyTd);
        });

        if (vueHeaderRows.length > 0) {
            headerRow = vueHeaderRows[0];
            //console.log('方法1 - 找到Vue表头行:', headerRow);
        }

        // 方法2: 如果找不到Vue表头，查找传统表头
        if (!headerRow) {
            console.log('尝试方法2 - 查找传统表头行...');
            const allTableRows = Array.from(document.querySelectorAll('tr'));
            for (let row of allTableRows) {
                if (row.querySelectorAll('th').length > 10 ||
                    row.querySelectorAll('td').length > 15) {
                    headerRow = row;
                    console.log('方法2 - 找到传统表头行:', headerRow);
                    break;
                }
            }
        }

        // 方法3: 尝试查找表格容器中的第一个行
        if (!headerRow) {
            console.log('尝试方法3 - 查找表格容器中的第一个行...');
            const tables = document.querySelectorAll('table');
            for (let table of tables) {
                const firstRow = table.querySelector('tr');
                if (firstRow) {
                    headerRow = firstRow;
                    console.log('方法3 - 找到表格容器中的第一个行:', headerRow);
                    break;
                }
            }
        }

        // 方法4: 根据文本内容查找表头
        if (!headerRow) {
            console.log('尝试方法4 - 根据文本内容查找表头...');
            const allRows = Array.from(document.querySelectorAll('tr'));
            for (let row of allRows) {
                const cells = Array.from(row.querySelectorAll('th, td')).map(cell => cell.textContent.trim());
                // 检查是否包含多个关键表头文本
                const keyTexts = ['名称', '代码', '现价', '涨跌幅', '正股价', '转股溢价率'];
                const matchCount = keyTexts.filter(text => cells.some(cell => cell.includes(text))).length;

                if (matchCount >= 3) {
                    headerRow = row;
                    console.log('方法4 - 根据文本内容找到表头:', headerRow);
                    break;
                }
            }
        }

        if (!headerRow) {
            console.log('所有表头查找方法均失败，无法找到表头行');
            console.log('Vue表头行数量:', vueHeaderRows.length);
            console.log('传统表头行数量:', allTableRows.filter(r => r.querySelectorAll('th').length > 10).length);
            console.log('表格数量:', document.querySelectorAll('table').length);
            return false;
        }

        //console.log('找到表头行:', headerRow);

        // 动态识别列位置
        const headerTexts = Array.from(headerRow.querySelectorAll('th')).map(th => th.textContent.trim().replace(/\s+/g, ''));
        //console.log('表头文本内容:', headerTexts);

        // 调整列识别逻辑，更灵活地匹配列名
        indexes = {
            price:        headerTexts.findIndex(t => t.includes('现价')),
            stockPrice:   headerTexts.findIndex(t => t.includes('正股价')),
            pb:           headerTexts.findIndex(t => t.includes('正股PB')),
            premium:      headerTexts.findIndex(t => t.includes('转股溢价率')),
            // 更灵活地匹配强赎状态列
            redeemStatus: headerTexts.findIndex(t => t.includes('强赎') || t.includes('赎回') || t.includes('强赎状态')),
            remainYear:   headerTexts.findIndex(t => t.includes('剩余年限')),
            scale:        headerTexts.findIndex(t => t.includes('剩余规模')),
            // 匹配转债名称列
            bondName:     headerTexts.findIndex(t => t.includes('转债名称') || t.includes('名称'))
        };
        //console.log('识别的列索引:', indexes);

        // 调整关键列检查，只检查绝对必需的列
        const criticalColumns = ['price', 'premium', 'scale'];
        const missingCriticalColumns = criticalColumns
            .filter(key => indexes[key] === -1)
            .map(key => key);

        if (missingCriticalColumns.length > 0) {
            console.log('缺少绝对关键列:', missingCriticalColumns);
            console.log('表头文本:', headerTexts);
            console.log('实际识别的列索引:', indexes);
            return false;
        }

        // 对于非关键列，如果找不到则使用默认值
        const defaultValues = {
            redeemStatus: -1,
            remainYear: 999,
            pb: 1,
            stockPrice: 0
        };

        for (const [key, value] of Object.entries(defaultValues)) {
            if (indexes[key] === -1) {
                console.log(`列 "${key}" 不存在，将使用默认值`);
                indexes[key] = value;
            }
        }

        //console.log('最终列索引（包含默认值）:', indexes);

        // 过滤数据行 - 排除表头行，并确保行有足够的数据
        const dataRows = allRows.filter(r => {
            const isNotHeader = r !== headerRow;
            const hasEnoughCells = r.querySelectorAll('td').length > 10;
            const isVisible = r.offsetParent !== null; // 排除隐藏的行
            return isNotHeader && hasEnoughCells && isVisible;
        });

        //console.log(`过滤后的数据行数量: ${dataRows.length}`);

        // 只初始化一次表头
        if (!headerRow.querySelector('.jsl-three-low-header')) {
            // 三低表头
            const threeLowHeader = document.createElement('th');
            threeLowHeader.classList.add('jsl-three-low-header');
            threeLowHeader.style.cssText = 'position:relative;font-weight:bold;background:#ffeb3b;text-align:center;padding:1px 1px;font-size:13px;min-width:80px;width:80px';
            threeLowHeader.title = '按价格 + 溢价率 + 剩余规模*10 排序';

            const clickText = document.createElement('div');
            clickText.textContent = ascending ? '三低 ↓' : '三低 ↑';
            clickText.style.cursor = 'pointer';
            clickText.style.display = 'inline-block';
            threeLowHeader.appendChild(clickText);

            const inputArea = document.createElement('div');
            inputArea.style.marginTop = '4px';
            inputArea.style.fontSize = '12px';
            inputArea.innerHTML = '＞<input type="number" value="150" step="1" style="width:45px;padding:2px;font-size:12px" title="现价超过此值强制9999">';
            threeLowHeader.appendChild(inputArea);

            const input = inputArea.querySelector('input');
            input.value = priceThreshold;
            input.onchange = () => {
                const v = parseFloat(input.value);
                if (!isNaN(v) && v > 0) {
                    priceThreshold = v;
                    updateThreeLowScores(dataRows);
                }
            };

            clickText.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
                sortByThreeLow(dataRows, clickText);
            };

            // 修改原始表头的倒数第二列列宽
            const originalHeaders = Array.from(headerRow.querySelectorAll('th'));
            if (originalHeaders.length >= 3) {//
                const secondLastHeader = originalHeaders[originalHeaders.length - 3];
                secondLastHeader.style.width = '59px';
                secondLastHeader.style.minWidth = '59px';
            }

            // 排名表头
            const rankHeader = document.createElement('th');
            rankHeader.textContent = '排名';
            rankHeader.style.cssText = 'font-weight:bold;background:#64b5f6;text-align:center;padding:1px 1px;font-size:13px;min-width:50px;width:50px';

            // 查找双低列位置并在后面插入三低和排名列
            const doubleLowIndex = headerTexts.findIndex(t => t.includes('双低'));
            if (doubleLowIndex !== -1) {
                // 找到双低列，在其后面插入三低列
                const referenceHeader = headerRow.children[doubleLowIndex + 1];
                headerRow.insertBefore(threeLowHeader, referenceHeader);
                // 在三低列后插入排名列
                headerRow.insertBefore(rankHeader, threeLowHeader.nextSibling);
            } else {
                // 未找到双低列，默认添加到末尾
                headerRow.appendChild(threeLowHeader);
                headerRow.appendChild(rankHeader);
            }

            // 保存双低列索引到全局变量
            window.doubleLowIndex = doubleLowIndex;
        }

        updateThreeLowScores(dataRows);

        // 自动按三低评分排序（好券在前）
        console.log('开始自动按三低评分排序...');
        dataRows.forEach(row => {
            const rowData = Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim());
            // 获取转债名称的完整信息（包括子元素的title属性）
            let bondNameFull = '';
            if (indexes.bondName !== -1 && row.children[indexes.bondName]) {
                const bondNameCell = row.children[indexes.bondName];
                bondNameFull = bondNameCell.innerHTML.trim(); // 获取完整HTML内容
                // 额外检查所有子元素的title属性
                const titleElements = bondNameCell.querySelectorAll('[title]');
                titleElements.forEach(el => {
                    bondNameFull += ' ' + el.getAttribute('title');
                });
            }
            row._tempScore = parseFloat(calculateScore(rowData, bondNameFull)) || 9999;
        });

        // 按三低评分排序（根据当前ascending设置）
        dataRows.sort((a, b) => ascending ? (a._tempScore - b._tempScore) : (b._tempScore - a._tempScore));
        const parent = dataRows[0].parentNode;
        dataRows.forEach(row => parent.appendChild(row));

        updateRanks(dataRows);  // 排序后重新计算排名
        console.log('三低评分、排名更新和自动排序完成！');
        return true;
    }

    // ==================== 防卡死监听器 ====================
    let refreshTimer = null;
    const observer = new MutationObserver(() => {
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(refreshTable, 300);  // 300ms防抖
    });

    // ==================== 启动脚本 ====================
    let initAttempts = 0;

    // 网页加载状态检查和初始化函数
    function attemptInitialization() {
        console.log('开始尝试初始化脚本...');

        if (refreshTable()) {
            observer.observe(document.body, { childList: true, subtree: true });
            console.log('初始化成功！脚本加载完成！三低+排名全显示，任何操作实时更新，排名每5标红，剩余年限带"天"自动9999，阈值随便调！');

            // 强制刷新一次，确保数据完全同步
            setTimeout(() => {
                //console.log('执行强制刷新...');
                if (calculationCount < maxCalculations) {
                    refreshTable();
                    console.log('强制刷新完成！');
                } else {
                    console.log('已达到计算次数上限，跳过强制刷新');
                }
            }, 100);
            return true;
        } else {
            console.log('初始化失败，开始定时重试...');
            // 如果立即初始化失败，开始定时重试
            const initInterval = setInterval(() => {
                initAttempts++;
                console.log(`第${initAttempts}次初始化尝试...`);

                // 检查是否超过计算次数上限
                if (calculationCount >= maxCalculations) {
                    console.log(`达到计算次数上限（${maxCalculations}次），停止初始化重试`);
                    clearInterval(initInterval);
                    observer.disconnect();
                    return;
                }

                if (refreshTable()) {
                    clearInterval(initInterval);
                    observer.observe(document.body, { childList: true, subtree: true });
                    console.log('脚本加载完成！三低+排名全显示，任何操作实时更新，排名每5标红，剩余年限带"天"自动9999，阈值随便调！');

                    // 强制刷新一次，确保数据完全同步
                    setTimeout(() => {
                        //console.log('执行强制刷新...');
                        if (calculationCount < maxCalculations) {
                            refreshTable();
                            console.log('强制刷新完成！');
                        } else {
                            console.log('已达到计算次数上限，跳过强制刷新');
                        }
                    }, 100);
                } else if (initAttempts >= 15) {
                    console.log('初始化尝试超过15次，停止重试');
                    clearInterval(initInterval);
                }
            }, 800);  // 重试间隔800ms
            return false;
        }
    }

    // 网页加载状态检查和延迟初始化
    if (document.readyState === 'loading') {
        console.log('网页正在加载中，等待DOMContentLoaded事件...');
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOM加载完成，开始初始化脚本...');
            setTimeout(() => attemptInitialization(), 100);
        });
    } else if (document.readyState === 'interactive') {
        console.log('DOM已就绪但可能仍在加载资源，等待1000ms后初始化...');
        setTimeout(() => attemptInitialization(), 1000);
    } else {
        console.log('网页已完全加载，立即尝试初始化...');
        // 立即尝试一次初始化
        setTimeout(() => attemptInitialization(), 100);
    }

    // 监听滚动事件，表格进入视野时强制刷新（仅在初始化成功后）
    let scrollRetryCount = 0;
    window.addEventListener('scroll', () => {
        if (scrollRetryCount < 3 && calculationCount < maxCalculations) {
            console.log('检测到滚动，重新尝试初始化...');
            setTimeout(() => {
                if (refreshTable()) {
                    console.log('滚动触发初始化成功！');
                    // 强制刷新一次，确保数据完全同步
                    setTimeout(() => {
                        //console.log('执行强制刷新...');
                        if (calculationCount < maxCalculations) {
                            refreshTable();
                            console.log('强制刷新完成！');
                        } else {
                            console.log('已达到计算次数上限，跳过强制刷新');
                        }
                    }, 500);
                }
            }, 100);
            scrollRetryCount++;
        } else if (calculationCount >= maxCalculations) {
            console.log('已达到计算次数上限，停止滚动监听');
        }
    }, { passive: true });
})();