/* ===========================================================
   pages/metric-detail.js —— 指标详情页（MetricDetailPage）
   覆盖：日 / 周 / 月切换、趋势图与数据摘要切换、参考区间、
        事件标记、缺失数据区间、睡眠结构分析、月度报告、
        AI 解读入口、“这是什么指标”说明与医疗边界声明
   依赖：ui.js、charts.js、store.js、mock-data.js、ai-insight-sheet.js
   =========================================================== */
(function (global) {
  'use strict';

  var MD = global.MockData;
  var UI = global.UI;
  var Charts = global.Charts;
  var Store = global.Store;
  var Pages = global.Pages = global.Pages || {};

  var RANGE_LABEL = { day: '日', week: '周', month: '月' };
  var chartState = { range: 'day', mode: 'trend', metric: 'eeg' };

  /* ---------- 参考区间：仅表示个人常态范围，不代表诊断标准 ---------- */
  function bandOf(metric, range) {
    if (metric === 'sleep') {
      return range === 'day' ? { from: 52, to: 66 } : { from: 74, to: 88 };
    }
    var cfg = MD.metrics[metric];
    if (metric === 'ecg') { return { from: 66, to: 78 }; }
    return { from: cfg.range[0], to: cfg.range[1] };
  }

  function pointsOf(metric, range) {
    var d = MD.detail[metric];
    if (range === 'week') { return d.week; }
    if (range === 'month') { return d.month; }
    return d.day;
  }

  function unitOf(metric, range) {
    if (metric === 'sleep' && range === 'day') { return 'BPM'; }
    return MD.metrics[metric].unit;
  }

  function titleOf(metric, range) {
    if (range === 'day') { return metric === 'sleep' ? '睡眠期间心率趋势' : '今日 ' + MD.metrics[metric].name + '趋势'; }
    if (range === 'week') { return '近 7 天' + (metric === 'sleep' ? '睡眠评分' : MD.metrics[metric].name + '趋势'); }
    return '近 30 天' + (metric === 'sleep' ? '睡眠评分' : MD.metrics[metric].name + '趋势');
  }

  /* ---------- 顶部：返回 + 指标名 + 状态 + 数据说明 ---------- */
  function headHtml(metric) {
    var cfg = MD.metrics[metric];
    return UI.pageHead({
      title: cfg.name + ' · ' + cfg.abbr,
      sub: '数据仅用于健康趋势记录，不用于单独诊断疾病',
      right: UI.tag(cfg.status, cfg.statusTone)
        + '<button class="icon-btn" data-role="explain" aria-label="数据说明">' + UI.icon('info', 19) + '</button>'
    });
  }

  /* ---------- 当前值卡片 ---------- */
  function heroHtml(metric) {
    var cfg = MD.metrics[metric];
    var d = MD.detail[metric];
    var value = metric === 'sleep' ? MD.overview.score + 4 : cfg.value;
    var sub = metric === 'sleep'
      ? '睡眠评分 · ' + d.duration
      : cfg.headline + ' · ' + d.duration + '有效采集';
    return '<div class="card hero-card" style="border-color:' + cfg.soft + '">'
      + '<div class="hero-left">'
      + '<div class="hero-label">' + UI.esc(cfg.headline) + '</div>'
      + '<div class="hero-value"><b>' + value + '</b><span>' + UI.esc(cfg.unit) + '</span></div>'
      + '<div class="hero-status">' + UI.tag(cfg.status, cfg.statusTone) + ' ' + UI.tag('数据质量 ' + cfg.quality, cfg.qualityTone) + '</div>'
      + '<div class="hero-sub">' + UI.esc(sub) + '</div>'
      + '</div>'
      + '<div class="hero-spark">' + Charts.sparkline(pointsOf(metric, 'day').map(function (p) { return p.value; }), cfg.color, 96, 46) + '</div>'
      + '</div>';
  }

  /* ---------- 趋势图卡片 ---------- */
  function chartOptions(metric, range) {
    var cfg = MD.metrics[metric];
    var scroll = range === 'month';
    return {
      points: pointsOf(metric, range),
      width: 326, height: 190, color: cfg.color,
      unit: unitOf(metric, range), digits: 0,
      aria: titleOf(metric, range),
      band: bandOf(metric, range),
      events: range === 'day' ? MD.detail[metric].events : null,
      scroll: scroll, stepX: 34,
      id: 'detail-' + metric + '-' + range
    };
  }

  function chartHtml(metric, range) {
    var d = MD.detail[metric];
    var missing = pointsOf(metric, range).some(function (p) { return p.missing; });
    var legend = '<div class="chart-legend">'
      + '<span class="lg"><i class="lg-band"></i>个人参考区间</span>'
      + (range === 'day' ? '<span class="lg"><i class="lg-event"></i>采集事件</span>' : '')
      + (missing ? '<span class="lg"><i class="lg-missing"></i>数据缺失</span>' : '')
      + '</div>';
    var monthFoot = range === 'month'
      ? '<div class="chart-foot"><button class="btn btn-soft btn-sm btn-block" data-role="month-report">'
        + UI.icon('doc', 15) + '生成月度报告</button></div>'
      : '';
    return '<div class="card chart-card">'
      + '<div class="chart-title-row"><div class="chart-title">' + UI.esc(titleOf(metric, range)) + '</div>'
      + UI.tag(range === 'day' ? '今日' : range === 'week' ? '近 7 天' : '近 30 天', 'primary') + '</div>'
      + '<div class="chart-box' + (range === 'month' ? ' chart-scroll' : '') + '" data-role="chart"></div>'
      + legend
      + '<div class="chart-hint">' + UI.icon('info', 13) + '<span>点击数据点查看具体数值'
      + (range === 'month' ? '，图表可左右滑动查看完整 30 天' : '')
      + '；参考区间为演示用个人常态范围，不代表诊断标准</span></div>'
      + monthFoot
      + '<div class="demo-note">' + UI.icon('shield', 14)
      + '<span>' + UI.esc(d.note) + '</span></div>'
      + '</div>';
  }

  /* ---------- 统计数值 ---------- */
  function statSummary(points) {
    var vs = points.filter(function (p) { return !p.missing; }).map(function (p) { return p.value; });
    if (!vs.length) { return { max: 0, min: 0, avg: 0 }; }
    return {
      max: Math.max.apply(null, vs),
      min: Math.min.apply(null, vs),
      avg: Math.round(vs.reduce(function (a, b) { return a + b; }, 0) / vs.length * 10) / 10
    };
  }

  function statGrid(items) {
    return '<div class="stat-grid">' + items.map(function (it) {
      return '<div class="stat-item"><b>' + it.value + '</b><span>' + UI.esc(it.label) + '</span></div>';
    }).join('') + '</div>';
  }

  function statsHtml(metric, range) {
    var d = MD.detail[metric];
    var cfg = MD.metrics[metric];
    var s = statSummary(pointsOf(metric, range));
    var unit = cfg.unit;

    if (range === 'day') {
      return statGrid([
        { label: '最高值', value: s.max + ' ' + unit },
        { label: '最低值', value: s.min + ' ' + unit },
        { label: '平均值', value: s.avg + ' ' + unit }
      ]) + '<div class="kv-list">'
        + kv('有效采集时长', d.duration)
        + kv('数据质量', cfg.quality)
        + kv('采集事件', (d.events && d.events.length ? d.events.length + ' 个（' + d.events.map(function (e) { return e.label; }).join('、') + '）' : '无'))
        + '</div>';
    }

    if (range === 'week') {
      var month = d.month.map(function (p) { return p.value; });
      var last7 = month.slice(-7), prev7 = month.slice(-14, -7);
      var avg = function (a) { return a.reduce(function (x, y) { return x + y; }, 0) / (a.length || 1); };
      var diff = Math.round((avg(last7) - avg(prev7)) * 10) / 10;
      return statGrid([
        { label: '周平均', value: s.avg + ' ' + unit },
        { label: '较上一周', value: (diff >= 0 ? '+' : '') + diff + ' ' + unit },
        { label: '采集天数', value: '7 天' }
      ]) + '<div class="kv-list">'
        + kv('本周最高 / 最低', s.max + ' / ' + s.min + ' ' + unit)
        + kv('数据完整率', '96%（共 7 天，1 天存在短时缺失）')
        + kv('采集时段', '每日 08:00 — 22:00 分段采集')
        + '</div>';
    }

    var bestIdx = 0;
    d.month.forEach(function (p, i) { if (!p.missing && p.value > d.month[bestIdx].value) { bestIdx = i; } });
    return statGrid([
      { label: '月平均', value: s.avg + ' ' + unit },
      { label: '最佳记录日', value: d.month[bestIdx].label },
      { label: '数据完整率', value: '93%' }
    ]) + '<div class="kv-list">'
      + kv('最佳记录数值', d.month[bestIdx].value + ' ' + unit)
      + kv('连续采集天数', '26 天')
      + kv('本月最高 / 最低', s.max + ' / ' + s.min + ' ' + unit)
      + '</div>';
  }

  function kv(k, v) {
    return '<div class="kv-row"><span class="kv-key">' + UI.esc(k) + '</span><span class="kv-val">' + UI.esc(v) + '</span></div>';
  }

  /* ---------- 数据摘要视图 ---------- */
  function summaryHtml(metric, range) {
    var cfg = MD.metrics[metric];
    var d = MD.detail[metric];
    var s = statSummary(pointsOf(metric, range));
    var band = bandOf(metric, range);
    return '<div class="card">'
      + '<div class="chart-title-row"><div class="chart-title">数据摘要 · ' + RANGE_LABEL[range] + '视图</div>'
      + UI.tag(cfg.quality + '质量', cfg.qualityTone) + '</div>'
      + '<div class="kv-list">'
      + kv('指标', cfg.name + '（' + cfg.abbr + '）')
      + kv('采集窗口', range === 'day' ? '今日 08:00 — 22:00' : range === 'week' ? '近 7 天' : '近 30 天')
      + kv('平均值', s.avg + ' ' + cfg.unit)
      + kv('最高 / 最低', s.max + ' / ' + s.min + ' ' + cfg.unit)
      + kv('个人参考区间', band.from + ' — ' + band.to + ' ' + cfg.unit)
      + kv('有效采集时长', d.duration)
      + kv('数据质量', cfg.quality)
      + kv('说明', d.note)
      + '</div>'
      + '<div class="demo-note accent">' + UI.icon('alert', 14)
      + '<span>本页面数据仅用于健康趋势记录，不用于单独诊断疾病。</span></div>'
      + '</div>';
  }

  function controlsHtml() {
    var r = chartState.range, m = chartState.mode;
    return '<div class="control-row">'
      + '<div class="segmented">'
      + ['day', 'week', 'month'].map(function (k) {
        return '<button class="' + (r === k ? 'is-active' : '') + '" data-range="' + k + '">' + RANGE_LABEL[k] + '</button>';
      }).join('')
      + '</div>'
      + '<div class="segmented is-mode">'
      + ['trend', 'summary'].map(function (k) {
        return '<button class="' + (m === k ? 'is-active' : '') + '" data-mode="' + k + '">' + (k === 'trend' ? '趋势' : '数据摘要') + '</button>';
      }).join('')
      + '</div>'
      + '</div>';
  }

  /* ---------- 睡眠结构分析（仅睡眠指标 · 日视图） ---------- */
  function sleepSectionHtml() {
    var d = MD.detail.sleep;
    var s = d.sleep;
    return '<div class="card">'
      + '<div class="chart-title-row"><div class="chart-title">睡眠结构</div>' + UI.tag('昨夜间', 'primary') + '</div>'
      + Charts.stageBar(s.stageHours)
      + '<div class="divider"></div>'
      + '<div class="chart-title-row"><div class="chart-title">睡眠阶段分布</div>'
      + '<span class="card-sub">23:08 — 06:50</span></div>'
      + Charts.hypnogram(s.hypnogram)
      + '<div class="chart-hint">' + UI.icon('info', 13)
      + '<span>睡眠阶段由设备信号估算，用于观察作息规律，不用于判断睡眠疾病</span></div>'
      + '</div>'
      + '<div class="card">'
      + '<div class="chart-title-row"><div class="chart-title">睡眠概览</div>'
      + UI.tag('评分 ' + MD.metrics.sleep.value, 'primary') + '</div>'
      + statGrid([
        { label: '总睡眠时长', value: '7小时42分' },
        { label: '深睡', value: '1小时38分' },
        { label: '浅睡', value: '4小时21分' },
        { label: 'REM', value: '1小时43分' },
        { label: '夜间醒来', value: '2 次' },
        { label: '入睡 / 起床', value: '23:08 / 06:50' }
      ])
      + '<div class="demo-note">' + UI.icon('shield', 14)
      + '<span>深睡占比约 21%，处于演示数据设定的个人近期常态范围。</span></div>'
      + '</div>'
      + '<div class="card">'
      + '<div class="chart-title-row"><div class="chart-title">睡眠期间呼吸趋势</div>'
      + UI.tag('次 / 分钟', 'primary') + '</div>'
      + '<div class="chart-box" data-role="breath-chart"></div>'
      + '<div class="chart-hint">' + UI.icon('info', 13)
      + '<span>呼吸趋势为设备信号估算结果，仅用于观察夜间变化</span></div>'
      + '</div>';
  }

  /* ---------- AI 解读入口卡片 ---------- */
  function aiCardHtml(metric) {
    var cfg = MD.metrics[metric];
    return '<div class="card ai-entry">'
      + '<div class="ai-entry-icon">' + UI.icon('sparkles', 20) + '</div>'
      + '<div class="ai-entry-main"><div class="ai-entry-title">AI 解读</div>'
      + '<div class="ai-entry-desc">结合' + UI.esc(cfg.name) + '的日 / 周 / 月记录、采集质量与近期变化，生成一段看得懂的说明与生活方式建议。</div></div>'
      + '<div class="btn-row" style="margin-top:12px">'
      + '<button class="btn btn-primary btn-sm" data-ai="' + metric + '">' + UI.icon('sparkles', 15) + 'AI解读</button>'
      + '<button class="btn btn-ghost btn-sm" data-role="ask-ai">继续追问</button>'
      + '</div>'
      + '</div>';
  }

  /* ---------- 这是什么指标 ---------- */
  function explainHtml(metric) {
    var cfg = MD.metrics[metric];
    return '<div class="card">'
      + '<div class="chart-title-row"><div class="chart-title">这是什么指标？</div>'
      + '<button class="text-btn" data-role="explain">查看更多' + UI.icon('chevron', 14) + '</button></div>'
      + '<div class="explain-text">' + UI.esc(cfg.explain) + '</div>'
      + '<div class="demo-note accent">' + UI.icon('alert', 14)
      + '<span>本页面数据仅用于健康趋势记录，不用于单独诊断疾病。</span></div>'
      + '</div>';
  }

  /* ---------- 说明抽屉 ---------- */
  function openExplain(metric) {
    var cfg = MD.metrics[metric];
    UI.sheet({
      title: cfg.name + ' · 数据说明',
      body: '<div class="explain-text">' + UI.esc(cfg.explain) + '</div>'
        + '<div class="kv-list" style="margin-top:12px">'
        + kv('采集方式', '脑安神经健康仪 ' + cfg.abbr + ' 通道，佩戴到位后自动采集')
        + kv('显示方式', '展示相对趋势与个人参考区间，不展示诊断阈值')
        + kv('更新频率', '采集期间每 3 秒刷新一次，日 / 周 / 月自动汇总')
        + kv('数据边界', '数据受佩戴位置、身体移动与采集环境影响')
        + '</div>'
        + '<div class="demo-note accent">' + UI.icon('alert', 14)
        + '<span>演示模式：当前数据为模拟数据，不作为医疗判断依据。</span></div>'
    });
  }

  /* ---------- 月度报告（模拟异步生成） ---------- */
  function openMonthReport(metric) {
    var cfg = MD.metrics[metric];
    var d = MD.detail[metric];
    var s = statSummary(d.month);
    var ins = MD.insights[metric];
    UI.sheet({
      title: '月度报告 · ' + cfg.name,
      body: '<div class="ai-loading" data-role="report-loading">'
        + '<div class="ai-loading-icon">' + UI.icon('doc', 22) + '</div>'
        + '<div class="ai-loading-text">正在汇总近 30 天记录</div>'
        + '<div class="breath-loader"><i></i><i></i><i></i></div>'
        + '<div class="ai-loading-hint">包含采集完整率、趋势变化与个人参考区间对比</div>'
        + '</div><div data-role="report-body" hidden></div>',
      onMount: function (wrap) {
        setTimeout(function () {
          var loading = UI.$('[data-role="report-loading"]', wrap);
          var body = UI.$('[data-role="report-body"]', wrap);
          if (!loading || !body) { return; }
          loading.style.display = 'none';
          body.hidden = false;
          body.innerHTML = '<div class="ai-headline"><span class="tag is-violet">近 30 天</span>'
            + '<h3>' + UI.esc(cfg.name + '月平均 ' + s.avg + ' ' + cfg.unit) + '</h3></div>'
            + statGrid([
              { label: '月平均', value: s.avg + ' ' + cfg.unit },
              { label: '最高 / 最低', value: s.max + ' / ' + s.min },
              { label: '数据完整率', value: '93%' }
            ])
            + '<div class="kv-list" style="margin-top:12px">'
            + kv('连续采集天数', '26 天')
            + kv('趋势摘要', ins.what)
            + kv('生活建议', ins.how)
            + '</div>'
            + '<div class="demo-note accent">' + UI.icon('alert', 14)
            + '<span>月度报告由本地演示逻辑生成，仅用于健康趋势参考，不构成诊断或治疗建议。</span></div>';
        }, 1200);
      }
    });
  }

  /* ---------- 页面主体 ---------- */
  function bodyHtml(metric) {
    var state = Store.get();
    if (state.demo.empty) {
      return '<div class="card">' + UI.stateBox({
        icon: 'activity', title: '还没有足够的有效记录',
        desc: '完成一次完整采集后，这里会生成您的个人趋势。',
        actionHtml: '<button class="btn btn-primary btn-sm" data-role="start-collect">开始采集</button>'
      }) + '</div>' + explainHtml(metric);
    }
    return heroHtml(metric)
      + controlsHtml()
      + (chartState.mode === 'trend'
        ? chartHtml(metric, chartState.range)
        : summaryHtml(metric, chartState.range))
      + '<div class="card stat-card">'
      + '<div class="chart-title-row"><div class="chart-title">' + RANGE_LABEL[chartState.range] + '视图统计</div>'
      + UI.tag(MD.metrics[metric].quality + '质量', MD.metrics[metric].qualityTone) + '</div>'
      + statsHtml(metric, chartState.range)
      + '</div>'
      + (metric === 'eeg' && chartState.range === 'day'
        ? '<div class="card"><div class="chart-title-row"><div class="chart-title">脑电频段相对变化</div>'
          + UI.tag('今日', 'primary') + '</div>' + Charts.bandBars(MD.bands)
          + '<div class="chart-hint">' + UI.icon('info', 13)
          + '<span>频段占比为相对趋势，用于观察放松 / 专注倾向，不用于判断疾病</span></div></div>'
        : '')
      + (metric === 'sleep' && chartState.range === 'day' ? sleepSectionHtml() : '')
      + aiCardHtml(metric)
      + explainHtml(metric);
  }

  function mountCharts(scope, metric) {
    var box = UI.$('[data-role="chart"]', scope);
    if (box) {
      var opts = chartOptions(metric, chartState.range);
      box.innerHTML = Charts.line(opts);
      Charts.mountLine(box, opts);
    }
    var scroller = UI.$('.chart-scroll', scope);
    if (scroller) { scroller.scrollLeft = scroller.scrollWidth; }

    var breath = UI.$('[data-role="breath-chart"]', scope);
    if (breath && MD.detail.sleep.sleep) {
      var bOpts = {
        points: MD.detail.sleep.sleep.brToday, width: 326, height: 158,
        color: '#20B486', unit: '次/分', digits: 0, aria: '睡眠期间呼吸趋势',
        band: { from: 12, to: 18 }, id: 'breath-chart'
      };
      breath.innerHTML = Charts.line(bOpts);
      Charts.mountLine(breath, bOpts);
    }
  }

  /* ---------- 页面渲染与交互 ---------- */
  function renderPage(params) {
    var metric = (params && params.metric) || 'eeg';
    chartState = { range: 'day', mode: 'trend', metric: metric };
    return UI.el('<div class="page detail-page">'
      + headHtml(metric)
      + '<div data-role="body">' + UI.skeletonChart() + UI.skeleton(4) + '</div>'
      + '</div>');
  }

  function mounted(host, params, ctx) {
    var metric = (params && params.metric) || 'eeg';
    var bodyEl = UI.$('[data-role="body"]', host);
    UI.bindBack(host);

    /* 首次进入展示骨架屏，模拟数据加载过程 */
    var timer = setTimeout(function () {
      bodyEl.innerHTML = bodyHtml(metric);
      mountCharts(bodyEl, metric);
    }, 420);
    ctx.onCleanup(function () { clearTimeout(timer); });

    function refresh() {
      bodyEl.innerHTML = bodyHtml(metric);
      mountCharts(bodyEl, metric);
    }

    host.addEventListener('click', function (e) {
      var t = e.target;

      var rangeBtn = t.closest('[data-range]');
      if (rangeBtn) {
        chartState.range = rangeBtn.getAttribute('data-range');
        chartState.mode = 'trend';
        refresh();
        return;
      }
      var modeBtn = t.closest('[data-mode]');
      if (modeBtn) {
        chartState.mode = modeBtn.getAttribute('data-mode');
        refresh();
        return;
      }
      var ai = t.closest('[data-ai]');
      if (ai) { global.AIInsightSheet.open(ai.getAttribute('data-ai')); return; }

      var roleEl = t.closest('[data-role]');
      var role = roleEl ? roleEl.getAttribute('data-role') : null;
      if (role === 'explain') { openExplain(metric); return; }
      if (role === 'month-report') { openMonthReport(metric); return; }
      if (role === 'ask-ai') {
        Store.actions.setChatContext({ metric: metric, question: MD.insights[metric].follow, auto: true });
        global.Router.switchTab('ai');
        return;
      }
      if (role === 'start-collect') {
        UI.toast('正在开始一次完整采集…', { icon: 'activity' });
        setTimeout(function () {
          Store.actions.setDemo({ empty: false });
          refresh();
          UI.toast('采集完成，已生成趋势', { icon: 'check' });
        }, 1400);
      }
    });
  }

  Pages.metric = { render: renderPage, mounted: mounted };
})(window);



