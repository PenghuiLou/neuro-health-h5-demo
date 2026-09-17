/* ===========================================================
   pages/home.js —— 首页（HomePage）+ 指标卡片（MetricCard）
                  + 设备面板（DevicePanel）
   首页目标：10 秒内看到「设备状态 / 今日状态 / 关注指标 /
            健康提示 / 下一步动作」，体现 设备 + 数据 + AI 闭环
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

  /* ---------- 顶部问候区 ---------- */
  function headerHtml(state) {
    return '<div class="home-head">'
      + '<div class="home-greet">'
      + '<div class="home-hello">' + UI.esc(UI.greeting()) + '，' + UI.esc(state.profile.nickname) + '</div>'
      + '<div class="home-sub">今天也关注一下自己的状态' + '<span class="demo-chip">' + UI.icon('info', 12) + '演示数据</span></div>'
      + '</div>'
      + '<button class="icon-btn" data-role="notice" aria-label="通知">' + UI.icon('bell', 19)
      + '<i class="notice-dot"></i></button>'
      + '</div>';
  }

  /* ---------- 今日健康概览卡 ---------- */
  function overviewHtml(state) {
    var ov = MD.overview;
    return '<div class="card overview-card">'
      + '<div class="overview-left">'
      + '<div class="overview-status">' + UI.tag('今日状态 ' + ov.status, 'success') + '</div>'
      + '<div class="overview-title">' + ov.updatedMetrics + ' 项核心指标已更新</div>'
      + '<div class="overview-desc">' + UI.esc(ov.summary) + '</div>'
      + '<div class="overview-kpis">'
      + '<div class="kpi"><b>' + ov.completeness + '%</b><span>数据采集完成度</span></div>'
      + '<div class="kpi"><b>' + UI.esc(state.device.lastSync) + '</b><span>最近同步</span></div>'
      + '</div>'
      + '</div>'
      + '<div class="overview-ring">' + Charts.ring({ value: ov.score, size: 116, stroke: 10, color: '#246BFD', label: '综合评分' }) + '</div>'
      + '<div class="overview-foot">' + UI.icon('shield', 13) + '<span>' + UI.esc(ov.footer) + '</span></div>'
      + '</div>';
  }

  /* ---------- 设备面板（DevicePanel） ---------- */
  function devicePanelHtml(state) {
    var d = state.device;
    if (!d.bound) {
      return '<div class="card device-panel is-offline">'
        + '<div class="device-main">'
        + '<div class="device-icon">' + UI.icon('device', 22) + '</div>'
        + '<div class="device-info"><div class="device-name">尚未连接设备</div>'
        + '<div class="device-desc">当前展示演示数据，可绑定设备后开始采集</div></div>'
        + '</div>'
        + '<div class="device-actions">'
        + '<button class="btn btn-primary btn-sm" data-role="add-device">添加设备</button>'
        + '<button class="btn btn-ghost btn-sm" data-role="keep-demo">继续体验演示数据</button>'
        + '</div>'
        + '<div class="demo-note">' + UI.icon('info', 14)
        + '<span>演示模式：当前数据为模拟数据，不作为医疗判断依据。</span></div>'
        + '</div>';
    }

    var statusText = d.paused ? '采集已暂停' : '正在采集';
    return '<div class="card device-panel" data-role="device-open">'
      + '<div class="device-main">'
      + '<div class="device-icon' + (d.paused ? ' is-idle' : '') + '">' + UI.icon('device', 22) + '</div>'
      + '<div class="device-info">'
      + '<div class="device-name">' + UI.esc(d.name) + UI.tag(d.bound ? '已连接' : '未连接', 'success') + '</div>'
      + '<div class="device-desc">' + UI.icon('battery', 13) + ' 电量 ' + d.battery + '% · 蓝牙信号' + UI.esc(d.signal)
      + ' · 最近同步 ' + UI.esc(d.lastSync) + '</div>'
      + '</div>'
      + '<div class="device-state">' + (d.paused ? '' : '<span class="live-dot"></span>') + UI.esc(statusText) + '</div>'
      + '</div>'
      + '<div class="device-actions">'
      + '<button class="btn ' + (d.paused ? 'btn-primary' : 'btn-ghost') + ' btn-sm" data-role="pause">'
      + (d.paused ? UI.icon('play', 15) + '继续采集' : UI.icon('pause', 15) + '暂停采集') + '</button>'
      + '<button class="btn btn-soft btn-sm" data-role="device-detail">设备详情</button>'
      + '<button class="btn btn-ghost btn-sm" data-role="add-device">' + UI.icon('plus', 15) + '添加设备</button>'
      + '</div>'
      + (d.paused ? '<div class="device-hint">' + UI.icon('clock', 13) + '最近更新：'
        + UI.esc(Store.relativeTime(state.live.lastUpdatedAt)) + ' · 暂停期间数据不再刷新</div>' : '')
      + '</div>';
  }

  /* ---------- 实时采集趋势区 ---------- */
  function liveSectionHtml(state) {
    var cur = state.live.metric;
    var meta = MD.live.meta[cur];
    var values = state.live.values[cur] || [];
    var decimals = cur === 'hr' || cur === 'hrv' ? 0 : 1;
    var now = values.length ? values[values.length - 1] : meta.base;
    var chips = MD.live.order.map(function (k) {
      var m = MD.live.meta[k];
      return '<button class="chip' + (k === cur ? ' is-active' : '') + '" data-live="' + k + '">' + UI.esc(m.name) + '</button>';
    }).join('');

    return '<div class="card live-card">'
      + '<div class="live-head">'
      + '<div><div class="live-title">实时采集趋势</div>'
      + '<div class="live-sub">每 3 秒刷新一次 · 最近 30 个采样点</div></div>'
      + (state.device.paused
        ? UI.tag('采集已暂停', 'warning')
        : '<span class="tag is-success"><i class="live-dot"></i>正在采集</span>')
      + '</div>'
      + '<div class="chip-row">' + chips + '</div>'
      + '<div class="live-value"><b data-role="live-number">' + Charts.fmt(now, decimals) + '</b>'
      + '<span>' + UI.esc(meta.unit || '') + '</span>'
      + '<em>个人常态区间 ' + meta.range[0] + '—' + meta.range[1] + (meta.unit ? ' ' + meta.unit : '') + '</em></div>'
      + '<div class="chart-box" data-role="live-chart"></div>'
      + '<div class="chart-hint">' + UI.icon('info', 13)
      + '<span>点击数据点查看具体数值；区间为演示用个人常态范围，不代表诊断标准</span></div>'
      + (state.device.paused
        ? '<div class="device-hint">' + UI.icon('clock', 13) + '采集已暂停，最近更新：'
          + UI.esc(Store.relativeTime(state.live.lastUpdatedAt)) + '</div>'
        : '')
      + '</div>';
  }

  /* ---------- 指标卡片（MetricCard） ---------- */
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
      + '</div>'
      + '<div class="metric-value"><b>' + cfg.value + '</b><span>' + UI.esc(cfg.unit) + '</span></div>'
      + '<div class="metric-status">' + UI.esc(cfg.status) + ' · ' + UI.esc(cfg.desc) + '</div>'
      + '<div class="metric-spark">' + Charts.sparkline(sparkValues(key), cfg.color, 132, 34) + '</div>'
      + '<div class="metric-foot">'
      + '<span class="metric-change ' + toneClass + '">' + UI.esc(cfg.change) + '</span>'
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

  /* ---------- 健康小目标 ---------- */
  function goalHtml(state) {
    var g = state.goal;
    var dots = '';
    for (var i = 0; i < g.total; i++) {
      dots += '<i class="goal-dot' + (i < g.done ? ' is-done' : '') + '"></i>';
    }
    return '<div class="card goal-card">'
      + '<div class="goal-head"><div class="goal-icon">' + UI.icon('target', 20) + '</div>'
      + '<div><div class="goal-title">' + UI.esc(g.title) + '</div>'
      + '<div class="goal-sub">连续完成 ' + g.done + '/' + g.total + ' 天</div></div>'
      + '<button class="btn btn-soft btn-sm" data-role="goal">去完成</button></div>'
      + '<div class="goal-dots">' + dots + '</div>'
      + '<div class="goal-desc">' + UI.esc(g.desc) + '</div>'
      + '</div>';
  }

  /* ---------- 添加设备入口 ---------- */
  function addDeviceHtml(state) {
    return '<div class="add-device card" data-role="add-device">'
      + '<div class="add-device-icon">' + UI.icon('plus', 20) + '</div>'
      + '<div class="add-device-main"><div class="add-device-title">添加设备</div>'
      + '<div class="add-device-desc">'
      + (state.device.bound ? '搜索附近的脑安设备，绑定第二台或更换设备' : '搜索并绑定脑安神经健康仪，开始记录自己的数据')
      + '</div></div>'
      + UI.icon('chevron', 16)
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

  /* ---------- 首页渲染 ---------- */
  function renderPage() {
    var state = Store.get();
    return UI.el('<div class="page home-page">'
      + headerHtml(state)
      + (state.demo.syncError ? errorBannerHtml() : '')
      + '<div class="stack-gap">'
      + overviewHtml(state)
      + devicePanelHtml(state)
      + liveSectionHtml(state)
      + (state.demo.empty
        ? '<div class="card">' + UI.stateBox({
          icon: 'activity', title: '还没有足够的有效记录',
          desc: '完成一次完整采集后，这里会生成您的个人趋势。',
          actionHtml: '<button class="btn btn-primary btn-sm" data-role="start-collect">开始采集</button>'
        }) + '</div>'
        : '<div><div class="section-title">核心指标<span class="sub">点击卡片查看日 / 周 / 月趋势</span></div>'
        + '<div class="metric-grid">' + MD.order.map(metricCardHtml).join('') + '</div></div>')
      + '<div class="section-title">健康提示<span class="sub">趋势提示，非诊断结论</span></div>'
      + tipsHtml(state)
      + goalHtml(state)
      + addDeviceHtml(state)
      + '<div class="demo-note accent">' + UI.icon('alert', 14)
      + '<span>' + UI.esc(MD.disclaimer) + '所有指标、AI 解读与设备状态均为本地模拟，不接入真实设备与真实医疗服务。</span></div>'
      + '</div></div>');
  }

  function mountLiveChart(scope) {
    var box = UI.$('[data-role="live-chart"]', scope);
    if (!box) { return; }
    var cur = Store.get().live.metric;
    var meta = MD.live.meta[cur];
    var values = Store.get().live.values[cur] || [];
    var points = values.map(function (v, i) {
      return { label: 'T-' + ((values.length - 1 - i) * 3) + 's', value: v };
    });
    var opts = {
      points: points, width: 326, height: 158, color: meta.color,
      unit: meta.unit, aria: meta.name + '实时趋势',
      band: { from: meta.range[0], to: meta.range[1] },
      id: 'live-' + cur
    };
    box.innerHTML = Charts.line(opts);
    Charts.mountLine(box, opts);
  }

  /* ---------- 首页挂载与交互 ---------- */
  function mounted(host, params, ctx) {
    Charts.mountRing(host);
    mountLiveChart(host);

    /* 数据刷新时只更新设备面板与实时采集区，避免整页重排 */
    function refreshLive() {
      var state = Store.get();
      var card = UI.$('.live-card', host);
      if (card) {
        var fresh = UI.el(liveSectionHtml(state));
        card.parentNode.replaceChild(fresh, card);
        mountLiveChart(fresh);
      }
      var panel = UI.$('.device-panel', host);
      if (panel) {
        panel.parentNode.replaceChild(UI.el(devicePanelHtml(state)), panel);
      }
    }
    ctx.onStore(function (state, reason) {
      if (reason === 'live' || reason === 'device') { refreshLive(); return; }
      /* 演示控制台切换空状态 / 错误态时整页重排，保证提示条与状态一致 */
      if (reason === 'demo') { global.App.render(global.Router.current()); }
    });

    /* 采集暂停时，定期刷新“最近更新时间”文案 */
    var timer = setInterval(function () {
      if (Store.get().device.paused) { refreshLive(); }
    }, 20000);
    ctx.onCleanup(function () { clearInterval(timer); });

    host.addEventListener('click', function (e) {
      var t = e.target;

      var ai = t.closest('[data-ai]');
      if (ai) { global.AIInsightSheet.open(ai.getAttribute('data-ai')); return; }

      var chip = t.closest('[data-live]');
      if (chip) { Store.actions.setLiveMetric(chip.getAttribute('data-live')); return; }

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

      if (role === 'pause') {
        var paused = Store.actions.togglePause();
        UI.toast(paused ? '采集已暂停' : '已继续采集', { icon: paused ? 'pause' : 'play' });
        return;
      }
      if (role === 'notice') { UI.toast('暂无新通知（演示）', { icon: 'bell' }); return; }
      if (role === 'device-detail' || role === 'device-open') {
        if (Store.get().device.bound) { global.Router.push('device-detail'); }
        return;
      }
      if (role === 'add-device') { global.Router.push('add-device'); return; }
      if (role === 'keep-demo') { UI.toast('已进入演示数据模式', { icon: 'info' }); return; }
      if (role === 'goal') { global.Router.push('goal'); return; }
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
    register: function () { return { title: '首页' }; },
    render: renderPage,
    mounted: mounted
  };
  Components.MetricCard = metricCardHtml;
  Components.DevicePanel = devicePanelHtml;
})(window);


