// ==UserScript==
// @name         已点击网址链接变色
// @namespace    http://tampermonkey.net/
// @match        *:\//*/*
// @match        *://www.52pojie.cn/*
// @match        *://cn.bing.com/search*
// @match        *://gf.qytechs.cn/*
// @grant        市政502
// @version      2025.6.22
// @description  zh-cn
// @license      GNU General Public License v3.0
// @downloadURL https://update.greasyfork.org/scripts/540470/%E7%82%B9%E5%87%BB%E7%BD%91%E5%9D%80%E9%93%BE%E6%8E%A5%E5%8F%98%E8%89%B2%20Persistent%20Red%20Link.user.js
// @updateURL https://update.greasyfork.org/scripts/540470/%E7%82%B9%E5%87%BB%E7%BD%91%E5%9D%80%E9%93%BE%E6%8E%A5%E5%8F%98%E8%89%B2%20Persistent%20Red%20Link.meta.js
// ==/UserScript==

(function () {
    'use strict';

    // 从 localStorage 中获取已访问链接集合
    const visitedLinks = JSON.parse(localStorage.getItem('visitedLinks') || '[]');

    // 页面加载时，为已访问链接应用灰色样式
    document.querySelectorAll('a').forEach(link => {
        const linkUrl = link.href;

        // 如果链接已在 visitedLinks 中，直接应用颜色样式
        if (visitedLinks.includes(linkUrl)) {
            link.style.setProperty('color', '#A8A8A8', 'important');
        }

        // 添加点击事件监听器
        link.addEventListener('click', () => {
            // 如果链接未在 visitedLinks 中，添加进去并保存
            if (!visitedLinks.includes(linkUrl)) {
                visitedLinks.push(linkUrl);
                localStorage.setItem('visitedLinks', JSON.stringify(visitedLinks));
                // 强制应用颜色样式
                link.style.setProperty('color', '#A8A8A8', 'important');
            }
        });
    });
})();