/* ===========================================================
   components/ai-insight-sheet.js —— AI 解读底部抽屉
   交互：点击“AI 解读” -> 呼吸式加载动画 -> 三段式结论
        （发生了什么 / 可以怎么做 / 需要注意）+ 安全边界
        可继续追问，跳转 AI 医生并自动带入当前指标上下文
   依赖：ui.js、charts.js、store.js、mock-data.js
   =========================================================== */
(function (global) {
  'use strict';

  var MD = global.MockData;
  var UI = global.UI;
  var Store = global.Store;

  function summaryRows(metricKey) {
    var cfg = MD.metrics[metricKey];
    var d = MD.detail[metricKey];
    var rows = [
      ['指标', cfg.name + '（' + cfg.abbr + '）'],
      ['当前状态', cfg.status + ' · ' + cfg.headline + ' ' + cfg.value + (cfg.unit ? ' ' + cfg.unit : '')],
      ['数据质量', cfg.quality],
      ['有效采集', d.duration]
    ];
    return rows.map(function (r) {
      return '<div class="kv-row"><span class="kv-key">' + UI.esc(r[0]) + '</span><span class="kv-val">' + UI.esc(r[1]) + '</span></div>';
    }).join('');
  }

  function resultHtml(metricKey) {
    var cfg = MD.metrics[metricKey];
    var ins = MD.insights[metricKey];
    return ''
      + '<div class="ai-headline"><span class="tag is-primary">' + UI.esc(cfg.name) + ' · AI 解读</span>'
      + '<h3 class="ai-title">' + UI.esc(ins.title) + '</h3>'
      + '<div class="ai-headline-sub">' + UI.esc(ins.headline) + '</div></div>'
      + '<div class="ai-block"><div class="ai-block-title">数据摘要</div><p>' + UI.esc(ins.summary) + '</p></div>'
      + '<div class="ai-block"><div class="ai-block-title"><i class="ai-dot is-blue"></i>发生了什么</div><p>' + UI.esc(ins.what) + '</p></div>'
      + '<div class="ai-block"><div class="ai-block-title"><i class="ai-dot is-green"></i>可以怎么做</div><p>' + UI.esc(ins.how) + '</p></div>'
      + '<div class="ai-block"><div class="ai-block-title"><i class="ai-dot is-amber"></i>需要注意</div><p>' + UI.esc(ins.care) + '</p></div>'
      + '<div class="ai-meta">'
      + '<div class="kv-list">' + summaryRows(metricKey) + '</div>'
      + '</div>'
      + '<div class="demo-note accent">' + UI.icon('alert', 14)
      + '<span>以上内容由本地演示逻辑生成，仅用于健康趋势参考，不构成诊断或治疗建议。AI 不能替代医生。</span></div>';
  }

  /* 打开 AI 解读抽屉；加载态约 1.1 秒后展示结果 */
  function open(metricKey, options) {
    var o = options || {};
    var cfg = MD.metrics[metricKey];
    var ins = MD.insights[metricKey];
    Store.actions.setAiStatus('loading', metricKey);

    var sheet = UI.sheet({
      title: 'AI 解读 · ' + cfg.name,
      body: ''
        + '<div id="ai-loading" class="ai-loading">'
        + '<div class="ai-loading-icon">' + UI.icon('sparkles', 22) + '</div>'
        + '<div class="ai-loading-text">正在结合您的近期数据生成解读</div>'
        + '<div class="breath-loader"><i></i><i></i><i></i></div>'
        + '<div class="ai-loading-hint">正在读取：' + UI.esc(cfg.name + ' 日 / 周 / 月记录与采集质量') + '</div>'
        + '</div>'
        + '<div id="ai-result" class="ai-result" hidden></div>',
      foot: '<div class="btn-row">'
        + '<button class="btn btn-ghost" data-close="1">我知道了</button>'
        + '<button class="btn btn-primary" data-role="follow">继续追问</button>'
        + '</div>',
      onClose: function () { Store.actions.setAiStatus('idle'); },
      onMount: function (wrap) {
        var timer = setTimeout(function () {
          var loading = UI.$('#ai-loading', wrap);
          var result = UI.$('#ai-result', wrap);
          if (!loading || !result) { return; }
          loading.style.display = 'none';
          result.hidden = false;
          result.innerHTML = resultHtml(metricKey);
          result.classList.add('is-in');
          Store.actions.setAiStatus('done', metricKey);
        }, 1100);

        UI.$('[data-role="follow"]', wrap).addEventListener('click', function () {
          clearTimeout(timer);
          Store.actions.setAiStatus('idle');
          Store.actions.setChatContext({ metric: metricKey, question: ins.follow, auto: true });
          UI.toast('已把' + cfg.name + '数据带入 AI 医生', { icon: 'sparkles' });
          sheetClose();
          global.Router.switchTab('ai');
        });
      }
    });

    function sheetClose() { sheet.close(); }
    return sheet;
  }

  global.AIInsightSheet = { open: open, resultHtml: resultHtml };
})(window);
