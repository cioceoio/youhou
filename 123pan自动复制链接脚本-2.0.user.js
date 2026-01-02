// ==UserScript==
// @name         123pan自动复制链接脚本
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  123pan自动复制链接脚本，精简版
// @author       You
// @match        *://*.123pan.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=123pan.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 状态标记
    let hasCopied = false,
        hasSetShareOptions = false;

    /**
     * 通用工具函数：查找并点击指定文本的元素
     * @param {HTMLElement} context 查找上下文
     * @param {string} selector CSS选择器
     * @param {string} targetText 目标文本
     * @returns {boolean} 是否找到并点击
     */
    function findAndClick(context, selector, targetText) {
        const elements = context.querySelectorAll(selector);
        for (const element of elements) {
            if ((element.textContent || element.innerText).trim() === targetText) {
                element.dispatchEvent(new MouseEvent('click', {
                    bubbles: true, cancelable: true, view: window
                }));
                return true;
            }
        }
        return false;
    }

    /**
     * 检查并处理分享链接设置对话框
     */
    function handleShareSettings() {
        if (hasSetShareOptions) return;

        const modal = document.querySelector('.Modals-ShareModal-container');
        if (modal && modal.textContent.includes('设置分享主题') && modal.textContent.includes('有效期')) {
            //console.log('123pan脚本：检测到分享设置对话框');

            // 点击30天按钮
            if (findAndClick(modal, '.mfy-ratio-item1', '30天')) {
                setTimeout(() => {
                    // 点击创建链接按钮
                    if (findAndClick(modal.closest('.ant-modal'), 'button', '创建链接')) {
                        hasSetShareOptions = true;
                        //console.log('123pan脚本：分享设置完成');
                    }
                }, 300);
            }
        }
    }

    /**
     * 检查并处理分享成功对话框
     */
    function handleShareSuccess() {
        const modal = document.querySelector('.Modals-FileSysModal-CreateSuccess');
        if (modal && modal.textContent.includes('复制链接')) {
            //console.log('123pan脚本：检测到分享成功对话框，等待复制');

            setTimeout(() => {
                if (!hasCopied) {
                    // 点击复制链接按钮
                    if (findAndClick(modal, 'button', '复制链接')) {
                        hasCopied = true;
                        //console.log('123pan脚本：链接已复制');
                    }
                }
                // 重置状态
                hasSetShareOptions = false;
            }, 600);
        }
    }

    /**
     * 监听"创建链接"按钮，点击时重置复制状态
     */
    function listenCreateLinkButton() {
        setInterval(() => {
            document.querySelectorAll('button').forEach(button => {
                if (!button.hasAttribute('data-listener-added') &&
                    (button.textContent || button.innerText).trim() === '创建链接') {

                    button.addEventListener('click', () => {
                        hasCopied = false;
                        //console.log('123pan脚本：创建链接按钮被点击，重置复制状态');
                    });
                    button.setAttribute('data-listener-added', 'true');
                }
            });
        }, 600);
    }

    // 主函数：定期检查
    function start() {
        console.log('123pan自动复制链接脚本已启动 (v2.0)');

        // 初始检查
        setTimeout(handleShareSuccess, 600);

        // 定期检查
        setInterval(() => {
            handleShareSettings();
            handleShareSuccess();
        }, 500);

        // 启动监听
        listenCreateLinkButton();
    }

    // 启动脚本
    start();

})();