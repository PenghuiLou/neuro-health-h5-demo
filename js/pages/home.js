/* ===========================================================
   pages/home.js —— 首页（HomePage）+ 指标卡片（MetricCard）
   结构：问候语 + 右上角（添加设备 / 设备详情入口）→ 今日概览
        （综合评分 + 今日状态 + 3 秒轮播健康提示）→ 核心指标
        （一行一项，右上角箭头进入详情）→ 健康提示
   依赖：ui.js、charts.js、store.js、mock-data.js、ai-insight-sheet.js
   =========================================================== */
(function (global) {
  'use strict';

  var MD = global.MockData;
  var UI = global.UI;
  var Charts = global.Charts;
  var Store = global.Store;
  var Pages = global.Pages = global.Pages || {};
  var Components = global.Components = global.Components || {};

  /* ---------- 顶部：问候 + 添加设备 / 设备详情入口 ---------- */
  function headerHtml(state) {
    return '<div class="home-head">'
      + '<div class="home-greet">'
      + '<div class="home-hello">' + UI.esc(UI.greeting()) + '，' + UI.esc(state.profile.nickname) + '</div>'
      + '</div>'
      + '<div class="head-actions">'
      + '<button class="btn btn-primary btn-sm" data-role="add-device">' + UI.icon('plus', 14) + '添加设备</button>'
      + '<button class="icon-btn" data-role="device-open" aria-label="设备详情">' + UI.icon('device', 19) + '</button>'
      + '</div>'
      + '</div>';
  }

  /* ---------- 今日概览卡：状态 + 综合评分 + 轮播健康提示 ---------- */
  function overviewHtml() {
    var ov = MD.overview;
    return '<div class="card overview-card">'
      + '<div class="overview-left">'
      + '<div class="ov-label">今日状态</div>'
      + '<div class="ov-status">' + UI.esc(ov.status) + '</div>'
      + '</div>'
      + '<div class="overview-ring">' + Charts.ring({ value: ov.score, size: 104, stroke: 10, color: '#246BFD', label: '综合评分' }) + '</div>'
      + '<div class="ov-ticker">'
      + '<span class="ov-ticker-icon">' + UI.icon('sparkles', 13) + '</span>'
      + '<span class="ov-ticker-text" data-role="ticker">' + UI.esc(MD.ticker[0]) + '</span>'
      + '</div>'
      + '</div>';
  }

  /* ---------- 同步失败提示（错误态 + 重试） ---------- */
  function errorBannerHtml() {
    return '<div class="card error-banner">'
      + '<div class="error-icon">' + UI.icon('alert', 18) + '</div>'
      + '<div class="error-main"><div class="error-title">数据同步暂时中断</div>'
      + '<div class="error-desc">请检查设备连接后重试，当前展示的是上一次同步的记录。</div></div>'
      + '<button class="btn btn-primary btn-sm" data-role="retry">重试</button>'
      + '</div>';
  }

  /* ---------- 指标卡片（一行一项，右上角箭头进入详情） ---------- */
  function sparkValues(key) {
    var d = MD.detail[key];
    if (key === 'sleep') { return d.week.map(function (p) { return p.value; }); }
    return d.day.map(function (p) { return p.value; });
  }

  function metricCardHtml(key) {
    var cfg = MD.metrics[key];
    var toneClass = 'is-' + cfg.changeTone;
    return '<div class="metric-card" data-metric="' + key + '">'
      + '<div class="metric-top">'
      + '<div class="metric-icon" style="background:' + cfg.soft + ';color:' + cfg.color + '">' + UI.icon(cfg.icon, 18) + '</div>'
      + '<div class="metric-name">' + UI.esc(cfg.name) + '<span>' + UI.esc(cfg.abbr) + '</span></div>'
      + UI.tag(cfg.quality, cfg.qualityTone)
      + '<span class="metric-arrow">' + UI.icon('chevron', 16) + '</span>'
      + '</div>'
      + '<div class="metric-mid">'
      + '<div class="metric-main">'
      + '<div class="metric-value"><b>' + cfg.value + '</b><span>' + UI.esc(cfg.unit) + '</span>'
      + '<em class="metric-change ' + toneClass + '">' + UI.esc(cfg.change) + '</em></div>'
      + '<div class="metric-status">' + UI.esc(cfg.status) + ' · ' + UI.esc(cfg.desc) + '</div>'
      + '</div>'
      + '<div class="metric-spark">' + Charts.sparkline(sparkValues(key), cfg.color, 150, 44) + '</div>'
      + '</div>'
      + '<div class="metric-foot">'
      + '<button class="btn btn-sm btn-soft" data-ai="' + key + '">' + UI.icon('sparkles', 14) + 'AI解读</button>'
      + '</div>'
      + '</div>';
  }

  /* ---------- 健康提示 ---------- */
  function tipsHtml(state) {
    var list = state.tips.filter(function (t) { return !state.dismissTips[t.id]; });
    if (!list.length) {
      return '<div class="card">' + UI.stateBox({
        icon: 'check', title: '暂无新的健康提示',
        desc: '提示会在记录出现变化时生成。你可以重新显示演示提示继续体验。',
        actionHtml: '<button class="btn btn-soft btn-sm" data-role="restore-tips">显示演示提示</button>'
      }) + '</div>';
    }
    return list.map(function (t) {
      var cfg = MD.metrics[t.metric];
      return '<div class="card tip-card">'
        + '<div class="tip-head">' + UI.tag(t.tag, t.tone) + '<span class="tip-time">刚刚更新</span>'
        + '<button class="tip-close" data-dismiss="' + t.id + '" aria-label="忽略提示">' + UI.icon('close', 15) + '</button></div>'
        + '<div class="tip-title">' + UI.esc(t.title) + '</div>'
        + '<div class="tip-body">' + UI.esc(t.body) + '</div>'
        + '<div class="tip-foot">'
        + '<button class="text-btn" data-tip-metric="' + t.metric + '">' + UI.esc(t.action) + UI.icon('chevron', 14) + '</button>'
        + '<button class="btn btn-sm btn-soft" data-ai="' + t.metric + '">' + UI.icon('sparkles', 14) + 'AI解读</button>'
        + '</div>'
        + '<div class="tip-metric">' + UI.esc(cfg.name + ' · ' + cfg.headline + ' ' + cfg.value + (cfg.unit ? ' ' + cfg.unit : '')) + '</div>'
        + '</div>';
    }).join('');
  }

  /* ---------- 首页渲染 ---------- */
  function renderPage() {
    var state = Store.get();
    return UI.el('<div class="page home-page">'
      + headerHtml(state)
      + (state.demo.syncError ? errorBannerHtml() : '')
      + '<div class="stack-gap">'
      + overviewHtml()
      + (state.demo.empty
        ? '<div class="card">' + UI.stateBox({
          icon: 'activity', title: '还没有足够的有效记录',
          desc: '完成一次完整采集后，这里会生成您的个人趋势。',
          actionHtml: '<button class="btn btn-primary btn-sm" data-role="start-collect">开始采集</button>'
        }) + '</div>'
        : '<div><div class="section-title">核心指标<span class="sub">点击卡片查看日 / 周 / 月趋势</span></div>'
        + '<div class="metric-list">' + MD.order.map(metricCardHtml).join('') + '</div></div>')
      + '<div class="section-title">健康提示<span class="sub">趋势提示，非诊断结论</span></div>'
      + tipsHtml(state)
      + '</div></div>');
  }

  /* 健康提示每 3 秒上下滚动播报一条；返回停止函数用于页面卸载 */
  function mountTicker(host) {
    var el = UI.$('[data-role="ticker"]', host);
    if (!el) { return null; }
    var idx = 0;
    var timer = setInterval(function () {
      idx = (idx + 1) % MD.ticker.length;
      if (!el.parentNode) { return; }
      var fresh = UI.el('<span class="ov-ticker-text" data-role="ticker">' + UI.esc(MD.ticker[idx]) + '</span>');
      el.parentNode.replaceChild(fresh, el);
      el = fresh;
    }, 3000);
    return function () { clearInterval(timer); };
  }

  /* ---------- 首页挂载与交互 ---------- */
  function mounted(host, params, ctx) {
    Charts.mountRing(host);

    var stopTicker = mountTicker(host);
    if (stopTicker) { ctx.onCleanup(stopTicker); }

    ctx.onStore(function (state, reason) {
      if (reason === 'tips' || reason === 'demo') { global.App.render(global.Router.current()); }
    });

    host.addEventListener('click', function (e) {
      var t = e.target;

      var ai = t.closest('[data-ai]');
      if (ai) { global.AIInsightSheet.open(ai.getAttribute('data-ai')); return; }

      var dismiss = t.closest('[data-dismiss]');
      if (dismiss) {
        Store.actions.dismissTip(dismiss.getAttribute('data-dismiss'));
        UI.toast('已隐藏该提示', { icon: 'check' });
        return;
      }

      var tipMetric = t.closest('[data-tip-metric]');
      if (tipMetric) { global.Router.push('metric', { metric: tipMetric.getAttribute('data-tip-metric') }); return; }

      var roleEl = t.closest('[data-role]');
      var role = roleEl ? roleEl.getAttribute('data-role') : null;

      if (role === 'device-open') { global.Router.push('device-detail'); return; }
      if (role === 'add-device') { global.Router.push('add-device'); return; }
      if (role === 'restore-tips') { Store.get().dismissTips = {}; Store.emit('tips'); return; }
      if (role === 'start-collect') {
        UI.toast('正在开始一次完整采集…', { icon: 'activity' });
        setTimeout(function () {
          Store.actions.setDemo({ empty: false });
          UI.toast('采集完成，已生成今日趋势', { icon: 'check' });
        }, 1400);
        return;
      }
      if (role === 'retry') {
        var btn = t.closest('button');
        btn.classList.add('is-disabled');
        btn.textContent = '正在重试…';
        setTimeout(function () {
          Store.actions.markSynced();
          Store.actions.setDemo({ syncError: false });
          UI.toast('数据同步已恢复', { icon: 'check' });
        }, 1200);
        return;
      }

      var card = t.closest('[data-metric]');
      if (card) { global.Router.push('metric', { metric: card.getAttribute('data-metric') }); }
    });
  }

  Pages.home = {
    render: renderPage,
    mounted: mounted
  };
  Components.MetricCard = metricCardHtml;
})(window);
