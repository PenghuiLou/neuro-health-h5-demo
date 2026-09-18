/* ===========================================================
   charts.js —— 轻量 SVG 图表（无第三方依赖，离线可用）
   包含：趋势折线（可横向滑动 / 可点击数据点 / 支持缺失区间）、
        迷你趋势线、环形评分、频段条、睡眠结构图、周对比柱状图
   依赖：无
   =========================================================== */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function fmt(v, digits) {
    if (typeof v !== 'number' || isNaN(v)) { return '-'; }
    var d = digits || 0;
    return d ? v.toFixed(d) : String(Math.round(v));
  }

  /* ---------- 几何计算：坐标、刻度区间、是否横向滚动 ---------- */
  function geometry(opts) {
    var pts = opts.points || [];
    var pad = Object.assign({ t: 16, r: 14, b: 24, l: 34 }, opts.pad || {});
    var n = pts.length;
    var stepX = opts.scroll ? (opts.stepX || 34) : (opts.width - pad.l - pad.r) / Math.max(1, n - 1);
    var width = opts.scroll ? pad.l + pad.r + stepX * Math.max(1, n - 1) : opts.width;
    var height = opts.height;
    var values = pts.filter(function (p) { return !p.missing; }).map(function (p) { return p.value; });
    if (opts.band) { values.push(opts.band.from, opts.band.to); }
    var lo = values.length ? Math.min.apply(null, values) : 0;
    var hi = values.length ? Math.max.apply(null, values) : 1;
    if (hi - lo < 4) { var mid = (hi + lo) / 2; lo = mid - 2; hi = mid + 2; }
    var span = hi - lo;
    lo -= span * 0.14;
    hi += span * 0.14;
    var plotH = height - pad.t - pad.b;
    function y(v) { return pad.t + (hi - v) / (hi - lo) * plotH; }
    function x(i) { return pad.l + i * stepX; }
    var coords = pts.map(function (p, i) {
      return { i: i, x: x(i), y: y(p.value), value: p.value, label: p.label, missing: !!p.missing };
    });
    return { coords: coords, x: x, y: y, width: width, height: height, pad: pad, lo: lo, hi: hi, stepX: stepX };
  }

  /* 平滑曲线（Catmull-Rom 转三次贝塞尔），避免折线生硬 */
  function smoothPath(list) {
    if (!list.length) { return ''; }
    if (list.length === 1) { return 'M' + list[0].x + ' ' + list[0].y; }
    var d = 'M' + list[0].x.toFixed(1) + ' ' + list[0].y.toFixed(1);
    for (var i = 0; i < list.length - 1; i++) {
      var p0 = list[i - 1] || list[i];
      var p1 = list[i];
      var p2 = list[i + 1];
      var p3 = list[i + 2] || p2;
      var c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
      var c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      d += 'C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1)
        + ' ' + p2.x.toFixed(1) + ' ' + p2.y.toFixed(1);
    }
    return d;
  }

  /* 缺失数据处断线：把有效点切成若干段 */
  function splitRuns(coords) {
    var runs = [], cur = [];
    coords.forEach(function (c) {
      if (c.missing) {
        if (cur.length) { runs.push(cur); cur = []; }
      } else { cur.push(c); }
    });
    if (cur.length) { runs.push(cur); }
    return runs;
  }

  /* ---------- 趋势折线图（含参考区间、事件标记、缺失区间） ---------- */
  function lineChart(opts) {
    var g = geometry(opts);
    var id = opts.id || 'chart-' + Math.random().toString(36).slice(2, 8);
    var color = opts.color || '#246BFD';
    var uid = id + '-grad';
    var h = g.height, w = g.width, pad = g.pad;
    var svg = ['<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h
      + '" role="img" aria-label="' + esc(opts.aria || '趋势图') + '">'];

    svg.push('<defs><linearGradient id="' + uid + '" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.22"/>'
      + '<stop offset="100%" stop-color="' + color + '" stop-opacity="0.01"/></linearGradient></defs>');

    /* 少量横向参考线，不绘制完整坐标轴 */
    [0, 0.5, 1].forEach(function (r) {
      var yy = pad.t + (h - pad.t - pad.b) * r;
      svg.push('<line x1="' + (pad.l - 6) + '" y1="' + yy.toFixed(1) + '" x2="' + (w - pad.r)
        + '" y2="' + yy.toFixed(1) + '" stroke="#f0e8db" stroke-width="1"/>');
      var val = g.hi - (g.hi - g.lo) * r;
      svg.push('<text x="' + (pad.l - 9) + '" y="' + (yy + 3.5).toFixed(1)
        + '" text-anchor="end" font-size="9.5" fill="#a89e90">' + fmt(val, opts.digits) + '</text>');
    });

    /* 个人参考区间（非医学诊断区间） */
    if (opts.band) {
      var yTop = g.y(opts.band.to), yBottom = g.y(opts.band.from);
      svg.push('<rect x="' + pad.l + '" y="' + yTop.toFixed(1) + '" width="' + (w - pad.l - pad.r)
        + '" height="' + Math.max(2, yBottom - yTop).toFixed(1) + '" fill="' + color + '" opacity="0.055" rx="4"/>');
    }

    /* 缺失数据灰区 */
    var i = 0;
    while (i < g.coords.length) {
      if (g.coords[i].missing) {
        var start = i, end = i;
        while (end + 1 < g.coords.length && g.coords[end + 1].missing) { end++; }
        var x1 = g.coords[start].x - g.stepX * 0.4, x2 = g.coords[end].x + g.stepX * 0.4;
        svg.push('<rect x="' + Math.max(pad.l - 6, x1).toFixed(1) + '" y="' + pad.t
          + '" width="' + Math.max(5, x2 - x1).toFixed(1) + '" height="' + (h - pad.t - pad.b)
          + '" fill="#efe6d8" opacity="0.65" rx="3"/>');
        i = end + 1;
      } else { i++; }
    }

    /* 采集事件标记 */
    if (opts.events && opts.events.length) {
      opts.events.forEach(function (ev) {
        var c = g.coords[ev.index];
        if (!c) { return; }
        svg.push('<line x1="' + c.x.toFixed(1) + '" y1="' + pad.t + '" x2="' + c.x.toFixed(1) + '" y2="'
          + (h - pad.b) + '" stroke="#F3A43B" stroke-width="1" stroke-dasharray="3 3" opacity="0.75"/>');
        svg.push('<circle cx="' + c.x.toFixed(1) + '" cy="' + pad.t + '" r="3" fill="#F3A43B"/>');
      });
    }

    /* 折线 + 面积填充 */
    splitRuns(g.coords).forEach(function (run) {
      var path = smoothPath(run);
      if (run.length > 1) {
        var area = path + 'L' + run[run.length - 1].x.toFixed(1) + ' ' + (h - pad.b)
          + 'L' + run[0].x.toFixed(1) + ' ' + (h - pad.b) + 'Z';
        svg.push('<path d="' + area + '" fill="url(#' + uid + ')" stroke="none"/>');
      }
      svg.push('<path d="' + path + '" fill="none" stroke="' + color
        + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>');
    });

    /* 数据点 + 点击热区 */
    g.coords.forEach(function (c) {
      if (c.missing) { return; }
      svg.push('<circle class="pt-dot" data-i="' + c.i + '" cx="' + c.x.toFixed(1) + '" cy="' + c.y.toFixed(1)
        + '" r="' + (g.coords.length > 14 ? 2 : 3) + '" fill="#fff" stroke="' + color + '" stroke-width="1.6"/>');
    });
    g.coords.forEach(function (c) {
      svg.push('<circle class="pt-hit" data-i="' + c.i + '" cx="' + c.x.toFixed(1) + '" cy="' + c.y.toFixed(1)
        + '" r="11" fill="transparent"/>');
    });

    /* 横轴只保留首 / 中 / 尾三个标签，保证留白 */
    [0, Math.floor((g.coords.length - 1) / 2), g.coords.length - 1].forEach(function (idx, k) {
      var c = g.coords[idx];
      if (!c) { return; }
      var tx = k === 0 ? pad.l - 4 : (k === 2 ? w - pad.r + 4 : c.x);
      var anchor = k === 0 ? 'start' : (k === 2 ? 'end' : 'middle');
      svg.push('<text x="' + tx.toFixed(1) + '" y="' + (h - 6) + '" text-anchor="' + anchor
        + '" font-size="10" fill="#a89e90">' + esc(c.label) + '</text>');
    });

    svg.push('</svg>');
    return svg.join('');
  }

  /* 绑定点击交互：点击数据点显示数值浮层 */
  function mountLine(container, opts) {
    if (!container) { return; }
    var g = geometry(opts);
    var tip = document.createElement('div');
    tip.className = 'chart-tip';
    container.appendChild(tip);
    var active = null;
    var baseR = g.coords.length > 14 ? 2 : 3;

    function setR(i, r) {
      var dot = container.querySelector('.pt-dot[data-i="' + i + '"]');
      if (dot) { dot.setAttribute('r', r); }
    }
    function show(index) {
      var c = g.coords[index];
      if (!c) { return; }
      var unit = opts.unit ? (opts.unit === '分' ? ' 分' : ' ' + opts.unit) : '';
      tip.innerHTML = '<b>' + esc(c.label) + '</b><span>'
        + (c.missing ? '该时段数据缺失' : fmt(c.value, opts.digits) + unit) + '</span>';
      tip.classList.add('is-on');
      var maxLeft = container.clientWidth - tip.offsetWidth - 6;
      var left = c.x - tip.offsetWidth / 2;
      left = container.clientWidth > 0 ? Math.max(4, Math.min(maxLeft, left)) : Math.max(4, c.x - 40);
      tip.style.left = left + 'px';
      tip.style.top = Math.max(0, c.y - 46) + 'px';
      if (active !== null) { setR(active, baseR); }
      setR(index, 4.5);
      active = index;
    }
    function hide() {
      tip.classList.remove('is-on');
      if (active !== null) { setR(active, baseR); }
      active = null;
    }

    container.addEventListener('click', function (e) {
      var hit = e.target && e.target.closest ? e.target.closest('.pt-hit') : null;
      if (!hit) { hide(); return; }
      var idx = parseInt(hit.getAttribute('data-i'), 10);
      show(idx);
      if (typeof opts.onPoint === 'function') { opts.onPoint(g.coords[idx]); }
    });
  }

  /* ---------- 迷你趋势线（指标卡片） ---------- */
  function sparkline(values, color, w, h) {
    var width = w || 104, height = h || 34;
    var vs = (values || []).slice(-30);
    if (vs.length < 2) { return ''; }
    var lo = Math.min.apply(null, vs), hi = Math.max.apply(null, vs);
    if (hi - lo < 1) { hi = lo + 1; }
    var step = width / (vs.length - 1);
    var pts = vs.map(function (v, i) {
      return { x: i * step, y: height - 4 - (v - lo) / (hi - lo) * (height - 10) };
    });
    var d = smoothPath(pts);
    var area = d + 'L' + width + ' ' + height + 'L0 ' + height + 'Z';
    return '<svg class="spark-svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" aria-hidden="true">'
      + '<path d="' + area + '" fill="' + color + '" opacity="0.1"/>'
      + '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  /* ---------- 环形评分 ---------- */
  function ring(opts) {
    var size = opts.size || 124, stroke = opts.stroke || 10;
    var r = (size - stroke) / 2, cx = size / 2, cy = size / 2;
    var C = 2 * Math.PI * r;
    var ratio = Math.max(0, Math.min(1, opts.value / (opts.max || 100)));
    var offset = C * (1 - ratio);
    var color = opts.color || '#246BFD';
    return '<svg class="ring-svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" aria-label="综合评分">'
      + '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#f2eae0" stroke-width="' + stroke + '"/>'
      + '<circle class="ring-progress" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + color
      + '" stroke-width="' + stroke + '" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + ' ' + C.toFixed(1)
      + '" stroke-dashoffset="' + C.toFixed(1) + '" data-target="' + offset.toFixed(1) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')"/>'
      + '<text x="' + cx + '" y="' + (cy + 2) + '" text-anchor="middle" font-size="30" font-weight="700" fill="#172033">' + fmt(opts.value) + '</text>'
      + '<text x="' + cx + '" y="' + (cy + 20) + '" text-anchor="middle" font-size="10.5" fill="#718096">' + esc(opts.label || '分') + '</text>'
      + '</svg>';
  }

  /* 环形图入场动画：从 0 过渡到目标进度 */
  function mountRing(container) {
    if (!container) { return; }
    var circles = container.querySelectorAll('.ring-progress');
    Array.prototype.forEach.call(circles, function (el, idx) {
      var target = el.getAttribute('data-target');
      el.style.transition = 'stroke-dashoffset 900ms cubic-bezier(0.22,0.8,0.3,1) ' + (idx * 120) + 'ms';
      setTimeout(function () { el.setAttribute('stroke-dashoffset', target); }, 40);
    });
  }

  /* ---------- 脑电频段相对变化（横向条） ---------- */
  function bandBars(items) {
    var html = ['<div class="band-list">'];
    items.forEach(function (b) {
      html.push('<div class="band-item">'
        + '<div class="band-head"><span class="band-name">' + esc(b.name) + '</span>'
        + '<span class="band-desc">' + esc(b.desc) + '</span>'
        + '<span class="band-value">' + fmt(b.value) + '%</span></div>'
        + '<div class="band-track"><i style="width:' + Math.max(2, Math.min(100, b.value)) + '%;background:' + b.color + '"></i></div>'
        + '</div>');
    });
    html.push('</div>');
    return html.join('');
  }

  /* ---------- 睡眠结构：堆叠条 + 图例 ---------- */
  function stageBar(stages) {
    var total = stages.reduce(function (a, s) { return a + s.minutes; }, 0) || 1;
    var bar = ['<div class="stage-bar">'];
    stages.forEach(function (s) {
      bar.push('<i style="width:' + ((s.minutes / total) * 100).toFixed(2) + '%;background:' + s.color + '"></i>');
    });
    bar.push('</div>');
    bar.push('<div class="stage-legend">');
    stages.forEach(function (s) {
      var h = Math.floor(s.minutes / 60), m = s.minutes % 60;
      var dur = h ? h + '小时' + (m ? m + '分钟' : '') : m + '分钟';
      bar.push('<div class="legend-item"><span class="legend-dot" style="background:' + s.color + '"></span>'
        + '<span class="legend-name">' + esc(s.name) + '</span>'
        + '<span class="legend-val">' + dur + ' · ' + Math.round((s.minutes / total) * 100) + '%</span></div>');
    });
    bar.push('</div>');
    return bar.join('');
  }

  /* ---------- 睡眠阶段图（Hypnogram） ---------- */
  var HYPNO_ROWS = [
    { level: 3, name: '深睡', color: '#4B62E0' },
    { level: 2, name: '浅睡', color: '#8FA6F0' },
    { level: 1, name: 'REM', color: '#7B6CF6' },
    { level: 0, name: '清醒', color: '#CBD4E1' }
  ];

  function hypnogram(blocks) {
    var html = ['<div class="hypno">'];
    HYPNO_ROWS.forEach(function (row) {
      html.push('<div class="hypno-row"><span class="hypno-label">' + row.name + '</span><div class="hypno-track">');
      blocks.forEach(function (b) {
        html.push('<i class="hypno-block" style="flex:0 0 ' + b.widthPct + '%;'
          + (b.level === row.level ? 'background:' + row.color : 'background:#f5efe5') + '" title="'
          + esc(b.name) + ' ' + b.minutes + ' 分钟"></i>');
      });
      html.push('</div></div>');
    });
    html.push('</div>');
    return html.join('');
  }

  /* ---------- 周对比柱状图 ---------- */
  function compareBars(points, opts) {
    var o = opts || {};
    var w = o.width || 358, h = o.height || 138;
    var pad = { t: 20, r: 8, b: 24, l: 8 };
    var n = points.length || 1;
    var slot = (w - pad.l - pad.r) / n;
    var barW = Math.min(26, slot * 0.46);
    var color = o.color || '#246BFD';
    var vs = points.filter(function (p) { return !p.missing; }).map(function (p) { return p.value; });
    var lo = vs.length ? Math.min.apply(null, vs) : 0;
    var hi = vs.length ? Math.max.apply(null, vs) : 1;
    if (hi - lo < 4) { hi = lo + 4; }
    var plotH = h - pad.t - pad.b;
    var svg = ['<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="每日平均值对比">'];
    svg.push('<line x1="0" y1="' + (h - pad.b) + '" x2="' + w + '" y2="' + (h - pad.b) + '" stroke="#f0e8db" stroke-width="1"/>');
    points.forEach(function (p, i) {
      var cx = pad.l + slot * i + slot / 2;
      if (p.missing) {
        svg.push('<rect x="' + (cx - barW / 2) + '" y="' + (h - pad.b - 10) + '" width="' + barW + '" height="10" rx="4" fill="#efe6d8"/>');
      } else {
        var barH = Math.max(6, (p.value - lo) / (hi - lo) * plotH);
        var y = h - pad.b - barH;
        svg.push('<rect x="' + (cx - barW / 2).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + barW
          + '" height="' + barH.toFixed(1) + '" rx="5" fill="' + (o.highlightIndex === i ? color : color) + '" opacity="'
          + (o.highlightIndex === i ? '1' : '0.32') + '"/>');
        svg.push('<text x="' + cx.toFixed(1) + '" y="' + (y - 5).toFixed(1)
          + '" text-anchor="middle" font-size="10" letter-spacing="0" fill="#4A5568">' + fmt(p.value, o.digits)
          + (o.unit ? o.unit : '') + '</text>');
      }
      svg.push('<text x="' + cx.toFixed(1) + '" y="' + (h - 8) + '" text-anchor="middle" font-size="10" fill="#a89e90">'
        + esc(o.short ? String(p.label).slice(-1 * (o.short === true ? 2 : o.short)) : p.label) + '</text>');
    });
    svg.push('</svg>');
    return svg.join('');
  }

  global.Charts = {
    line: lineChart,
    mountLine: mountLine,
    sparkline: sparkline,
    ring: ring,
    mountRing: mountRing,
    bandBars: bandBars,
    stageBar: stageBar,
    hypnogram: hypnogram,
    compareBars: compareBars,
    esc: esc,
    fmt: fmt
  };
})(window);


