/* ===========================================================
   app.js —— 应用启动：路由渲染、底部 Tab、实时数据心跳
   依赖：store.js、ui.js、各页面模块
   =========================================================== */
(function (global) {
  'use strict';

  var MD = global.MockData;
  var UI = global.UI;
  var Store = global.Store;
  var Router = global.Router;
  var Pages = global.Pages || {};

  var TABS = [
    { key: 'home', label: '首页', icon: 'home' },
    { key: 'ai', label: 'AI医生', icon: 'chat' },
    { key: 'profile', label: '我的', icon: 'user' }
  ];
  var TAB_ENTRY = { home: 'home', ai: 'ai-doctor', profile: 'profile' };

  var viewRoot = null;
  var cleanups = [];
  var ignorePop = 0;

  function cleanupPage() {
    cleanups.splice(0).forEach(function (fn) {
      try { fn(); } catch (e) { /* 忽略页面清理异常 */ }
    });
  }

  function makeCtx() {
    return {
      onStore: function (fn) {
        var un = Store.subscribe(fn);
        cleanups.push(un);
        return un;
      },
      onCleanup: function (fn) { cleanups.push(fn); }
    };
  }

  function renderTabbar(active) {
    var bar = document.getElementById('tabbar');
    if (!bar) { return; }
    bar.innerHTML = TABS.map(function (t) {
      return '<button class="tab-item' + (t.key === active ? ' is-active' : '') + '" data-tab="' + t.key + '">'
        + UI.icon(t.icon, 23) + '<span>' + t.label + '</span></button>';
    }).join('');
  }

  function render(route) {
    cleanupPage();
    var page = Pages[route.view] || Pages.home;
    var params = route.params || {};
    viewRoot.innerHTML = '';
    var node = page.render(params);
    viewRoot.appendChild(node);
    viewRoot.scrollTop = 0;
    renderTabbar(Router.currentTab());

    /* 页头滚动分隔线 */
    cleanups.push(UI.bindScrollShadow(node, viewRoot));

    if (typeof page.mounted === 'function') {
      try {
        page.mounted(node, params, makeCtx());
      } catch (e) {
        if (global.console && console.warn) { console.warn('[页面初始化异常]', route.view, e); }
      }
    }
  }

  /* 返回：先同步内部路由栈，再消费一条 history 记录 */
  Router.back = function () {
    if (this.stack.length > 1) {
      this.stack.pop();
      this.fire('back');
      ignorePop = 1;
      setTimeout(function () { ignorePop = 0; }, 500);
      try { global.history.back(); } catch (e) { /* 本地文件打开时忽略 */ }
      return true;
    }
    return false;
  };

  function bindPopstate() {
    global.addEventListener('popstate', function () {
      if (ignorePop > 0) { ignorePop = 0; return; }
      if (Router.stack.length > 1) {
        Router.stack.pop();
        Router.fire('back');
      }
    });
  }

  function pushHistory() {
    try { global.history.pushState({ depth: Router.stack.length }, ''); } catch (e) { /* 忽略 */ }
  }

  function bindTabbar() {
    var bar = document.getElementById('tabbar');
    if (!bar) { return; }
    bar.addEventListener('click', function (e) {
      var item = e.target.closest('[data-tab]');
      if (!item) { return; }
      var key = item.getAttribute('data-tab');
      if (Router.currentTab() === key && Router.stack.length === 1) {
        viewRoot.scrollTop = 0;
        return;
      }
      Router.stack = [{ view: TAB_ENTRY[key], params: {} }];
      Router.fire('tab');
    });
  }

  function boot() {
    viewRoot = document.getElementById('view-root');
    if (!viewRoot) { return; }

    /* 模拟状态栏时间 */
    var statusTime = document.querySelector('.status-left');
    if (statusTime) {
      statusTime.textContent = UI.fmtClock();
      setInterval(function () { statusTime.textContent = UI.fmtClock(); }, 30000);
    }

    Router.onChange(function (route, reason) {
      if (reason === 'push' || reason === 'tab') { pushHistory(); }
      render(route);
    });

    bindTabbar();
    bindPopstate();
    Router.init('home');

    /* 实时数据心跳：每 3 秒刷新一次，受控轻微变化 */
    setInterval(function () { Store.tick(); }, 3000);

    /* 首次进入提示演示模式，避免误解为真实医疗数据 */
    setTimeout(function () {
      UI.toast('演示模式：当前为模拟数据', { icon: 'info', key: 'boot-tip', duration: 2600 });
    }, 600);
  }

  /* 页面容器已存在时立即启动（脚本放在 body 末尾），否则等待 DOM 就绪 */
  if (document.getElementById('view-root')) {
    boot();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  global.App = { render: render, TABS: TABS, disclaimer: MD.disclaimer };
})(window);
