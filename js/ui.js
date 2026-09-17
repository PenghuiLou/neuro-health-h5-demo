/* ===========================================================
   ui.js —— 通用 UI 元件与工具
   包含：DOM 工具、线性图标、Toast、底部抽屉、弹窗、
        骨架屏、空态/错误态、页头、列表行、表单标签
   依赖：无
   =========================================================== */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* 由 HTML 字符串创建元素 */
  function el(html) {
    var wrap = document.createElement('div');
    wrap.innerHTML = String(html).trim();
    return wrap.firstElementChild;
  }
  function frag(html) {
    var wrap = document.createElement('div');
    wrap.innerHTML = String(html).trim();
    return wrap;
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------- 线性图标（统一 24×24，1.7px 线宽） ---------- */
  var ICONS = {
    home: 'M4 10.6 12 4.2l8 6.4V19a1 1 0 0 1-1 1h-4.2v-5.6H9.2V20H5a1 1 0 0 1-1-1z',
    chat: 'M4.5 5.5h15v10h-9l-6 4.4z',
    user: 'M12 11.4a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8zM4.8 20c.6-3.4 3.6-5.4 7.2-5.4s6.6 2 7.2 5.4',
    bell: 'M6.4 16.4V11a5.6 5.6 0 0 1 11.2 0v5.4l1.4 2.2H5zM10 20.6h4',
    device: 'M12 3.4l5.2 4.6-5.2 4.6-5.2-4.6zM12 12.6v8M12 12.6l5.2 4.6-5.2 4.4-5.2-4.4z',
    plus: 'M12 5.4v13.2M5.4 12h13.2',
    back: 'M14.6 5.4 8 12l6.6 6.6',
    chevron: 'M9.6 5.6 16 12l-6.4 6.4',
    shield: 'M12 3.4l7 2.8v5.8c0 4-2.9 7-7 8.6-4.1-1.6-7-4.6-7-8.6V6.2z',
    info: 'M12 20.4a8.4 8.4 0 1 0 0-16.8 8.4 8.4 0 0 0 0 16.8zM12 11v5.2M12 7.9h.01',
    send: 'M4.2 11.8 20 4.6l-7.2 15.6-2-6.4z',
    mic: 'M12 4.2a2.8 2.8 0 0 1 2.8 2.8v4.2a2.8 2.8 0 0 1-5.6 0V7A2.8 2.8 0 0 1 12 4.2zM5.8 11a6.2 6.2 0 0 0 12.4 0M12 17.2v2.6',
    sync: 'M20 12a8 8 0 1 1-2.4-5.7M20 4.2v5h-5',
    battery: 'M4 8.2h12.6v7.6H4zM16.6 10.6h2.6v2.8h-2.6',
    pause: 'M9.2 6.4v11.2M14.8 6.4v11.2',
    play: 'M7.4 5.4 18.6 12 7.4 18.6z',
    close: 'M6.4 6.4l11.2 11.2M17.6 6.4 6.4 17.6',
    doc: 'M7 3.6h7.2l4 4V20H7zM14.2 3.6v4h4M9.6 12.4h6M9.6 15.6h4.4',
    moon: 'M20 14.6A8.6 8.6 0 0 1 9.4 4 8.6 8.6 0 1 0 20 14.6z',
    heart: 'M12 19.8s-7.2-4.3-7.2-9.3A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7.2 2.5c0 5-7.2 9.3-7.2 9.3z',
    brain: 'M9.4 4.2a3 3 0 0 0-3 3 3 3 0 0 0-1 5.7v2.9a3 3 0 0 0 4 2.8M14.6 4.2a3 3 0 0 1 3 3 3 3 0 0 1 1 5.7v2.9a3 3 0 0 1-4 2.8M12 4.4v15.4',
    wave: 'M3.4 12.2h2.8l1.8-5 2.8 9.6 2.6-7.6 1.6 3h5.6',
    check: 'M5 12.6l4.2 4.2L19 7.4',
    alert: 'M12 4.6 20.4 19H3.6zM12 10v3.8M12 16.6h.01',
    wifi: 'M4.6 11.4a10.4 10.4 0 0 1 14.8 0M8 14.6a5.8 5.8 0 0 1 8 0M12 18h.01',
    family: 'M9 11.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM3.6 19.4c.5-2.9 2.8-4.8 5.4-4.8s4.9 1.9 5.4 4.8M16.4 11.4a2.8 2.8 0 1 0 0-5.6M15.6 14.8c2.4.3 4.2 2.1 4.6 4.6',
    lock: 'M6.4 11h11.2v9H6.4zM9.2 11V8.2a2.8 2.8 0 0 1 5.6 0V11',
    sparkles: 'M11.6 3.6l1.5 4.2 4.3 1.5-4.3 1.5-1.5 4.3-1.5-4.3L5.8 9.3l4.3-1.5zM17.8 15.2l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z',
    edit: 'M4.4 19.6h3.8L18.6 9.2l-3.8-3.8L4.4 15.8zM14.2 6l3.8 3.8',
    trash: 'M6.4 7.2h11.2M9.4 7.2V5h5.2v2.2M8 7.2 8.9 20h6.2L16 7.2',
    search: 'M11 18.4a7.4 7.4 0 1 0 0-14.8 7.4 7.4 0 0 0 0 14.8zM16.6 16.6 20.4 20.4',
    clock: 'M12 20.4a8.4 8.4 0 1 0 0-16.8 8.4 8.4 0 0 0 0 16.8zM12 7.6v5l3.2 1.9',
    mail: 'M4 6.4h16v11.2H4zM4 7l8 6 8-6',
    link: 'M9.4 14.6 14.6 9.4M8.2 12.2 6.4 14a3 3 0 0 0 4.2 4.2l1.8-1.8M15.8 11.8 17.6 10a3 3 0 0 0-4.2-4.2l-1.8 1.8',
    activity: 'M4.4 19.6V4.4M4.4 19.6h15.2M8.4 15.4l3.2-4 2.8 2 4-6',
    grid: 'M4.4 4.4h6v6h-6zM13.6 4.4h6v6h-6zM4.4 13.6h6v6h-6zM14.6 13.6h2v2h-2zM18 13.6h2v2h-2zM14.6 18h2v2h-2zM18 18h2v2h-2z',
    copy: 'M9.4 9.4h9.2v10H9.4zM5.4 14.6V4.4h9.2',
    award: 'M12 14.4a4.6 4.6 0 1 0 0-9.2 4.6 4.6 0 0 0 0 9.2zM8.8 13.6 7.6 20l4.4-2.2 4.4 2.2-1.2-6.4',
    target: 'M12 20.4a8.4 8.4 0 1 0 0-16.8 8.4 8.4 0 0 0 0 16.8zM12 15.6a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2z'
  };

  function icon(name, size) {
    var d = ICONS[name] || ICONS.info;
    var s = size || 20;
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" '
      + 'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>';
  }

  /* ---------- 轻提示 ---------- */
  var toastTimers = {};
  function toast(msg, opt) {
    var o = opt || {};
    var root = document.getElementById('toast-root');
    if (!root) { return; }
    var key = o.key || msg;
    if (toastTimers[key]) { clearTimeout(toastTimers[key]); }
    var node = el('<div class="toast">' + icon(o.icon || 'check', 15) + '<span>' + esc(msg) + '</span></div>');
    root.appendChild(node);
    toastTimers[key] = setTimeout(function () {
      node.classList.add('is-out');
      setTimeout(function () { if (node.parentNode) { node.parentNode.removeChild(node); } }, 220);
    }, o.duration || 2000);
  }

  function overlayRoot() { return document.getElementById('overlay-root'); }

  /* ---------- 底部抽屉 ---------- */
  function sheet(opt) {
    var o = opt || {};
    var root = overlayRoot();
    if (!root) { return { close: function () {} }; }
    var wrap = el('<div>'
      + '<div class="sheet-backdrop" data-close="1"></div>'
      + '<div class="sheet-wrap"><div class="sheet" role="dialog" aria-modal="true">'
      + '<div class="sheet-grip"></div>'
      + '<div class="sheet-head"><h2>' + esc(o.title || '') + '</h2>'
      + '<button class="icon-btn ghost" data-close="1" aria-label="关闭">' + icon('close', 18) + '</button></div>'
      + '<div class="sheet-body">' + (o.body || '') + '</div>'
      + (o.foot ? '<div class="sheet-foot">' + o.foot + '</div>' : '')
      + '</div></div></div>');
    root.appendChild(wrap);

    function close() {
      if (!wrap.parentNode) { return; }
      wrap.style.transition = 'opacity .18s ease';
      wrap.style.opacity = '0';
      setTimeout(function () {
        if (wrap.parentNode) { wrap.parentNode.removeChild(wrap); }
        if (typeof o.onClose === 'function') { o.onClose(); }
      }, 170);
    }
    wrap.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) { close(); }
    });
    if (typeof o.onMount === 'function') { o.onMount(wrap, close); }
    return { node: wrap, body: $('.sheet-body', wrap), close: close };
  }

  /* ---------- 居中弹窗 ---------- */
  function modal(opt) {
    var o = opt || {};
    var root = overlayRoot();
    if (!root) { return { close: function () {} }; }
    var wrap = el('<div>'
      + '<div class="sheet-backdrop" data-close="1"></div>'
      + '<div class="modal-wrap"><div class="modal" role="dialog" aria-modal="true">'
      + '<h3>' + esc(o.title || '') + '</h3>'
      + (o.desc ? '<p>' + esc(o.desc) + '</p>' : '')
      + (o.extra || '')
      + '<div class="btn-row" style="margin-top:18px">'
      + (o.cancelText === null ? '' : '<button class="btn btn-ghost" data-close="1">' + esc(o.cancelText || '取消') + '</button>')
      + '<button class="btn btn-primary" data-confirm="1"'
      + (o.danger ? ' style="background:var(--danger);box-shadow:none"' : '') + '>' + esc(o.confirmText || '确定') + '</button>'
      + '</div></div></div></div>');
    root.appendChild(wrap);

    function close() { if (wrap.parentNode) { wrap.parentNode.removeChild(wrap); } }
    wrap.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) { close(); }
      if (e.target.closest('[data-confirm]')) {
        close();
        if (typeof o.onConfirm === 'function') { o.onConfirm(); }
      }
    });
    return { node: wrap, close: close };
  }

  /* ---------- 骨架屏 ---------- */
  function skeleton(lines) {
    var n = lines || 3, html = '';
    for (var i = 0; i < n; i++) {
      html += '<div class="skeleton line" style="width:' + (i === n - 1 ? 62 : 100) + '%"></div>';
    }
    return '<div>' + html + '</div>';
  }
  function skeletonChart() {
    return '<div><div class="skeleton line" style="width:38%;height:14px"></div>'
      + '<div class="skeleton chart" style="margin-top:12px"></div></div>';
  }

  /* ---------- 空态 / 错误态 ---------- */
  function stateBox(opt) {
    var o = opt || {};
    return '<div class="state-box">'
      + '<div class="state-icon' + (o.tone === 'danger' ? ' is-danger' : '') + '">' + icon(o.icon || 'info', 26) + '</div>'
      + '<div class="state-title">' + esc(o.title || '') + '</div>'
      + (o.desc ? '<div class="state-desc">' + esc(o.desc) + '</div>' : '')
      + (o.actionHtml ? '<div style="margin-top:6px">' + o.actionHtml + '</div>' : '')
      + '</div>';
  }

  /* ---------- 页头（返回按钮 + 标题 + 右侧操作） ---------- */
  function pageHead(opt) {
    var o = opt || {};
    return '<div class="page-head">'
      + (o.back === false ? '' : '<button class="icon-btn" data-role="back" aria-label="返回">' + icon('back', 19) + '</button>')
      + '<div><h1>' + esc(o.title || '') + '</h1>'
      + (o.sub ? '<div class="head-sub">' + esc(o.sub) + '</div>' : '') + '</div>'
      + '<div class="head-right">' + (o.right || '') + '</div>'
      + '</div>';
  }

  /* ---------- 列表行 ---------- */
  function listRow(opt) {
    var o = opt || {};
    return '<div class="list-row" ' + (o.attrs || '') + '>'
      + (o.icon ? '<div class="row-icon' + (o.tone ? ' is-' + o.tone : '') + '">' + icon(o.icon, 19) + '</div>' : '')
      + '<div class="row-main"><div class="row-title">' + esc(o.title || '') + (o.badge || '') + '</div>'
      + (o.desc ? '<div class="row-desc">' + esc(o.desc) + '</div>' : '') + '</div>'
      + '<div class="row-tail">' + (o.tail || '') + (o.arrow === false ? '' : icon('chevron', 16)) + '</div>'
      + '</div>';
  }

  function tag(text, tone) {
    return '<span class="tag' + (tone ? ' is-' + tone : '') + '">'
      + (tone === 'success' ? '<i class="dot"></i>' : '') + esc(text) + '</span>';
  }

  /* ---------- 时间与文案工具 ---------- */
  function greeting() {
    var h = new Date().getHours();
    if (h < 6) { return '夜深了'; }
    if (h < 11) { return '早上好'; }
    if (h < 14) { return '中午好'; }
    if (h < 18) { return '下午好'; }
    return '晚上好';
  }
  function fmtClock(d) {
    var x = d || new Date();
    return ('0' + x.getHours()).slice(-2) + ':' + ('0' + x.getMinutes()).slice(-2);
  }
  function todayLabel() {
    var d = new Date();
    var names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + names[d.getDay()];
  }
  function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { /* 本地文件打开时剪贴板可能不可用，忽略 */ }
    return false;
  }

  /* ---------- 通用事件绑定：返回按钮 + 滚动分隔线 ---------- */
  function bindBack(root, fallback) {
    var btn = $('[data-role="back"]', root);
    if (!btn) { return; }
    btn.addEventListener('click', function () {
      if (!global.Router.back() && typeof fallback === 'function') { fallback(); }
    });
  }
  function bindScrollShadow(root, scroller) {
    var head = $('.page-head', root);
    var box = scroller || document.getElementById('view-root');
    if (!head || !box) { return; }
    function onScroll() {
      if (box.scrollTop > 4) { head.classList.add('is-scrolled'); }
      else { head.classList.remove('is-scrolled'); }
    }
    box.addEventListener('scroll', onScroll);
    onScroll();
    return function () { box.removeEventListener('scroll', onScroll); };
  }

  global.UI = {
    el: el, frag: frag, $: $, $$: $$,
    esc: esc, icon: icon, tag: tag,
    toast: toast, sheet: sheet, modal: modal,
    skeleton: skeleton, skeletonChart: skeletonChart, stateBox: stateBox,
    pageHead: pageHead, listRow: listRow,
    greeting: greeting, fmtClock: fmtClock, todayLabel: todayLabel,
    copyText: copyText, bindBack: bindBack, bindScrollShadow: bindScrollShadow,
    Icons: ICONS
  };
})(window);

