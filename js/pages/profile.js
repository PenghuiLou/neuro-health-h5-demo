/* ===========================================================
   pages/profile.js —— 我的（ProfilePage）+ 设备管理（DevicePanel 详情）
                      + 家庭管理（FamilyManager）
   覆盖：个人资料、健康档案完成度、设备绑定 / 解绑 / 同步、
        家庭成员邀请与授权范围管理、演示控制台、退出登录
   依赖：ui.js、charts.js、store.js、mock-data.js
   =========================================================== */
(function (global) {
  'use strict';

  var MD = global.MockData;
  var UI = global.UI;
  var Store = global.Store;
  var Charts = global.Charts;
  var Pages = global.Pages = global.Pages || {};

  /* 家庭成员授权管理抽屉 */
  function openMemberSheet(id) {
    var state = Store.get();
    var m = state.family.filter(function (x) { return x.id === id; })[0];
    if (!m) { return; }
    var current = MD.scopes.filter(function (s) { return s.name === m.scope; })[0] || MD.scopes[0];
    UI.sheet({
      title: m.name + ' · 授权管理',
      body: '<div class="kv-list">'
        + '<div class="kv-row"><span class="kv-key">关系</span><span class="kv-val">' + UI.esc(m.relation) + '</span></div>'
        + '<div class="kv-row"><span class="kv-key">状态</span><span class="kv-val">' + UI.esc(m.status) + '</span></div>'
        + '<div class="kv-row"><span class="kv-key">授权时间</span><span class="kv-val">' + UI.esc(m.since) + '</span></div>'
        + '</div>'
        + '<div class="field" style="margin-top:16px"><span class="field-label">可见范围</span>'
        + MD.scopes.map(function (s) {
          return '<div class="scope-row' + (s.name === current.name ? ' is-active' : '') + '" data-scope="' + s.key + '">'
            + '<div class="scope-main"><div class="scope-name">' + UI.esc(s.name) + '</div>'
            + '<div class="scope-desc">' + UI.esc(s.desc) + '</div></div>'
            + '<span class="radio' + (s.name === current.name ? ' is-on' : '') + '"></span></div>';
        }).join('')
        + '</div>'
        + '<div class="demo-note">' + UI.icon('shield', 14)
        + '<span>家庭成员只能在授权范围内查看数据，可随时调整范围或撤回授权。</span></div>',
      foot: '<div class="btn-row">'
        + '<button class="btn btn-ghost" data-role="revoke">撤回授权</button>'
        + '<button class="btn btn-primary" data-role="save">保存范围</button>'
        + '</div>',
      onMount: function (wrap, close) {
        var picked = current.name;
        wrap.addEventListener('click', function (e) {
          var row = e.target.closest('[data-scope]');
          if (row) {
            picked = MD.scopes.filter(function (s) { return s.key === row.getAttribute('data-scope'); })[0].name;
            UI.$$('.scope-row', wrap).forEach(function (r) { r.classList.remove('is-active'); });
            UI.$$('.radio', wrap).forEach(function (r) { r.classList.remove('is-on'); });
            row.classList.add('is-active');
            UI.$('.radio', row).classList.add('is-on');
            return;
          }
          var role = e.target.closest('[data-role]');
          if (!role) { return; }
          if (role.getAttribute('data-role') === 'save') {
            Store.actions.updateFamilyScope(id, picked);
            close();
            UI.toast('已更新可见范围为「' + picked + '」', { icon: 'shield' });
          }
          if (role.getAttribute('data-role') === 'revoke') {
            close();
            UI.modal({
              title: '撤回授权？',
              desc: '撤回后 ' + m.name + ' 将无法查看您的健康数据。',
              confirmText: '撤回授权', danger: true,
              onConfirm: function () {
                Store.actions.removeFamilyMember(id);
                UI.toast('已撤回授权', { icon: 'lock' });
              }
            });
          }
        });
      }
    });
  }

  /* ---------- 我的页面挂载 ---------- */
  function mountedProfile(host, params, ctx) {
    ctx.onStore(function (state, reason) {
      if (reason === 'demo' || reason === 'family' || reason === 'device' || reason === 'profile') {
        global.Router.fire('store-refresh');
      }
    });

    host.addEventListener('click', function (e) {
      var t = e.target;

      var fam = t.closest('[data-family]');
      if (fam) { openMemberSheet(fam.getAttribute('data-family')); return; }

      var roleEl = t.closest('[data-role]');
      var role = roleEl ? roleEl.getAttribute('data-role') : null;
      var state = Store.get();

      if (role === 'edit-profile') { global.Router.push('edit-profile'); return; }
      if (role === 'add-device') { global.Router.push('add-device'); return; }
      if (role === 'device-detail') { global.Router.push('device-detail'); return; }
      if (role === 'invite') { global.Router.push('family-invite'); return; }
      if (role === 'about') { global.Router.push('about'); return; }
      if (role === 'privacy') { global.Router.push('privacy'); return; }
      if (role === 'contact') { global.Router.push('contact'); return; }
      if (role === 'faq') { global.Router.push('faq'); return; }
      if (role === 'sync') {
        if (!state.device.bound) { UI.toast('尚未绑定设备', { icon: 'info' }); return; }
        UI.toast('正在同步最近记录…', { icon: 'sync' });
        setTimeout(function () {
          Store.actions.markSynced();
          UI.toast('同步完成：' + state.device.name, { icon: 'check' });
        }, 1200);
        return;
      }
      if (role === 'toggle-empty') {
        Store.actions.setDemo({ empty: !state.demo.empty });
        UI.toast(state.demo.empty ? '已关闭空状态演示' : '已开启空状态演示', { icon: 'info' });
        return;
      }
      if (role === 'toggle-error') {
        Store.actions.setDemo({ syncError: !state.demo.syncError });
        UI.toast(state.demo.syncError ? '已关闭同步失败演示' : '已开启同步失败演示', { icon: 'info' });
        return;
      }
      if (role === 'reset-demo') {
        UI.modal({
          title: '重置演示数据？',
          desc: '将恢复默认的设备状态、指标数据、家庭列表与对话记录。',
          confirmText: '重置',
          onConfirm: function () {
            Store.actions.resetDemo();
            UI.toast('演示数据已重置', { icon: 'sync' });
          }
        });
        return;
      }
      if (role === 'logout') {
        UI.modal({
          title: '确定退出当前账号吗？',
          desc: '退出后仍可使用演示模式查看模拟数据。',
          confirmText: '退出登录',
          onConfirm: function () {
            UI.toast('已退出登录，仍处于演示模式', { icon: 'user' });
            global.Router.switchTab('home');
          }
        });
      }
    });
  }

  /* ================= 家庭成员管理页（FamilyManager） ================= */

  function memberCardHtml(m) {
    return '<div class="card member-card">'
      + '<div class="member-top">'
      + '<div class="avatar-md' + (m.avatarTone === 'violet' ? ' is-violet' : '') + '">' + UI.esc(String(m.name).slice(0, 1)) + '</div>'
      + '<div class="member-main"><div class="member-name">' + UI.esc(m.name)
      + UI.tag(m.status, m.status === '已授权' ? 'success' : 'warning') + '</div>'
      + '<div class="member-desc">' + UI.esc(m.relation) + ' · 可见范围：' + UI.esc(m.scope) + '</div>'
      + '<div class="member-desc">' + (m.status === '已授权'
        ? '授权时间 ' + UI.esc(m.since)
        : '邀请码 ' + UI.esc(m.inviteCode || '—')) + '</div>'
      + '</div></div>'
      + '<div class="btn-row" style="margin-top:12px">'
      + '<button class="btn btn-ghost btn-sm" data-family="' + m.id + '">调整授权范围</button>'
      + '<button class="btn btn-soft btn-sm" data-role="revoke-' + m.id + '">撤回授权</button>'
      + '</div></div>';
  }

  function renderFamily() {
    var state = Store.get();
    return UI.el('<div class="page">'
      + UI.pageHead({ title: '家庭成员管理', sub: '仅在获得授权后共享，默认不共享全部健康信息' })
      + '<div class="stack-gap">'
      + (state.family.length
        ? state.family.map(memberCardHtml).join('')
        : '<div class="card">' + UI.stateBox({
          icon: 'family', title: '还没有家庭成员',
          desc: '邀请家人后，对方接受邀请即可在授权范围内查看您的健康趋势。',
          actionHtml: '<button class="btn btn-primary btn-sm" data-role="invite">邀请家人</button>'
        }) + '</div>')
      + '<div class="card">'
      + '<div class="chart-title-row"><div class="chart-title">授权说明</div>' + UI.tag('合规边界', 'primary') + '</div>'
      + '<div class="kv-list">'
      + '<div class="kv-row"><span class="kv-key">默认范围</span><span class="kv-val">不共享任何健康数据</span></div>'
      + '<div class="kv-row"><span class="kv-key">可选项</span><span class="kv-val">全部数据 / 睡眠数据 / 仅异常提醒</span></div>'
      + '<div class="kv-row"><span class="kv-key">撤回方式</span><span class="kv-val">成员管理中随时撤回或调整</span></div>'
      + '</div>'
      + '<div class="demo-note accent">' + UI.icon('alert', 14)
      + '<span>家庭共享必须经过被关注成员的明确授权，演示数据不会真实共享给任何第三方。</span></div>'
      + '</div>'
      + '<button class="btn btn-primary btn-block" data-role="invite">' + UI.icon('plus', 16) + '邀请家人</button>'
      + '</div></div>');
  }

  function mountedFamily(host, params, ctx) {
    UI.bindBack(host);
    host.addEventListener('click', function (e) {
      var t = e.target;
      var fam = t.closest('[data-family]');
      if (fam) { openMemberSheet(fam.getAttribute('data-family')); return; }
      var roleEl = t.closest('[data-role]');
      var role = roleEl ? roleEl.getAttribute('data-role') : null;
      if (role === 'invite') { global.Router.push('family-invite'); return; }
      if (role && role.indexOf('revoke-') === 0) {
        var id = role.replace('revoke-', '');
        UI.modal({
          title: '撤回授权？', desc: '撤回后该成员将无法查看您的健康数据。',
          confirmText: '撤回授权', danger: true,
          onConfirm: function () {
            Store.actions.removeFamilyMember(id);
            UI.toast('已撤回授权', { icon: 'lock' });
          }
        });
      }
    });
  }

  /* ================= 邀请家人（三步流程） ================= */

  var invite = { step: 1, name: '妈妈', relation: '母亲', scopeKey: 'sleep', code: '' };

  function inviteStepsHtml() {
    return '<div class="step-bar">' + [1, 2, 3].map(function (n) {
      var label = ['选择成员', '可见范围', '邀请确认'][n - 1];
      return '<div class="step-item' + (invite.step >= n ? ' is-on' : '') + '">'
        + '<i>' + (invite.step > n ? '✓' : n) + '</i><span>' + label + '</span></div>';
    }).join('') + '</div>';
  }

  function inviteBodyHtml() {
    if (invite.step === 1) {
      var people = [
        { name: '妈妈', relation: '母亲' }, { name: '林先生', relation: '配偶' }, { name: '爸爸', relation: '父亲' }
      ];
      return '<div class="card"><div class="chart-title-row"><div class="chart-title">第 1 步 · 选择要邀请的家人</div></div>'
        + '<div class="card-sub">对方接受邀请后，才能在授权范围内查看您的数据。</div>'
        + '<div class="member-pick">' + people.map(function (p) {
          return '<button class="pick-chip' + (invite.name === p.name ? ' is-active' : '') + '" data-pick="' + p.name + '">'
            + UI.esc(p.name + ' · ' + p.relation) + '</button>';
        }).join('') + '</div>'
        + '<div class="field" style="margin-top:16px"><span class="field-label">邀请方式</span>'
        + '<div class="segmented"><button class="is-active">邀请链接</button><button data-role="qr">邀请码</button></div></div>'
        + '<button class="btn btn-primary btn-block" style="margin-top:16px" data-role="next">下一步</button></div>';
    }
    if (invite.step === 2) {
      return '<div class="card"><div class="chart-title-row"><div class="chart-title">第 2 步 · 选择可见范围</div>'
        + UI.tag('默认不共享', 'primary') + '</div>'
        + '<div class="card-sub">为 ' + UI.esc(invite.name) + ' 设置可以查看的数据范围。</div>'
        + MD.scopes.map(function (s) {
          return '<div class="scope-row' + (invite.scopeKey === s.key ? ' is-active' : '') + '" data-scope="' + s.key + '">'
            + '<div class="scope-main"><div class="scope-name">' + UI.esc(s.name) + '</div>'
            + '<div class="scope-desc">' + UI.esc(s.desc) + '</div></div>'
            + '<span class="radio' + (invite.scopeKey === s.key ? ' is-on' : '') + '"></span></div>';
        }).join('')
        + '<div class="demo-note">' + UI.icon('shield', 14)
        + '<span>邀请发出后仍可随时调整范围或撤回授权。</span></div>'
        + '<div class="btn-row" style="margin-top:16px"><button class="btn btn-ghost" data-role="prev">上一步</button>'
        + '<button class="btn btn-primary" data-role="next">生成邀请</button></div></div>';
    }
    var scopeName = (MD.scopes.filter(function (s) { return s.key === invite.scopeKey; })[0] || MD.scopes[0]).name;
    return '<div class="card invite-done">'
      + '<div class="done-icon">' + UI.icon('check', 26) + '</div>'
      + '<div class="done-title">邀请已生成</div>'
      + '<div class="done-desc">将邀请链接或邀请码发送给 ' + UI.esc(invite.name)
      + '，对方接受后即可查看「' + UI.esc(scopeName) + '」。</div>'
      + '<div class="invite-code"><span>' + UI.esc(invite.code) + '</span>'
      + '<button class="btn btn-soft btn-sm" data-role="copy">' + UI.icon('copy', 15) + '复制</button></div>'
      + '<div class="kv-list" style="margin-top:12px">'
      + '<div class="kv-row"><span class="kv-key">被邀请人</span><span class="kv-val">' + UI.esc(invite.name + ' · ' + invite.relation) + '</span></div>'
      + '<div class="kv-row"><span class="kv-key">可见范围</span><span class="kv-val">' + UI.esc(scopeName) + '</span></div>'
      + '<div class="kv-row"><span class="kv-key">授权状态</span><span class="kv-val">已生成，等待对方接受</span></div>'
      + '</div>'
      + '<div class="demo-note accent">' + UI.icon('alert', 14)
      + '<span>演示模式：邀请链接与邀请码均为模拟生成，不会真实发送。</span></div>'
      + '<div class="btn-row" style="margin-top:16px"><button class="btn btn-ghost" data-role="prev">返回修改</button>'
      + '<button class="btn btn-primary" data-role="finish">完成</button></div></div>';
  }

  function renderInvite() {
    invite = { step: 1, name: '妈妈', relation: '母亲', scopeKey: 'sleep', code: '' };
    return UI.el('<div class="page">'
      + UI.pageHead({ title: '邀请家人', sub: '授权范围内共享健康数据' })
      + inviteStepsHtml()
      + '<div data-role="invite-body">' + inviteBodyHtml() + '</div>'
      + '</div>');
  }

  function mountedInvite(host, params, ctx) {
    UI.bindBack(host);
    var stepBar = UI.$('.step-bar', host);
    var body = UI.$('[data-role="invite-body"]', host);
    function refresh() {
      stepBar.outerHTML = inviteStepsHtml();
      stepBar = UI.$('.step-bar', host);
      body.innerHTML = inviteBodyHtml();
    }
    host.addEventListener('click', function (e) {
      var t = e.target;
      var pick = t.closest('[data-pick]');
      if (pick) {
        invite.name = pick.getAttribute('data-pick');
        invite.relation = invite.name === '林先生' ? '配偶' : (invite.name === '妈妈' ? '母亲' : '父亲');
        refresh();
        return;
      }
      var scope = t.closest('[data-scope]');
      if (scope) {
        invite.scopeKey = scope.getAttribute('data-scope');
        refresh();
        return;
      }
      var roleEl = t.closest('[data-role]');
      var role = roleEl ? roleEl.getAttribute('data-role') : null;
      if (!role) { return; }

      if (role === 'next') {
        if (invite.step === 2) { invite.code = 'BA' + String(Math.floor(100000 + Math.random() * 899999)); }
        invite.step = Math.min(3, invite.step + 1);
        refresh();
        return;
      }
      if (role === 'prev') { invite.step = Math.max(1, invite.step - 1); refresh(); return; }
      if (role === 'qr') { UI.toast('演示版本暂不生成二维码', { icon: 'grid' }); return; }
      if (role === 'copy') { UI.copyText(invite.code); UI.toast('邀请码已复制', { icon: 'copy' }); return; }
      if (role === 'finish') {
        var scopeName = (MD.scopes.filter(function (s) { return s.key === invite.scopeKey; })[0] || MD.scopes[0]).name;
        Store.actions.addFamilyMember({
          name: invite.name, relation: invite.relation, scope: scopeName,
          status: '待接受', inviteCode: invite.code
        });
        UI.toast('已发送邀请给 ' + invite.name, { icon: 'send' });
        global.Router.back();
      }
    });
  }

  /* --- 页面注册统一放在文件末尾（Pages.profile / Pages.family / Pages.family-invite） --- */




  function profileCardHtml(state) {
    var p = state.profile;
    return '<div class="card profile-card">'
      + '<div class="avatar-lg">' + UI.esc(p.avatarText) + '</div>'
      + '<div class="profile-main">'
      + '<div class="profile-name">' + UI.esc(p.nickname) + '</div>'
      + '<div class="profile-meta">' + p.age + ' 岁 · ' + UI.esc(p.gender) + ' · ' + UI.esc(p.height) + '</div>'
      + '<div class="profile-progress"><i style="width:' + p.completeness + '%"></i></div>'
      + '<div class="profile-progress-text">健康档案完成度 ' + p.completeness + '%<span>完善档案可获得更贴近个人的趋势解释</span></div>'
      + '</div>'
      + '<button class="btn btn-ghost btn-sm" data-role="edit-profile">编辑资料</button>'
      + '</div>';
  }

  function deviceSectionHtml(state) {
    var d = state.device;
    if (!d.bound) {
      return '<div class="card flush">'
        + UI.listRow({ icon: 'plus', title: '添加设备', desc: '绑定脑安神经健康仪后开始采集', attrs: 'data-role="add-device"' })
        + '</div>';
    }
    return '<div class="card flush">'
      + UI.listRow({
        icon: 'device', title: d.name,
        desc: '编号 ' + d.sn + ' · 固件 ' + d.firmware,
        badge: UI.tag(d.paused ? '采集已暂停' : '已连接', d.paused ? 'warning' : 'success'),
        attrs: 'data-role="device-detail"'
      })
      + UI.listRow({
        icon: 'battery', tone: 'success', title: '电量与信号',
        desc: '电量 ' + d.battery + '% · 蓝牙信号' + d.signal + ' · 最近同步 ' + d.lastSync,
        arrow: false, attrs: 'data-role="sync"'
      })
      + UI.listRow({
        icon: 'plus', tone: 'violet', title: '添加设备',
        desc: '绑定第二台设备或更换当前设备', attrs: 'data-role="add-device"'
      })
      + '</div>';
  }

  function familySectionHtml(state) {
    return '<div class="card flush">' + state.family.map(function (m) {
      return UI.listRow({
        icon: 'family', tone: m.avatarTone === 'violet' ? 'violet' : undefined,
        title: m.name + ' · ' + m.relation,
        desc: '可见范围：' + m.scope + ' · ' + (m.status === '已授权' ? '授权于 ' + m.since : '等待对方接受'),
        badge: UI.tag(m.status, m.status === '已授权' ? 'success' : 'warning'),
        attrs: 'data-family="' + m.id + '"'
      });
    }).join('')
      + UI.listRow({ icon: 'plus', tone: 'violet', title: '邀请家人', desc: '在获得授权后共同关注健康数据', attrs: 'data-role="invite"' })
      + '</div>';
  }

  function demoConsoleHtml(state) {
    return '<div class="card">'
      + '<div class="chart-title-row"><div class="chart-title">演示控制台</div>'
      + UI.tag('面试辅助', 'violet') + '</div>'
      + '<div class="card-sub">用于现场演示空状态、错误状态与数据重置，正式产品中不包含此模块。</div>'
      + '<div class="demo-row" data-role="toggle-empty">'
      + '<div class="demo-row-main"><div class="row-title">空状态演示</div>'
      + '<div class="row-desc">开启后首页与详情页展示“还没有足够的有效记录”</div></div>'
      + '<span class="switch' + (state.demo.empty ? ' is-on' : '') + '"></span></div>'
      + '<div class="demo-row" data-role="toggle-error">'
      + '<div class="demo-row-main"><div class="row-title">同步失败演示</div>'
      + '<div class="row-desc">开启后首页显示“数据同步暂时中断”并可重试</div></div>'
      + '<span class="switch' + (state.demo.syncError ? ' is-on' : '') + '"></span></div>'
      + '<button class="btn btn-ghost btn-sm btn-block" style="margin-top:12px" data-role="reset-demo">'
      + UI.icon('sync', 15) + '重置演示数据</button>'
      + '</div>';
  }

  function moreSectionHtml() {
    return '<div class="card flush">'
      + UI.listRow({ icon: 'info', title: '关于我们', desc: '杭州演化医疗设备有限公司', attrs: 'data-role="about"' })
      + UI.listRow({ icon: 'lock', tone: 'success', title: '隐私说明', desc: '健康数据的用途与授权边界', attrs: 'data-role="privacy"' })
      + UI.listRow({ icon: 'mail', tone: 'violet', title: '联系我们', desc: MD.contact.email, attrs: 'data-role="contact"' })
      + UI.listRow({ icon: 'doc', title: '常见问题', desc: '演示数据、AI 边界与家庭共享说明', attrs: 'data-role="faq"' })
      + '</div>';
  }

  function renderProfile() {
    var state = Store.get();
    return UI.el('<div class="page profile-page">'
      + '<div class="home-head"><div class="home-greet">'
      + '<div class="home-hello">我的</div>'
      + '<div class="home-sub">健康档案、设备与家庭管理'
      + '<span class="demo-chip">' + UI.icon('info', 12) + '演示数据</span></div>'
      + '</div></div>'
      + '<div class="stack-gap">'
      + profileCardHtml(state)
      + '<div class="section-title">设备管理</div>'
      + deviceSectionHtml(state)
      + '<div class="section-title">家庭管理<span class="sub">需明确授权后可查看</span></div>'
      + familySectionHtml(state)
      + '<div class="section-title">更多</div>'
      + moreSectionHtml()
      + demoConsoleHtml(state)
      + '<button class="btn btn-ghost btn-block" data-role="logout">退出登录</button>'
      + '<div class="profile-footer">'
      + '<div>脑安健康管理 H5 · ' + UI.esc(MD.about.version) + '</div>'
      + '<div>' + UI.esc(MD.about.company) + '</div>'
      + '<div>' + UI.esc(MD.disclaimer) + '</div>'
      + '</div>'
      + '</div></div>');
  }

  Pages.profile = { render: renderProfile, mounted: mountedProfile };
  Pages.family = { render: renderFamily, mounted: mountedFamily };
  Pages['family-invite'] = { render: renderInvite, mounted: mountedInvite };
})(window);
