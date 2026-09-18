/* ===========================================================
   pages/settings.js —— 设备详情 / 添加设备 / 编辑资料 / 健康小目标
                        / 关于我们 / 隐私说明 / 联系我们 / 常见问题
   依赖：ui.js、store.js、mock-data.js
   =========================================================== */
(function (global) {
  'use strict';

  var MD = global.MockData;
  var UI = global.UI;
  var Store = global.Store;
  var Pages = global.Pages = global.Pages || {};

  /* ================= 设备详情 ================= */

  function renderDeviceDetail() {
    var d = Store.get().device;
    if (!d.bound) {
      return UI.el('<div class="page">'
        + UI.pageHead({ title: '设备详情', center: true })
        + '<div class="card">' + UI.stateBox({
          icon: 'device', title: '尚未连接设备',
          desc: '绑定脑安神经健康仪后，可查看设备信息与固件状态。',
          actionHtml: '<button class="btn btn-primary btn-sm" data-role="add-device">添加设备</button>'
        }) + '</div>'
        + '</div>');
    }
    return UI.el('<div class="page">'
      + UI.pageHead({ title: '设备详情', center: true })
      + '<div class="stack-gap">'
      + '<div class="card device-hero">'
      + '<div class="device-hero-icon">' + UI.icon('device', 26) + '</div>'
      + '<div class="device-hero-main"><div class="device-hero-name">' + UI.esc(d.name) + '</div>'
      + '<div class="device-hero-desc">' + UI.esc(d.model) + '</div>'
      + '<div class="device-hero-tags">' + UI.tag('已连接', 'success') + '</div></div>'
      + '</div>'
      + '<div class="card">'
      + '<div class="chart-title-row"><div class="chart-title">设备信息</div>'
      + UI.tag('固件 ' + d.firmware, 'primary') + '</div>'
      + '<div class="kv-list">'
      + kv('设备编号', d.sn)
      + kv('连接状态', '已连接')
      + kv('固件版本', d.firmware + '（已是最新）')
      + kv('采集模式', d.mode)
      + kv('最近同步', d.lastSync)
      + '</div>'
      + '<div class="btn-row" style="margin-top:14px">'
      + '<button class="btn btn-soft btn-sm" data-role="sync">' + UI.icon('sync', 15) + '同步数据</button>'
      + '<button class="btn btn-ghost btn-sm" data-role="firmware">' + UI.icon('doc', 15) + '固件升级</button>'
      + '</div>'
      + '</div>'
      + '<button class="btn btn-ghost btn-block" data-role="unbind" style="color:var(--danger)">解绑设备</button>'
      + '</div></div>');
  }

  function mountedDeviceDetail(host, params, ctx) {
    UI.bindBack(host);
    host.addEventListener('click', function (e) {
      var roleEl = e.target.closest('[data-role]');
      var role = roleEl ? roleEl.getAttribute('data-role') : null;
      if (!role) { return; }
      var d = Store.get().device;

      if (role === 'sync') {
        var btn = roleEl;
        btn.classList.add('is-disabled');
        btn.innerHTML = UI.icon('sync', 15) + '同步中…';
        setTimeout(function () {
          Store.actions.markSynced();
          UI.toast('数据同步完成', { icon: 'check' });
          global.Router.replace('device-detail');
        }, 1300);
        return;
      }
      if (role === 'firmware') {
        UI.toast('正在检查固件更新…', { icon: 'sync' });
        setTimeout(function () { UI.toast('当前已是最新固件 ' + d.firmware, { icon: 'check' }); }, 1200);
        return;
      }
      if (role === 'add-device') { global.Router.push('add-device'); return; }
      if (role === 'unbind') {
        UI.modal({
          title: '解绑设备？',
          desc: '解绑后将停止采集，历史数据仍保留在健康档案中。',
          confirmText: '解绑设备', danger: true,
          onConfirm: function () {
            Store.actions.unbindDevice();
            UI.toast('已解绑设备', { icon: 'device' });
            global.Router.back();
          }
        });
      }
    });
  }

  /* ================= 添加设备（搜索 → 绑定 → 同步） ================= */

  var addState = { step: 'search', deviceId: null, progress: 0, syncProgress: 0 };

  function searchHtml() {
    return '<div class="card">'
      + '<div class="chart-title-row"><div class="chart-title">正在搜索附近设备</div>'
      + UI.tag('模拟搜索', 'primary') + '</div>'
      + '<div class="radar"><i class="r1"></i><i class="r2"></i><span>' + UI.icon('device', 24) + '</span></div>'
      + '<div class="card-sub" style="text-align:center;margin-top:10px">请确保设备已开机并靠近手机</div>'
      + '<div class="divider"></div>'
      + UI.skeleton(2)
      + '</div>';
  }

  function foundHtml() {
    return '<div class="card">'
      + '<div class="chart-title-row"><div class="chart-title">发现 ' + MD.discovered.length + ' 台可绑定设备</div>'
      + UI.tag('演示设备', 'primary') + '</div>'
      + MD.discovered.map(function (d) {
        return '<div class="found-row">'
          + '<div class="row-icon">' + UI.icon('device', 19) + '</div>'
          + '<div class="found-main"><div class="found-name">' + UI.esc(d.name) + '</div>'
          + '<div class="found-desc">' + UI.esc(d.model) + ' · ' + UI.esc(d.rssi) + ' · 电量 ' + d.battery + '%</div></div>'
          + '<button class="btn btn-primary btn-sm" data-bind="' + d.id + '">绑定</button>'
          + '</div>';
      }).join('')
      + '<div class="demo-note">' + UI.icon('info', 14)
      + '<span>演示模式下展示的是模拟设备列表，无需真实蓝牙连接。</span></div>'
      + '</div>'
      + '<button class="btn btn-ghost btn-block" data-role="skip">暂不添加，查看演示数据</button>';
  }

  function addBodyHtml() {
    var dev = MD.discovered.filter(function (d) { return d.id === addState.deviceId; })[0] || MD.discovered[0];
    if (addState.step === 'search') { return searchHtml(); }
    if (addState.step === 'found') { return foundHtml(); }
    if (addState.step === 'pairing') {
      return '<div class="card pairing-card">'
        + '<div class="pairing-ring" style="background:conic-gradient(var(--primary) '
        + (addState.progress * 3.6) + 'deg, #EAF1FF 0deg)"><b>' + addState.progress + '%</b></div>'
        + '<div class="pairing-text">正在配对 ' + UI.esc(dev.name) + '</div>'
        + '<div class="progress"><i style="width:' + addState.progress + '%"></i></div>'
        + '<div class="card-sub" style="text-align:center">请保持设备靠近手机，配对过程中请勿关闭页面</div>'
        + '</div>';
    }
    var d = Store.get().device;
    return '<div class="card invite-done">'
      + '<div class="done-icon">' + UI.icon('check', 26) + '</div>'
      + '<div class="done-title">设备绑定成功</div>'
      + '<div class="done-desc">设备已连接，正在同步最近一次记录</div>'
      + '<div class="progress" style="margin:14px 0 4px"><i style="width:' + addState.syncProgress + '%"></i></div>'
      + '<div class="card-sub" style="text-align:center">'
      + (addState.syncProgress >= 100 ? '同步完成，已生成今日趋势' : '同步中 ' + addState.syncProgress + '%') + '</div>'
      + '<div class="kv-list" style="margin-top:14px">'
      + kv('设备名称', d.name)
      + kv('设备编号', d.sn)
      + kv('设备型号', d.model)
      + kv('固件版本', d.firmware)
      + kv('电量', d.battery + '%')
      + kv('采集模式', d.mode)
      + '</div>'
      + '<div class="demo-note">' + UI.icon('shield', 14)
      + '<span>演示模式：绑定结果仅保存在本地状态中，不会建立真实蓝牙连接。</span></div>'
      + '<button class="btn btn-primary btn-block" style="margin-top:14px" data-role="done">返回首页查看数据</button>'
      + '</div>';
  }

  function renderAddDevice() {
    addState = { step: 'search', deviceId: null, progress: 0, syncProgress: 0 };
    return UI.el('<div class="page">'
      + UI.pageHead({ title: '添加设备', sub: '搜索并绑定脑安设备' })
      + '<div class="stack-gap"><div data-role="add-body">' + addBodyHtml() + '</div></div>'
      + '</div>');
  }

  function mountedAddDevice(host, params, ctx) {
    UI.bindBack(host);
    var body = UI.$('[data-role="add-body"]', host);
    var timers = [];

    function refresh() { body.innerHTML = addBodyHtml(); }

    function startSearch() {
      timers.push(setTimeout(function () { addState.step = 'found'; refresh(); }, 1800));
    }

    /* 配对进度 0 → 100，完成后写入本地绑定状态 */
    function startPairing(dev) {
      addState.step = 'pairing';
      addState.progress = 0;
      addState.deviceId = dev.id;
      refresh();
      var timer = setInterval(function () {
        addState.progress = Math.min(100, addState.progress + Math.round(8 + Math.random() * 12));
        refresh();
        if (addState.progress >= 100) {
          clearInterval(timer);
          Store.actions.bindDevice(dev);
          addState.step = 'success';
          addState.syncProgress = 0;
          refresh();
          startSync();
        }
      }, 260);
      timers.push(timer);
    }

    /* 绑定成功后的数据同步动画 */
    function startSync() {
      var timer = setInterval(function () {
        addState.syncProgress = Math.min(100, addState.syncProgress + Math.round(10 + Math.random() * 14));
        refresh();
        if (addState.syncProgress >= 100) { clearInterval(timer); }
      }, 220);
      timers.push(timer);
    }

    ctx.onCleanup(function () {
      timers.forEach(function (t) { clearInterval(t); clearTimeout(t); });
    });

    host.addEventListener('click', function (e) {
      var bind = e.target.closest('[data-bind]');
      if (bind) {
        startPairing(MD.discovered.filter(function (d) { return d.id === bind.getAttribute('data-bind'); })[0]);
        return;
      }
      var roleEl = e.target.closest('[data-role]');
      var role = roleEl ? roleEl.getAttribute('data-role') : null;
      if (role === 'skip') {
        UI.toast('已进入演示数据模式', { icon: 'info' });
        global.Router.back();
        return;
      }
      if (role === 'done') {
        UI.toast('设备已连接，开始记录健康数据', { icon: 'check' });
        global.Router.switchTab('home');
      }
    });

    startSearch();
  }

  /* ================= 编辑资料 ================= */

  function renderEditProfile() {
    var p = Store.get().profile;
    return UI.el('<div class="page">'
      + UI.pageHead({ title: '编辑资料', sub: '资料仅保存在本地演示环境中' })
      + '<div class="stack-gap">'
      + '<div class="card">'
      + '<label class="field"><span class="field-label">昵称</span>'
      + '<input class="input" data-field="nickname" value="' + UI.esc(p.nickname) + '" maxlength="12" /></label>'
      + '<label class="field"><span class="field-label">年龄</span>'
      + '<input class="input" data-field="age" type="number" value="' + p.age + '" /></label>'
      + '<div class="field"><span class="field-label">性别</span>'
      + '<div class="segmented"><button data-gender="女" class="' + (p.gender === '女' ? 'is-active' : '') + '">女</button>'
      + '<button data-gender="男" class="' + (p.gender === '男' ? 'is-active' : '') + '">男</button>'
      + '<button data-gender="不透露" class="' + (p.gender === '不透露' ? 'is-active' : '') + '">不透露</button></div></div>'
      + '<label class="field"><span class="field-label">身高</span>'
      + '<input class="input" data-field="height" value="' + UI.esc(p.height) + '" /></label>'
      + '<label class="field"><span class="field-label">手机号（演示，不可修改）</span>'
      + '<input class="input" value="' + UI.esc(p.phone) + '" disabled /></label>'
      + '</div>'
      + '<div class="card">'
      + '<div class="chart-title-row"><div class="chart-title">健康档案完成度</div>'
      + UI.tag(Store.get().profile.completeness + '%', 'primary') + '</div>'
      + '<div class="progress"><i style="width:' + p.completeness + '%"></i></div>'
      + '<div class="card-sub" style="margin-top:8px">补全身高、性别等信息，可获得更贴近个人的趋势解释。</div>'
      + '</div>'
      + '<button class="btn btn-primary btn-block" data-role="save">保存资料</button>'
      + '</div></div>');
  }

  function mountedEditProfile(host, params, ctx) {
    UI.bindBack(host);
    var gender = Store.get().profile.gender;
    host.addEventListener('click', function (e) {
      var g = e.target.closest('[data-gender]');
      if (g) {
        gender = g.getAttribute('data-gender');
        UI.$$('[data-gender]', host).forEach(function (b) { b.classList.remove('is-active'); });
        g.classList.add('is-active');
        return;
      }
      var roleEl = e.target.closest('[data-role]');
      if (roleEl && roleEl.getAttribute('data-role') === 'save') {
        var nickname = UI.$('[data-field="nickname"]', host).value.trim() || '林知遥';
        var age = parseInt(UI.$('[data-field="age"]', host).value, 10) || 32;
        var height = UI.$('[data-field="height"]', host).value.trim() || '165 cm';
        Store.actions.updateProfile({ nickname: nickname, age: age, height: height, gender: gender, phone: '138****8622' });
        UI.toast('资料已保存', { icon: 'check' });
        global.Router.back();
      }
    });
  }

  /* ================= 健康小目标 ================= */

  function renderGoal() {
    var g = Store.get().goal;
    var dots = '';
    for (var i = 0; i < g.total; i++) {
      dots += '<i class="goal-dot' + (i < g.done ? ' is-done' : '') + '"></i>';
    }
    return UI.el('<div class="page">'
      + UI.pageHead({ title: '健康小目标', sub: '轻量陪伴，不构成医疗建议' })
      + '<div class="stack-gap">'
      + '<div class="card goal-card">'
      + '<div class="goal-head"><div class="goal-icon">' + UI.icon('target', 20) + '</div>'
      + '<div><div class="goal-title">' + UI.esc(g.title) + '</div>'
      + '<div class="goal-sub">连续完成 ' + g.done + '/' + g.total + ' 天</div></div>'
      + UI.tag(g.done >= g.total ? '已达成' : '进行中', g.done >= g.total ? 'success' : 'primary') + '</div>'
      + '<div class="goal-dots">' + dots + '</div>'
      + '<div class="goal-desc">' + UI.esc(g.desc) + '</div>'
      + '<div class="btn-row" style="margin-top:14px">'
      + '<button class="btn btn-primary" data-role="complete">完成今日目标</button>'
      + '<button class="btn btn-ghost" data-role="reset-goal">重置进度</button>'
      + '</div>'
      + '</div>'
      + '<div class="card">'
      + '<div class="chart-title-row"><div class="chart-title">为什么设置这个目标</div></div>'
      + '<div class="kv-list">'
      + kv('参考依据', '最近 7 天平均入睡时间 23:12，周末较工作日晚约 52 分钟')
      + kv('目标动作', '在 23:00 前结束高亮屏幕与高强度工作，进入准备入睡状态')
      + kv('观察指标', '睡眠评分、夜间醒来次数与次日静息心率')
      + '</div>'
      + '<div class="demo-note">' + UI.icon('shield', 14)
      + '<span>' + UI.esc(g.tip) + '</span></div>'
      + '</div>'
      + '<button class="btn btn-soft btn-block" data-role="ask-ai">和 AI 医生聊聊怎么坚持</button>'
      + '</div></div>');
  }

  function mountedGoal(host, params, ctx) {
    UI.bindBack(host);
    host.addEventListener('click', function (e) {
      var roleEl = e.target.closest('[data-role]');
      var role = roleEl ? roleEl.getAttribute('data-role') : null;
      if (role === 'complete') {
        if (Store.actions.completeGoal()) {
          UI.toast('已记录今日目标完成', { icon: 'check' });
        } else {
          UI.toast('本周目标已全部完成，继续保持', { icon: 'award' });
        }
        return;
      }
      if (role === 'reset-goal') {
        Store.actions.resetGoal();
        UI.toast('进度已重置为演示初始值', { icon: 'sync' });
        return;
      }
      if (role === 'ask-ai') {
        Store.actions.setChatContext({ metric: 'sleep', question: '我该怎么坚持这个作息小目标？', auto: true });
        global.Router.switchTab('ai');
      }
    });
  }

  /* ================= 关于我们 / 隐私说明 / 联系我们 / 常见问题 ================= */

  function kv(k, v) {
    return '<div class="kv-row"><span class="kv-key">' + UI.esc(k) + '</span><span class="kv-val">' + UI.esc(v) + '</span></div>';
  }

  function renderAbout() {
    var a = MD.about;
    return UI.el('<div class="page">'
      + UI.pageHead({ title: '关于我们', sub: a.slogan })
      + '<div class="stack-gap">'
      + '<div class="card company-card">'
      + '<div class="company-logo">' + UI.icon('brain', 24) + '</div>'
      + '<div class="company-name">' + UI.esc(a.company) + '</div>'
      + '<div class="company-slogan">' + UI.esc(a.slogan) + '</div>'
      + '<div class="company-intro">' + UI.esc(a.intro) + '</div>'
      + '<div class="divider"></div>'
      + '<div class="company-intro">' + UI.esc(a.extra) + '</div>'
      + '</div>'
      + '<div class="card">'
      + '<div class="chart-title-row"><div class="chart-title">产品能力</div>' + UI.tag('Demo', 'primary') + '</div>'
      + a.capabilities.map(function (c) {
        return '<div class="cap-row"><div class="cap-name">' + UI.esc(c.name) + '</div>'
          + '<div class="cap-desc">' + UI.esc(c.desc) + '</div></div>';
      }).join('')
      + '</div>'
      + '<div class="card">'
      + '<div class="kv-list">'
      + kv('产品名称', '脑安健康管理 H5')
      + kv('产品形态', '移动端优先的单页体验 Demo')
      + kv('技术说明', '前端本地模拟数据，不接入真实设备与真实医疗服务')
      + kv('版本', a.version)
      + '</div>'
      + '<div class="demo-note accent">' + UI.icon('alert', 14)
      + '<span>' + UI.esc(MD.disclaimer) + '</span></div>'
      + '</div>'
      + '</div></div>');
  }

  function renderPrivacy() {
    var p = MD.privacy;
    return UI.el('<div class="page">'
      + UI.pageHead({ title: p.title, sub: '健康数据的使用与授权边界' })
      + '<div class="stack-gap">'
      + '<div class="card"><div class="privacy-lead">' + UI.esc(p.lead) + '</div></div>'
      + '<div class="card">' + p.points.map(function (pt, i) {
        return '<div class="policy-row"><div class="policy-index">' + (i + 1) + '</div>'
          + '<div><div class="policy-title">' + UI.esc(pt.title) + '</div>'
          + '<div class="policy-desc">' + UI.esc(pt.desc) + '</div></div></div>';
      }).join('') + '</div>'
      + '<div class="demo-note accent">' + UI.icon('alert', 14)
      + '<span>' + UI.esc(MD.disclaimer) + '真实产品上线前需完成合规评审与安全评估。</span></div>'
      + '</div></div>');
  }

  function renderContact() {
    var c = MD.contact;
    return UI.el('<div class="page">'
      + UI.pageHead({ title: '联系我们', sub: '演示邮箱与反馈入口' })
      + '<div class="stack-gap">'
      + '<div class="card flush">'
      + UI.listRow({ icon: 'mail', title: '客服邮箱', desc: c.email, tail: UI.tag('Demo', 'primary'), arrow: false })
      + UI.listRow({ icon: 'clock', tone: 'success', title: '服务时间', desc: c.serviceTime, arrow: false })
      + UI.listRow({ icon: 'doc', tone: 'violet', title: '常见问题', desc: '演示数据与 AI 边界说明', attrs: 'data-role="faq"' })
      + '</div>'
      + '<button class="btn btn-primary btn-block" data-role="feedback">' + UI.icon('edit', 16) + '提交产品反馈</button>'
      + '<div class="demo-note">' + UI.icon('info', 14)
      + '<span>' + UI.esc(c.note) + '</span></div>'
      + '</div></div>');
  }

  function mountedContact(host, params, ctx) {
    UI.bindBack(host);
    host.addEventListener('click', function (e) {
      var roleEl = e.target.closest('[data-role]');
      var role = roleEl ? roleEl.getAttribute('data-role') : null;
      if (role === 'faq') { global.Router.push('faq'); return; }
      if (role === 'feedback') {
        UI.sheet({
          title: '产品反馈',
          body: '<label class="field"><span class="field-label">反馈内容</span>'
            + '<textarea class="textarea" rows="4" data-role="fb-text" placeholder="说说您希望改进的体验，例如首页信息层级、趋势图交互等"></textarea></label>'
            + '<div class="demo-note">' + UI.icon('info', 14)
            + '<span>演示版本不会真实提交内容，仅用于展示反馈交互。</span></div>',
          foot: '<button class="btn btn-primary btn-block" data-role="fb-send">提交反馈</button>',
          onMount: function (wrap, close) {
            wrap.addEventListener('click', function (ev) {
              if (!ev.target.closest('[data-role="fb-send"]')) { return; }
              var val = UI.$('[data-role="fb-text"]', wrap).value.trim();
              if (!val) { UI.toast('请先填写反馈内容', { icon: 'info' }); return; }
              close();
              UI.toast('反馈已记录（演示）', { icon: 'check' });
            });
          }
        });
      }
    });
  }

  function renderFaq() {
    return UI.el('<div class="page">'
      + UI.pageHead({ title: '常见问题', sub: '演示数据、AI 边界与家庭共享' })
      + '<div class="stack-gap">'
      + '<div class="card flush">' + MD.contact.faq.map(function (f, i) {
        return '<div class="faq-item" data-faq="' + i + '">'
          + '<div class="faq-q"><span>' + UI.esc(f.q) + '</span>' + UI.icon('chevron', 16) + '</div>'
          + '<div class="faq-a">' + UI.esc(f.a) + '</div></div>';
      }).join('') + '</div>'
      + '<div class="demo-note accent">' + UI.icon('alert', 14)
      + '<span>如问题涉及具体症状、用药或诊断，请咨询专业医疗机构的医生。</span></div>'
      + '</div></div>');
  }

  function mountedFaq(host, params, ctx) {
    UI.bindBack(host);
    host.addEventListener('click', function (e) {
      var item = e.target.closest('[data-faq]');
      if (!item) { return; }
      item.classList.toggle('is-open');
    });
  }

  Pages['device-detail'] = { render: renderDeviceDetail, mounted: mountedDeviceDetail };
  Pages['add-device'] = { render: renderAddDevice, mounted: mountedAddDevice };
  Pages['edit-profile'] = { render: renderEditProfile, mounted: mountedEditProfile };
  Pages.goal = { render: renderGoal, mounted: mountedGoal };
  Pages.about = { render: renderAbout, mounted: UI.bindBack };
  Pages.privacy = { render: renderPrivacy, mounted: UI.bindBack };
  Pages.contact = { render: renderContact, mounted: mountedContact };
  Pages.faq = { render: renderFaq, mounted: mountedFaq };
})(window);


