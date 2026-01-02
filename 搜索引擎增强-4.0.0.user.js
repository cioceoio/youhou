// ==UserScript==
// @name              搜索引擎增强
// @namespace         search_enhance_namespace
// @version           4.0.0
// @description       搜索引擎导航增强，支持拖拽、缩放、折叠和状态记忆，加载更稳定。
// @author            zyh
// @match             *://www.baidu.com/*
// @match             *://www.so.com/s*
// @match             *://www.sogou.com/web*
// @match             *://cn.bing.com/search*
// @match             *://www.bing.com/search*
// @match             *://www.google.com/search*
// @match             *://www.google.com.hk/search*
// @grant             GM_getValue
// @grant             GM_setValue
// @license           MIT
// @downloadURL       https://update.greasyfork.org/scripts/524101/%E6%90%9C%E7%B4%A2%E5%BC%95%E6%93%8E%E5%A2%9E%E5%BC%BA.user.js
// @updateURL         https://update.greasyfork.org/scripts/524101/%E6%90%9C%E7%B4%A2%E5%BC%95%E6%93%8E%E5%A2%9E%E5%BC%BA.meta.js
// ==/UserScript==

(function() {
    'use strict';

    /**
     * SearchEnhancer 类，用于封装所有功能
     */
    class SearchEnhancer {
        /**
         * 构造函数，脚本的入口
         */
        constructor() {
            this.host = window.location.host;
            this.initData();

            // 检查当前网站是否是目标搜索引擎
            this.engineConfig = this.searchEnginesData.find(engine => this.host.includes(engine.host));
            if (!this.engineConfig) {
                return; // 如果不是，则不执行任何操作
            }

            // 使用 waitForElement 等待搜索框加载完成后，再初始化UI
            // 这是为了确保我们操作的DOM元素已经存在
            this.waitForElement(this.engineConfig.elementInput, () => {
                this.settings = this.loadSettings();
                // 确保折叠前的高度有一个合理的默认值
                this.lastExpandedHeight = this.settings.height > 40 ? this.settings.height : 400;
                this.initUI();
            });
        }

        /**
         * 初始化搜索引擎和导航链接的数据
         */
        initData() {
            this.searchEnginesData = [
                {host: "baidu.com", name: "百度", elementInput: "#kw"},
                {host: "so.com", name: "360搜索", elementInput: "#keyword"},
                {host: "sogou.com", name: "搜狗", elementInput: "#upquery"},
                {host: "bing.com", name: "必应", elementInput: "#sb_form_q"},
                {host: "google.com", name: "谷歌", elementInput: "input[name='q'],textarea[name='q']"}
            ];
            this.navigationData = [
                {"name": "", "list": [
                    {"name": "秘塔", "url": "https://metaso.cn/?q=@@"},
                    {"name": "必应", "url": "https://cn.bing.com/search?q=@@"},
                    {"name": "搜狗", "url": "https://www.sogou.com/web?ie=utf8&query=@@"},
                    //{"name": "精准搜", "url": "https://cn.bing.com/search?q=:%22@@%22"},
                    {"name": "搜标题", "url": "https://cn.bing.com/search?q=:intitle:@@"},
                    {"name": "Github", "url": "https://www.github-zh.com/search/result?q=@@"},
                    {"name": "Gite", "url": "https://so.gitee.com/?q=@@"},
                    {"name": "B+doc88", "url": "https://cn.bing.com/search?q=site%3A+doc88.com+@@"},
                    {"name": "B+52PJ", "url": "https://cn.bing.com/search?q=site%3A+52pojie.cn+@@"},
                    {"name": "Crx", "url": "https://www.crxsoso.com/search?keyword=@@&store=chrome"},
                ]},
                {"name": "", "list": [
                    {"name": "捕娱兔", "url": "https://www.buyutu.com/"},
                    {"name": "快盘搜", "url": "http://www.kksou.net/search?wk=@@"},
                    {"name": "毕方", "url": "https://www.iizhi.cn/resource/search/@@"},
                    {"name": "盘搜pro", "url": "https://panso.pro/search?q=@@"},
                    {"name": "6盘搜", "url": "https://s.6miu.com/word.html?kw=@@"},
                    {"name": "热盘", "url": "http://www.repanso.com/q?type=0&wd=@@"},
                    //{"name": "盘搜", "url": "https://www.pansearch.me/search?keyword=@@"},
                    {"name": "皮卡搜", "url": "https://www.pikasoo.top/search/?q=@@"},
                    {"name": "口袋云", "url": "https://www.woxiangsou.com/home?keyword=@@"},
                    {"name": "学搜", "url": "https://www.xuesousou.net/search?q=@@"},
                    {"name": "盘么么", "url": "http://www.panmeme.com/query?key=@@"},
                    {"name": "小兔搜", "url": "https://xiaotusoso.com/sopan?q=@@"},
                    {"name": "搜吧", "url": "http://www.sousuo8.com/s?wd=@@"},
                    {"name": "搜Ali", "url": "https://soali.net/search?keyword=@@&app=bnd"},
                    {"name": "海搜", "url": "https://haisou.cc/?query=@@"},
                    {"name": "阿里搜", "url": "https://aliso.cc/s/@@-1-0.html"},
                ]},
                 {"name": "", "list": [
                     {"name": "豆丁", "url": "https://www.docin.com/search.do?nkey=@@"},
                     {"name": "淘豆", "url": "https://www.taodocs.com/s?q=@@"},
                     {"name": "原创力文", "url": "https://max.book118.com/search.html?q=@@"},
                     {"name": "道客", "url": "https://www.doc88.com/tag/@@"},
                     {"name": "百度", "url": "https://wenku.baidu.com/search?word=@@"},
                     {"name": "人人文库", "url": "https://www.renrendoc.com/search.html?q=@@"},
                ]},
                 /*{"name": "", "list": [
                    {"name": "谷粉学术", "url": "https://www.defineabc.com/scholar?hl=en&q=@@" },
                    {"name": "Aminer", "url": "https://www.aminer.cn/search?t=b&q=@@"},
                ]}*/
            ];
        }

        /**
         * 初始化UI：创建面板、应用样式、绑定事件
         */
        initUI() {
            if (document.getElementById('search-enhancer-panel')) return; // 防止重复创建
            this.createPanel();
            this.applyStyles();
            this.attachEventListeners();
        }

        /**
         * 从油猴存储中加载设置
         */
        loadSettings() {
            const defaults = { x: 1308, y: 16, width: 230, height: 456, isCollapsed: false };
            const saved = GM_getValue(`enhancer_settings_${this.host}`) || {};
            return { ...defaults, ...saved }; // 合并默认值和已保存值
        }

        /**
         * 保存当前设置到油猴存储
         */
        saveSettings() {
            if (!this.panel) return;
            const currentSettings = {
                x: this.panel.offsetLeft,
                y: this.panel.offsetTop,
                width: this.panel.offsetWidth,
                height: this.lastExpandedHeight, // 关键：总是保存展开时的高度
                isCollapsed: this.panel.classList.contains('collapsed')
            };
            GM_setValue(`enhancer_settings_${this.host}`, currentSettings);
        }

        /**
         * 创建UI面板的HTML结构
         */
        createPanel() {
            let html = '<div class="nav-header"><div class="nav-title">搜索导航</div><button class="nav-toggle-btn">▲</button></div>';
            html += '<div class="nav-content">';
            this.navigationData.forEach(cat => {
                html += `<div class="nav-section"><div class="section-title">${cat.name}</div><div class="nav-links">`;
                cat.list.forEach(item => {
                    html += `<a href="#" data-url="${item.url}">${item.name}</a>`;
                });
                html += '</div></div>';
            });
            html += '</div><div class="resize-handle"></div>';

            this.panel = document.createElement('div');
            this.panel.id = 'search-enhancer-panel';
            this.panel.innerHTML = html;
            document.body.appendChild(this.panel);

            // 如果保存的状态是折叠的，则初始化为折叠状态
            if (this.settings.isCollapsed) {
                this.panel.classList.add('collapsed');
                this.panel.querySelector('.nav-content').style.display = 'none';
                this.panel.querySelector('.nav-toggle-btn').textContent = '▼';
            }
        }

        /**
         * 应用CSS样式
         */
        applyStyles() {
            const s = this.settings;
            const css = `
                #search-enhancer-panel {
                    position:fixed; top:${s.y}px; left:${s.x}px; width:${s.width}px; height:${s.isCollapsed ? 'auto' : `${s.height}px`};
                    min-width:200px; min-height:40px; z-index:999999; display:flex; flex-direction:column;
                    background:rgba(255,255,255,0.40); border-radius:10px; box-shadow:0 5px 20px rgba(0,0,0,0.12);
                    backdrop-filter:blur(8px); border:1px solid rgba(0,0,0,0.08); user-select:none; overflow:hidden; transition: height 0.2s ease-in-out;
                }
                #search-enhancer-panel.no-transition { transition: none !important; }
                #search-enhancer-panel.collapsed { height: auto !important; }
                .nav-header { display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(0,0,0,0.04); cursor:move; flex-shrink: 0; }
                .nav-title { font-weight:600; color:#333; }
                .nav-toggle-btn { border:none; background:none; cursor:pointer; font-size:16px; color:#555; padding:5px; }
                .nav-content { padding:10px 15px; overflow-y:auto; flex-grow:1; }
                .nav-section { margin-bottom:12px; }
                .section-title { font-size:13px; font-weight:500; color:#666; margin-bottom:8px; padding-bottom:4px; border-bottom:1px solid #eee; }
                .nav-links { display:flex; flex-wrap:wrap; gap:8px; }
                .nav-links a { padding:4px 9px; color:#333; text-decoration:none; font-size:13px; background:#f1f1f1; border-radius:5px; transition:all 0.2s; }
                .nav-links a:hover { background:#007bff; color:white; transform:translateY(-1px); }
                .resize-handle { position:absolute; bottom:0; right:0; width:15px; height:15px; cursor:se-resize; z-index:10; }
            `;
            const styleEl = document.createElement('style');
            styleEl.textContent = css;
            document.head.appendChild(styleEl);
        }

        /**
         * 绑定所有事件监听器
         */
        attachEventListeners() {
            const header = this.panel.querySelector('.nav-header');
            const toggleBtn = this.panel.querySelector('.nav-toggle-btn');
            const resizeHandle = this.panel.querySelector('.resize-handle');

            // 折叠/展开
            toggleBtn.addEventListener('click', e => {
                e.stopPropagation();
                const isCollapsed = this.panel.classList.toggle('collapsed');
                this.panel.querySelector('.nav-content').style.display = isCollapsed ? 'none' : 'block';
                toggleBtn.textContent = isCollapsed ? '▼' : '▲';
                if (!isCollapsed) {
                    this.panel.style.height = `${this.lastExpandedHeight}px`;
                }
                this.saveSettings();
            });

            // 链接点击
            this.panel.querySelectorAll('.nav-links a').forEach(link => {
                link.addEventListener('click', e => {
                    e.preventDefault();
                    const keywordInput = document.querySelector(this.engineConfig.elementInput);
                    const keyword = keywordInput ? keywordInput.value : '';
                    const url = e.target.dataset.url.replace('@@', encodeURIComponent(keyword));
                    window.open(url, '_blank');
                });
            });

            // 拖拽和缩放
            const dragOrResize = (e, type) => {
                e.preventDefault();
                this.panel.classList.add('no-transition'); // 拖拽时禁用过渡动画，防止卡顿

                let startX = e.clientX, startY = e.clientY;
                let initialX = this.panel.offsetLeft, initialY = this.panel.offsetTop;
                let initialW = this.panel.offsetWidth, initialH = this.panel.offsetHeight;
                let animationFrameId = null;

                const onMove = (moveEvent) => {
                    if (animationFrameId) {
                        cancelAnimationFrame(animationFrameId);
                    }
                    animationFrameId = requestAnimationFrame(() => {
                        let dx = moveEvent.clientX - startX, dy = moveEvent.clientY - startY;
                        if (type === 'drag') {
                            let newX = Math.max(0, Math.min(window.innerWidth - this.panel.offsetWidth, initialX + dx));
                            let newY = Math.max(0, Math.min(window.innerHeight - this.panel.offsetHeight, initialY + dy));
                            this.panel.style.left = `${newX}px`;
                            this.panel.style.top = `${newY}px`;
                        } else { // resize
                            let newW = Math.max(200, initialW + dx);
                            let newH = Math.max(100, initialH + dy);
                            this.panel.style.width = `${newW}px`;
                            if (!this.panel.classList.contains('collapsed')) {
                                this.panel.style.height = `${newH}px`;
                            }
                        }
                    });
                };

                const onEnd = () => {
                    if (animationFrameId) {
                        cancelAnimationFrame(animationFrameId);
                    }
                    if (!this.panel.classList.contains('collapsed')) {
                        this.lastExpandedHeight = this.panel.offsetHeight;
                    }
                    this.saveSettings();
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onEnd);
                    this.panel.classList.remove('no-transition'); // 拖拽结束后恢复过渡动画
                };

                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onEnd);
            };

            header.addEventListener('mousedown', e => { if (e.target === header || e.target.classList.contains('nav-title')) dragOrResize(e, 'drag'); });
            resizeHandle.addEventListener('mousedown', e => dragOrResize(e, 'resize'));
        }

        /**
         * 等待指定元素出现在DOM中
         * @param {string} selector - CSS选择器
         * @param {function} callback - 元素出现后执行的回调函数
         */
        waitForElement(selector, callback) {
            const interval = setInterval(() => {
                if (document.querySelector(selector)) {
                    clearInterval(interval);
                    callback();
                }
            }, 200);
        }
    }

    // 确保在DOM加载完成后再执行脚本，这是最关键的一步
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new SearchEnhancer());
    } else {
        // 如果DOM已经加载完成，则直接执行
        new SearchEnhancer();
    }

})();
