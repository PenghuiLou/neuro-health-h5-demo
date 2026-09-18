/* ===========================================================
   pages/ai-doctor.js —— AI 医生（AIDoctorPage）
   定位：可解释健康趋势的对话式助手（不替代医生诊断）
   功能：欢迎语、预设问题、模拟回答、打字中状态、
        底部输入栏、语音占位、数据引用、安全边界提示
   依赖：ui.js、store.js、mock-data.js
   =========================================================== */
(function (global) {
  'use strict';

  var MD = global.MockData;
  var UI = global.UI;
  var Store = global.Store;
  var Pages = global.Pages = global.Pages || {};

  /* AI 头像：动漫风格简笔画（不模拟真人医生形象） */
  function avatarSvg(size) {
    return UI.animeAvatar('doctor', size || 34);
  }

  function headHtml(state) {
    return '<div class="chat-head card">'
      + '<div class="chat-avatar">' + avatarSvg(40) + '<i class="online-dot"></i></div>'
      + '<div class="chat-head-main">'
      + '<div class="chat-name">脑安 AI 医生<span class="tag is-success"><i class="dot"></i>在线</span></div>'
      + '</div>'
      + '<button class="icon-btn ghost" data-role="switch-agent" aria-label="切换医生">' + UI.icon('swap', 18) + '</button>'
      + '</div>';
  }

  /* 医生 Agent 切换（演示：当前仅脑安 AI 医生可用，其余为规划中） */
  function openAgentSheet() {
    var agents = [
      { name: '脑安 AI 医生', desc: '解释睡眠 / 心率 / 脑电 / 脑氧趋势', state: '当前' },
      { name: '睡眠管理师', desc: '专注作息规划与睡眠小目标（规划中）', state: '敬请期待' },
      { name: '呼吸放松教练', desc: '引导呼吸练习与放松训练（规划中）', state: '敬请期待' }
    ];
    UI.sheet({
      title: '切换医生 Agent',
      body: '<div class="agent-list">' + agents.map(function (a, i) {
        return '<div class="agent-row' + (i === 0 ? ' is-active' : '') + '" data-agent="' + i + '">'
          + '<div class="agent-avatar">' + avatarSvg(34) + '</div>'
          + '<div class="agent-main"><div class="agent-name">' + UI.esc(a.name) + '</div>'
          + '<div class="agent-desc">' + UI.esc(a.desc) + '</div></div>'
          + UI.tag(a.state, i === 0 ? 'success' : 'primary') + '</div>';
      }).join('') + '</div>'
        + '<div class="demo-note">' + UI.icon('info', 14)
        + '<span>更多医生 Agent 将在后续版本开放，当前演示版本仅提供脑安 AI 医生。</span></div>',
      onMount: function (wrap, close) {
        wrap.addEventListener('click', function (e) {
          var row = e.target.closest('[data-agent]');
          if (!row) { return; }
          var i = parseInt(row.getAttribute('data-agent'), 10);
          close();
          if (i === 0) { UI.toast('已切换到脑安 AI 医生', { icon: 'swap' }); }
          else { UI.toast('该医生 Agent 即将上线，敬请期待', { icon: 'info' }); }
        });
      }
    });
  }

  function bubbleHtml(msg) {
    var isUser = msg.role === 'user';
    var quote = msg.quote
      ? '<div class="msg-quote">' + UI.icon('grid', 13) + '<span>' + UI.esc(msg.quote) + '</span></div>'
      : '';
    return '<div class="msg' + (isUser ? ' is-user' : ' is-ai') + '">'
      + '<div class="msg-avatar">' + (isUser ? '<span class="avatar-user">' + UI.esc(Store.get().profile.avatarText) + '</span>' : avatarSvg(30)) + '</div>'
      + '<div class="msg-main">' + quote
      + '<div class="msg-bubble">' + UI.esc(msg.text) + '</div>'
      + '<div class="msg-meta">' + (isUser ? '我' : '脑安 AI 医生') + ' · ' + UI.esc(msg.time || '') + '</div>'
      + '</div></div>';
  }

  function messagesHtml(state) {
    var list = state.chat.messages;
    if (!list.length) {
      return '<div class="chat-empty">' + UI.icon('sparkles', 24)
        + '<div>还没有对话记录，可以从下方「猜你想问」开始</div></div>';
    }
    return list.map(bubbleHtml).join('')
      + (state.chat.typing
        ? '<div class="msg is-ai"><div class="msg-avatar">' + avatarSvg(30) + '</div>'
          + '<div class="msg-main"><div class="msg-bubble is-typing">'
          + '<span class="breath-loader"><i></i><i></i><i></i></span>'
          + '<span>正在结合您的近期数据整理回答</span></div></div></div>'
        : '');
  }

  function presetsHtml() {
    return '<div class="preset-wrapper">'
      + '<div class="preset-title">猜你想问</div>'
      + '<div class="preset-row">'
      + MD.chat.presets.map(function (p, i) {
        return '<button class="preset-chip" data-preset="' + i + '">' + UI.esc(p.q) + '</button>';
      }).join('')
      + '</div></div>';
  }

  function composerHtml() {
    return '<div class="composer">'
      + '<div class="composer-tools">'
      + '<button class="tool-btn" data-role="quote">' + UI.icon('grid', 16) + '引用数据</button>'
      + '</div>'
      + '<div class="composer-input">'
      + '<textarea class="textarea" rows="1" data-role="input" placeholder="描述您想了解的指标或问题…"></textarea>'
      + '<button class="send-btn" data-role="send" aria-label="发送">' + UI.icon('send', 18) + '</button>'
      + '</div>'
      + '</div>';
  }

  function renderPage() {
    var state = Store.get();
    return UI.el('<div class="page chat-page">'
      + headHtml(state)
      + '<div class="chat-body" data-role="messages">' + messagesHtml(state) + '</div>'
      + presetsHtml()
      + composerHtml()
      + '</div>');
  }

  /* 结合指标上下文的回答（来自 AI 解读的继续追问） */
  function contextualAnswer(metric) {
    var cfg = MD.metrics[metric];
    var ins = MD.insights[metric];
    return '已引用您最近的' + cfg.name + '记录。' + ins.summary + ins.what + ins.how
      + '以上内容基于本次设备数据生成，仅用于健康趋势参考，不能替代医生诊断。';
  }

  function mounted(host, params, ctx) {
    var msgBox = UI.$('[data-role="messages"]', host);
    var input = UI.$('[data-role="input"]', host);

    /* 消息区独立滚动：新消息到达时滚动到底部，输入区固定在 Tab 上方 */
    function toBottom() {
      if (msgBox) { msgBox.scrollTop = msgBox.scrollHeight; }
    }
    function refreshMessages() {
      msgBox.innerHTML = messagesHtml(Store.get());
      toBottom();
    }

    /* 首次进入展示欢迎语 */
    if (!Store.get().chat.messages.length) {
      Store.actions.pushMessage({ role: 'ai', text: MD.chat.welcome, welcome: true });
    }
    refreshMessages();
    setTimeout(toBottom, 60);

    ctx.onStore(function (state, reason) {
      if (reason === 'chat') { refreshMessages(); }
    });

    /* 模拟发送与回复（含打字中状态） */
    function send(text, opt) {
      var t = String(text || '').trim();
      if (!t) { UI.toast('请输入内容后再发送', { icon: 'info' }); return; }
      var o = opt || {};
      Store.actions.pushMessage({ role: 'user', text: t, quote: o.quote || null });
      input.value = '';
      input.style.height = 'auto';
      var answer = o.answer || MD.chat.reply(t);
      Store.actions.setTyping(true);
      setTimeout(function () {
        Store.actions.setTyping(false);
        Store.actions.pushMessage({ role: 'ai', text: answer });
      }, 1100 + Math.round(Math.random() * 500));
    }

    /* 从 AI 解读 / 指标详情进入时，自动带入上下文并继续追问 */
    var chatCtx = Store.get().chat.context;
    if (chatCtx && chatCtx.auto && !chatCtx.consumed) {
      chatCtx.consumed = true;
      UI.toast('已带入当前指标数据', { icon: 'sparkles' });
      setTimeout(function () {
        send(chatCtx.question, { answer: contextualAnswer(chatCtx.metric) });
      }, 320);
    }

    /* 数据引用抽屉 */
    function openQuoteSheet() {
      UI.sheet({
        title: '引用健康数据',
        body: '<div class="quote-list">' + MD.chat.quotes.map(function (q, i) {
          return '<div class="quote-row" data-quote="' + i + '">'
            + '<div class="row-icon is-violet">' + UI.icon('activity', 18) + '</div>'
            + '<div class="quote-main"><div class="quote-title">' + UI.esc(q.label) + '</div>'
            + '<div class="quote-desc">' + UI.esc(q.text) + '</div></div>'
            + UI.icon('chevron', 16) + '</div>';
        }).join('') + '</div>'
          + '<div class="demo-note">' + UI.icon('info', 14)
          + '<span>引用数据后，回答会结合该指标的最新记录生成，仍仅用于健康趋势参考。</span></div>',
        onMount: function (wrap, close) {
          wrap.addEventListener('click', function (e) {
            var row = e.target.closest('[data-quote]');
            if (!row) { return; }
            var q = MD.chat.quotes[parseInt(row.getAttribute('data-quote'), 10)];
            close();
            send(q.text, { quote: q.label, answer: q.answer });
          });
        }
      });
    }

    /* 输入框：自适应高度 + 回车发送 */
    input.addEventListener('input', function () {
      input.style.height = 'auto';
      input.style.height = Math.min(96, input.scrollHeight) + 'px';
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send(input.value);
      }
    });

    host.addEventListener('click', function (e) {
      var t = e.target;

      var preset = t.closest('[data-preset]');
      if (preset) {
        var p = MD.chat.presets[parseInt(preset.getAttribute('data-preset'), 10)];
        send(p.q, { answer: p.a });
        return;
      }

      var roleEl = t.closest('[data-role]');
      var role = roleEl ? roleEl.getAttribute('data-role') : null;

      if (role === 'send') { send(input.value); return; }
      if (role === 'quote') { openQuoteSheet(); return; }
      if (role === 'switch-agent') { openAgentSheet(); return; }
    });
  }

  Pages['ai-doctor'] = { render: renderPage, mounted: mounted };
})(window);

