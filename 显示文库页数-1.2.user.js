// ==UserScript==
// @name         显示文库页数
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  显示百度,360文库文档总页数
// @author       YourName
// @match        https://wenku.baidu.com/*
// @match        https://wenku.so.com/*
// @grant        GM_notification
// ==/UserScript==

(function() {
    'use strict';

    // 页数获取
    function getPageCount() {
    if (window.location.hostname === 'wenku.baidu.com') {
        // 百度文库
        const scripts = Array.from(document.scripts);
        const targetScript = scripts.find(s => s.textContent.includes('pageData'));
        if (!targetScript) return null;

        const pageMatch = targetScript.textContent.match(/"docInfo":\s*{.*?"page"\s*:\s*"(\d+)"/);
        return pageMatch ? pageMatch[1] : null;
    } else {
        // 360文库
        const scripts = Array.from(document.scripts);
        const targetScript = scripts.find(s => s.textContent.includes('DocInfo'));
        if (!targetScript) return null;

        const pageMatch = targetScript.textContent.match(/"DocRealNum":\s*(\d+)/);
        return pageMatch ? pageMatch[1] : null;
    }
}

    // 创建悬浮框
    function createPageIndicator(pages) {
        const indicator = document.createElement('div');
        Object.assign(indicator.style, {
            position: 'fixed',
            top: '8.5%',
            left: window.location.hostname === 'wenku.so.com' ? '62%' : '55%',
            transform: 'translateX(-50%)',
            padding: '5px 10px',
            background: '#22ab82',
            color: 'white',
            borderRadius: '5px',
            zIndex: '99999',
            fontSize: '15px',
            boxShadow: '0 3px 10px rgba(0,0,0,0.2)',
            fontFamily: 'Arial, sans-serif'
        });
        indicator.id = 'page-count-indicator';
        indicator.textContent = `页数：${pages}`;
        return indicator;
    }

    // 使用MutationObserver确保元素插入
    function init() {
        const checkAndShow = () => {
            const pages = getPageCount();
            if (pages && !document.getElementById('page-count-indicator')) {
                document.body.appendChild(createPageIndicator(pages));
            }
        };

        // 立即执行首次检测
        checkAndShow();

        // 添加滚动事件监听
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) checkAndShow();
        });

        // 增强MutationObserver配置
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(() => checkAndShow());
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true
        });
    }

    // 添加延迟确保页面加载
    setTimeout(init, 500);
})();