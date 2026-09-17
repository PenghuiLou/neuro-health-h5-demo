/* ===========================================================
   store.js —— 本地状态管理 + 极简路由
   用本地状态模拟：页面跳转、设备绑定、采集暂停、AI 解读、
   AI 医生对话、家庭邀请、演示控制台等全部交互。
   依赖：mock-data.js
   =========================================================== */
(function (global) {
  'use strict';

  var MD = global.MockData;

  function seedLive() {
    var map = {};
    MD.live.order.forEach(function (k) { map[k] = MD.live.seed(k); });
    return map;
  }

  /* ---------- 初始状态（默认进入首页即为“已连接 + 有数据”状态） ---------- */
  var state = {
    profile: {
      nickname: '林知遥', age: 32, gender: '女', completeness: 80,
      phone: '138****8621', height: '165 cm', avatarText: '林'
    },
    device: {
      id: MD.device.id, name: MD.device.name, model: MD.device.model,
      sn: MD.device.sn, battery: MD.device.battery, firmware: MD.device.firmware,
      mode: MD.device.mode, signal: MD.device.signal, lastSync: MD.device.lastSync,
      syncLogs: MD.device.syncLogs.slice(),
      bound: true, collecting: true, paused: false, pairing: false
    },
    live: {
      metric: 'hr', values: seedLive(),
      lastUpdatedText: '刚刚', lastUpdatedAt: new Date()
    },
    tips: MD.tips.slice(),
    dismissTips: {},
    goal: { title: MD.goal.title, desc: MD.goal.desc, done: MD.goal.done, total: MD.goal.total, tip: MD.goal.tip },
    family: MD.family.slice(),
    chat: { messages: [], typing: false, context: null },
    ai: { status: 'idle', metric: null, updatedAt: null },
    demo: { empty: false, syncError: false, bannerDismissed: false },
    tickCount: 0
  };

  /* ---------- 订阅机制 ---------- */
  var listeners = [];
  function subscribe(fn) {
    listeners.push(fn);
    return function () {
      var i = listeners.indexOf(fn);
      if (i >= 0) { listeners.splice(i, 1); }
    };
  }
  function emit(reason) {
    listeners.slice().forEach(function (fn) {
      try { fn(state, reason); } catch (e) { /* 单个订阅异常不影响其他页面 */ }
    });
  }
  function get() { return state; }

  /* ---------- 实时数据规则：3 秒一次，受控轻微变化（不出现剧烈跳变） ---------- */
  function tick() {
    if (!state.device.bound || state.device.paused || state.demo.empty) { return; }
    state.tickCount++;
    var t = state.tickCount;
    MD.live.order.forEach(function (key) {
      var meta = MD.live.meta[key];
      var arr = state.live.values[key];
      var last = arr.length ? arr[arr.length - 1] : meta.base;
      var wave = Math.sin((t + key.length * 3) / 4.2) * (meta.wave * 0.55);
      var next = last * 0.55 + (meta.base + wave) * 0.45 + (Math.random() * 2 - 1) * 0.8;
      next = Math.min(meta.range[1], Math.max(meta.range[0], next));
      arr.push(Math.round(next * 10) / 10);
      if (arr.length > 30) { arr.shift(); }
    });
    state.live.lastUpdatedAt = new Date();
    state.live.lastUpdatedText = '刚刚';
    emit('live');
  }

  function nowLabel() {
    var d = new Date();
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  /* 最近更新时间文案：采集暂停后用于说明数据停留在何时 */
  function relativeTime(date) {
    if (!date) { return '刚刚'; }
    var s = Math.round((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 10) { return '刚刚'; }
    if (s < 60) { return s + ' 秒前'; }
    var m = Math.round(s / 60);
    if (m < 60) { return m + ' 分钟前'; }
    return Math.round(m / 60) + ' 小时前';
  }

  /* ---------- 动作（页面只通过这些方法修改状态） ---------- */
  var actions = {
    setLiveMetric: function (key) {
      state.live.metric = key;
      emit('live-metric');
    },
    togglePause: function () {
      state.device.paused = !state.device.paused;
      state.device.collecting = !state.device.paused;
      if (state.device.paused) {
        state.live.lastUpdatedText = relativeTime(state.live.lastUpdatedAt);
      } else {
        state.live.lastUpdatedAt = new Date();
        state.live.lastUpdatedText = '刚刚';
      }
      emit('device');
      return state.device.paused;
    },
    setPairing: function (on) {
      state.device.pairing = !!on;
      emit('device');
    },
    bindDevice: function (dev) {
      var d = dev || MD.discovered[0];
      state.device.id = d.id;
      state.device.name = d.name;
      state.device.sn = d.sn;
      state.device.model = (d.model || '').split(' · ')[0] || state.device.model;
      state.device.battery = d.battery || 78;
      state.device.bound = true;
      state.device.paused = false;
      state.device.collecting = true;
      state.device.pairing = false;
      state.device.lastSync = '刚刚';
      state.demo.syncError = false;
      state.demo.empty = false;
      emit('device');
    },
    unbindDevice: function () {
      state.device.bound = false;
      state.device.collecting = false;
      state.device.paused = false;
      emit('device');
    },
    markSynced: function () {
      state.device.lastSync = '刚刚';
      state.demo.syncError = false;
      emit('device');
    },
    addFamilyMember: function (member) {
      var m = {
        id: 'fam-' + Date.now(),
        name: member.name, relation: member.relation, scope: member.scope,
        status: member.status || '待接受', since: '今天',
        avatarTone: member.avatarTone || 'primary', inviteCode: member.inviteCode || ''
      };
      state.family.push(m);
      emit('family');
      return m;
    },
    updateFamilyScope: function (id, scope) {
      state.family = state.family.map(function (m) {
        return m.id === id ? Object.assign({}, m, { scope: scope }) : m;
      });
      emit('family');
    },
    removeFamilyMember: function (id) {
      state.family = state.family.filter(function (m) { return m.id !== id; });
      emit('family');
    },
    updateProfile: function (patch) {
      state.profile = Object.assign({}, state.profile, patch);
      state.profile.avatarText = String(state.profile.nickname || '用').slice(0, 1);
      state.profile.completeness = Math.min(100, 80 + (patch.gender ? 5 : 0) + (patch.height ? 5 : 0) + (patch.phone ? 10 : 0));
      emit('profile');
    },
    completeGoal: function () {
      if (state.goal.done < state.goal.total) {
        state.goal.done++;
        emit('goal');
        return true;
      }
      return false;
    },
    resetGoal: function () {
      state.goal.done = MD.goal.done;
      emit('goal');
    },
    dismissTip: function (id) {
      state.dismissTips[id] = true;
      emit('tips');
    },
    /* AI 解读状态机：idle -> loading -> done */
    setAiStatus: function (status, metric) {
      state.ai.status = status;
      if (metric) { state.ai.metric = metric; }
      if (status === 'done') { state.ai.updatedAt = new Date(); }
      emit('ai');
    },
    pushMessage: function (msg) {
      state.chat.messages.push(Object.assign(
        { id: 'm' + Date.now() + Math.random().toString(16).slice(2, 6), time: nowLabel() }, msg
      ));
      emit('chat');
    },
    setTyping: function (on) {
      state.chat.typing = !!on;
      emit('chat');
    },
    setChatContext: function (ctx) {
      state.chat.context = ctx;
      emit('chat');
    },
    clearChat: function () {
      state.chat.messages = [];
      state.chat.typing = false;
      emit('chat');
    },
    /* 演示控制台：空状态 / 同步失败 / 一键重置 */
    setDemo: function (patch) {
      state.demo = Object.assign({}, state.demo, patch);
      emit('demo');
    },
    resetDemo: function () {
      state.profile = {
        nickname: '林知遥', age: 32, gender: '女', completeness: 80,
        phone: '138****8621', height: '165 cm', avatarText: '林'
      };
      state.device = {
        id: MD.device.id, name: MD.device.name, model: MD.device.model,
        sn: MD.device.sn, battery: MD.device.battery, firmware: MD.device.firmware,
        mode: MD.device.mode, signal: MD.device.signal, lastSync: MD.device.lastSync,
        syncLogs: MD.device.syncLogs.slice(),
        bound: true, collecting: true, paused: false, pairing: false
      };
      state.live = { metric: 'hr', values: seedLive(), lastUpdatedText: '刚刚', lastUpdatedAt: new Date() };
      state.goal = { title: MD.goal.title, desc: MD.goal.desc, done: MD.goal.done, total: MD.goal.total, tip: MD.goal.tip };
      state.family = MD.family.slice();
      state.chat = { messages: [], typing: false, context: null };
      state.ai = { status: 'idle', metric: null, updatedAt: null };
      state.demo = { empty: false, syncError: false, bannerDismissed: false };
      state.tickCount = 0;
      emit('reset');
    }
  };

  /* ---------- 路由：一级 Tab + 二级页面栈 ---------- */
  var VIEW_TAB = {
    home: 'home', metric: 'home', goal: 'home', 'add-device': 'home', 'device-detail': 'home',
    'ai-doctor': 'ai',
    profile: 'profile', family: 'profile', 'family-invite': 'profile', 'edit-profile': 'profile',
    about: 'profile', privacy: 'profile', contact: 'profile', faq: 'profile', settings: 'profile'
  };
  /* Tab key -> 该 Tab 的入口页面 */
  var TAB_ENTRY = { home: 'home', ai: 'ai-doctor', profile: 'profile' };

  var Router = {
    stack: [],
    changeHandlers: [],

    init: function (tab) {
      this.stack = [{ view: tab || 'home', params: {} }];
      this.fire('init');
    },
    onChange: function (fn) { this.changeHandlers.push(fn); },
    fire: function (reason) {
      var route = this.current();
      this.changeHandlers.slice().forEach(function (fn) {
        try { fn(route, reason); } catch (e) { /* 路由回调异常不阻塞渲染 */ }
      });
    },
    current: function () { return this.stack[this.stack.length - 1] || { view: 'home', params: {} }; },
    currentTab: function () { return VIEW_TAB[this.current().view] || 'home'; },
    push: function (view, params) {
      this.stack.push({ view: view, params: params || {} });
      this.fire('push');
    },
    replace: function (view, params) {
      this.stack[this.stack.length - 1] = { view: view, params: params || {} };
      this.fire('replace');
    },
    /* 切换一级 Tab：始终回到该 Tab 的根页面（符合移动端习惯） */
    switchTab: function (tab) {
      var entry = TAB_ENTRY[tab] || tab;
      if (this.current().view === entry) { this.fire('tab'); return; }
      this.stack = [{ view: entry, params: {} }];
      this.fire('tab');
    },
    /* 返回上一层；已在根页面时返回 false，由调用方提示 */
    back: function () {
      if (this.stack.length > 1) {
        this.stack.pop();
        this.fire('back');
        return true;
      }
      return false;
    }
  };

  global.Store = {
    get: get, subscribe: subscribe, emit: emit, actions: actions,
    relativeTime: relativeTime, nowLabel: nowLabel, tick: tick
  };
  global.Router = Router;
})(window);
