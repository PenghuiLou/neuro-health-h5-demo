/* ===========================================================
   mock-data.js —— 全部演示数据与演示文案
   数据由前端本地生成（固定随机种子，保证每次演示一致），
   不接入真实设备、不调用真实 AI 服务，不作为医疗判断依据。
   依赖：无
   =========================================================== */
(function (global) {
  'use strict';

  /* ---------- 可复现随机数与通用工具 ---------- */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var rand = mulberry32(20260917);

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function round(v, d) { var p = Math.pow(10, d || 0); return Math.round(v * p) / p; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function fmtMinutes(total) {
    var h = Math.floor(total / 60), m = Math.round(total % 60);
    return h + '小时' + (m ? m + '分钟' : '');
  }
  function dayOffset(n) { var d = new Date(); d.setDate(d.getDate() - n); return d; }
  function mdLabel(d) { return (d.getMonth() + 1) + '/' + d.getDate(); }
  var WEEK_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  /* 生成平滑序列：正弦趋势 + 小幅受控扰动（不出现剧烈跳变） */
  function series(n, opt) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var v = opt.base
        + opt.wave * Math.sin((i / opt.period) * Math.PI * 2 + (opt.phase || 0))
        + (rand() * 2 - 1) * opt.noise;
      v = clamp(v, opt.min, opt.max);
      out.push({ value: round(v, opt.digits || 0) });
    }
    if (opt.missing) {
      opt.missing.forEach(function (idx) { if (out[idx]) { out[idx].missing = true; } });
    }
    return out;
  }

  function withLabels(points, labels) {
    return points.map(function (p, i) {
      return { label: labels[i] || '', value: p.value, missing: !!p.missing };
    });
  }

  function stats(points) {
    var vs = points.filter(function (p) { return !p.missing; }).map(function (p) { return p.value; });
    if (!vs.length) { return { max: '-', min: '-', avg: '-' }; }
    var max = Math.max.apply(null, vs), min = Math.min.apply(null, vs);
    var avg = vs.reduce(function (a, b) { return a + b; }, 0) / vs.length;
    return { max: round(max, 0), min: round(min, 0), avg: round(avg, 1) };
  }

  /* 采集时间轴：08:00 - 22:00，每 30 分钟一个采样点 */
  var DAY_LABELS = (function () {
    var arr = [];
    for (var t = 8 * 60; t <= 22 * 60; t += 30) { arr.push(pad2(Math.floor(t / 60)) + ':' + pad2(t % 60)); }
    return arr;
  })();

  /* 睡眠期间采样时间轴：23:08 - 06:50，每 10 分钟一个采样点 */
  var SLEEP_LABELS = (function () {
    var arr = [], startMin = 23 * 60 + 8;
    for (var i = 0; i <= 46; i++) {
      var m = (startMin + i * 10) % (24 * 60);
      arr.push(pad2(Math.floor(m / 60)) + ':' + pad2(m % 60));
    }
    return arr;
  })();

  /* 最近 30 天 / 最近 7 天标签（跟随演示当天日期） */
  var MONTH_LABELS = (function () {
    var arr = [];
    for (var i = 29; i >= 0; i--) { arr.push(mdLabel(dayOffset(i))); }
    return arr;
  })();
  var WEEK_LABELS = (function () {
    var day = [], week = [];
    for (var i = 6; i >= 0; i--) {
      var d = dayOffset(i);
      day.push(WEEK_CN[d.getDay()] + ' ' + mdLabel(d));
      week.push(WEEK_CN[d.getDay()]);
    }
    return { day: day, week: week };
  })();

  /* ---------- 指标基础配置 ---------- */
  var METRICS = {
    eeg: {
      key: 'eeg', name: '脑电', abbr: 'EEG', unit: '分', icon: 'brain',
      color: '#246BFD', soft: '#EAF1FF',
      status: '放松', statusTone: 'success', quality: '良好', qualityTone: 'success',
      headline: '脑电活跃度', value: 72, liveKey: 'eeg', range: [68, 76],
      change: '趋势稳定', changeTone: 'success', desc: 'Alpha 相对活跃',
      explain: '脑电（EEG）记录的是大脑神经电活动的整体趋势。本 Demo 只展示放松、专注等状态倾向与频段相对变化，不用于判断任何疾病。'
    },
    fnirs: {
      key: 'fnirs', name: '脑氧', abbr: 'fNIRS', unit: '', icon: 'wave',
      color: '#20B486', soft: '#E8F8F2',
      status: '稳定', statusTone: 'success', quality: '良好', qualityTone: 'success',
      headline: '相对氧合指数', value: 76, liveKey: 'fnirs', range: [73, 79],
      change: '较昨日 +3.2%', changeTone: 'success', desc: '左右侧相对平衡',
      explain: '脑氧（fNIRS）反映局部脑组织氧合相关的变化趋势。数据容易受佩戴位置、头部移动、环境光影响，只用于观察相对变化。'
    },
    ecg: {
      key: 'ecg', name: '心电', abbr: 'ECG', unit: 'BPM', icon: 'heart',
      color: '#E96868', soft: '#FDEEEE',
      status: '平稳', statusTone: 'success', quality: '良好', qualityTone: 'success',
      headline: '当前心率', value: 72, liveKey: 'hr', range: [68, 78],
      change: 'HRV 48 ms', changeTone: 'primary', desc: '静息心率 68 BPM',
      explain: '心电（ECG）反映心脏电活动与心率相关信息，包括心率与心率变异性（HRV）趋势。本 Demo 不进行心律失常等诊断。'
    },
    sleep: {
      key: 'sleep', name: '睡眠质量', abbr: 'Sleep', unit: '分', icon: 'moon',
      color: '#7B6CF6', soft: '#EFEDFF',
      status: '较上次提升', statusTone: 'success', quality: '良好', qualityTone: 'success',
      headline: '睡眠评分', value: 82, liveKey: null, range: [70, 92],
      change: '较上次 +6 分', changeTone: 'success', desc: '7小时42分钟',
      explain: '睡眠数据基于设备信号估算睡眠结构与休息状态，包括总时长、深睡、浅睡、REM、夜间醒来次数与睡眠期间心率趋势。'
    }
  };
  var METRIC_ORDER = ['eeg', 'fnirs', 'ecg', 'sleep'];
  var STAGE_META = {
    awake: { name: '清醒', level: 0 },
    rem: { name: 'REM', level: 1 },
    light: { name: '浅睡', level: 2 },
    deep: { name: '深睡', level: 3 }
  };

  /* 睡眠阶段序列（用于睡眠结构图） */
  function buildHypnogram() {
    var blocks = [
      ['awake', 8], ['light', 26], ['deep', 44], ['light', 22], ['rem', 18], ['light', 16],
      ['awake', 5], ['light', 30], ['deep', 34], ['rem', 26], ['light', 24], ['deep', 20],
      ['rem', 28], ['light', 40], ['awake', 5], ['light', 34], ['rem', 31], ['light', 28],
      ['awake', 8]
    ];
    var total = blocks.reduce(function (a, b) { return a + b[1]; }, 0);
    return blocks.map(function (b) {
      return {
        stage: b[0], name: STAGE_META[b[0]].name, level: STAGE_META[b[0]].level,
        minutes: b[1], widthPct: round((b[1] / total) * 100, 2)
      };
    });
  }

  /* ---------- 构建四项指标的日 / 周 / 月数据 ---------- */
  var DETAIL_CONF = {
    eeg: { base: 71, wave: 5.5, period: 13, phase: 0.3, noise: 2.4, min: 62, max: 82, missing: [19, 20],
      duration: '6小时20分钟', quality: '良好',
      events: [{ index: 8, label: '午休前' }, { index: 24, label: '运动后' }],
      note: '本次采集期间存在短时信号波动，可能与设备佩戴位置或身体移动有关。' },
    fnirs: { base: 76, wave: 4.2, period: 11, phase: 1.4, noise: 1.8, min: 68, max: 85, missing: [],
      duration: '5小时40分钟', quality: '良好',
      events: [{ index: 14, label: '午休 30 分钟' }],
      note: '脑氧相对指数容易受到佩戴位置、头部移动与采集环境的影响。' },
    ecg: { base: 72, wave: 4.6, period: 9, phase: 2.1, noise: 1.9, min: 66, max: 79, missing: [22],
      duration: '6小时05分钟', quality: '良好',
      events: [{ index: 18, label: '咖啡因摄入' }, { index: 26, label: '安静休息' }],
      note: '本次记录中出现了轻微波动，暂未形成明确异常趋势。' }
  };

  function buildMetric(key) {
    var cfg = METRICS[key];

    if (key === 'sleep') {
      var hrPoints = series(SLEEP_LABELS.length, { base: 60, wave: 6, period: 9, phase: -0.6, noise: 1.6, min: 50, max: 72, digits: 0 });
      var brPoints = series(SLEEP_LABELS.length, { base: 15, wave: 1.8, period: 7, phase: 0.9, noise: 0.5, min: 11, max: 19, digits: 0 });
      var sDay = withLabels(hrPoints, SLEEP_LABELS);
      return {
        cfg: cfg,
        day: sDay, dayStats: stats(sDay),
        week: withLabels(series(7, { base: 80, wave: 5, period: 6, phase: 0.4, noise: 2.2, min: 68, max: 90, digits: 0 }), WEEK_LABELS.day),
        month: withLabels(series(30, { base: 81, wave: 4.5, period: 9, phase: 1.1, noise: 2.6, min: 68, max: 90, digits: 0 }), MONTH_LABELS),
        duration: '7小时42分钟', quality: '良好',
        events: [
          { index: 0, label: '入睡 23:08' }, { index: 12, label: '进入深睡' },
          { index: 25, label: '夜醒 1' }, { index: 34, label: '夜醒 2' }, { index: 46, label: '起床 06:50' }
        ],
        note: '睡眠阶段由设备信号估算，仅用于观察个人作息规律，不用于判断睡眠疾病。',
        sleep: {
          stageHours: [
            { key: 'deep', name: '深睡', minutes: 98, color: '#4B62E0' },
            { key: 'light', name: '浅睡', minutes: 261, color: '#8FA6F0' },
            { key: 'rem', name: 'REM', minutes: 103, color: '#7B6CF6' },
            { key: 'awake', name: '清醒', minutes: 18, color: '#D8DEEA' }
          ],
          hypnogram: buildHypnogram(),
          brToday: withLabels(brPoints, SLEEP_LABELS)
        }
      };
    }

    var conf = DETAIL_CONF[key];
    var day = withLabels(series(DAY_LABELS.length, conf), DAY_LABELS);
    return {
      cfg: cfg,
      day: day, dayStats: stats(day),
      week: withLabels(series(7, { base: cfg.value - 1, wave: 3.4, period: 6, phase: 0.8, noise: 1.6, min: conf.min, max: conf.max, digits: 0 }), WEEK_LABELS.day),
      month: withLabels(series(30, { base: cfg.value, wave: 3.8, period: 10, phase: key === 'ecg' ? 2.4 : 0.6, noise: 2, min: conf.min, max: conf.max, digits: 0 }), MONTH_LABELS),
      duration: conf.duration, quality: conf.quality, events: conf.events, note: conf.note,
      sleep: null
    };
  }

  var DETAIL = {};
  METRIC_ORDER.forEach(function (k) { DETAIL[k] = buildMetric(k); });

  /* ---------- 首页实时采集（30 个采样点，每 3 秒刷新一次） ---------- */
  var LIVE_META = {
    hr: { key: 'hr', name: '心率', unit: 'BPM', color: '#E96868', range: [68, 78], base: 72, wave: 2.4, period: 11 },
    eeg: { key: 'eeg', name: '脑电活跃度', unit: '分', color: '#246BFD', range: [68, 76], base: 72, wave: 2.6, period: 13 },
    fnirs: { key: 'fnirs', name: '脑氧指数', unit: '', color: '#20B486', range: [73, 79], base: 76, wave: 1.8, period: 9 },
    hrv: { key: 'hrv', name: 'HRV', unit: 'ms', color: '#7B6CF6', range: [42, 55], base: 48, wave: 3.2, period: 15 }
  };
  var LIVE_ORDER = ['hr', 'eeg', 'fnirs', 'hrv'];

  function liveSeed(key) {
    var m = LIVE_META[key];
    var arr = [];
    for (var i = 0; i < 30; i++) {
      var v = m.base + m.wave * Math.sin((i / m.period) * Math.PI * 2) + (rand() * 2 - 1) * 1.2;
      arr.push(round(clamp(v, m.range[0], m.range[1]), m.unit === 'ms' ? 0 : m.unit === '' ? 0 : 0));
    }
    return arr;
  }

  /* ---------- 首页概览 / 健康提示 / 小目标 ---------- */
  var OVERVIEW = {
    status: '良好',
    score: 86,
    completeness: 92,
    lastSync: '刚刚',
    updatedMetrics: 4,
    footer: '4 项核心指标已更新 · 数据仅供健康趋势参考',
    summary: '脑电处于放松状态，睡眠时长充足，心率趋势平稳。'
  };

  var BANDS = [
    { name: 'Alpha', value: 68, desc: '清醒放松', color: '#246BFD' },
    { name: 'Beta', value: 42, desc: '专注 · 思考', color: '#5B8DEF' },
    { name: 'Theta', value: 36, desc: '浅睡 · 放空', color: '#7B6CF6' },
    { name: 'Delta', value: 22, desc: '深睡', color: '#9AA6F5' }
  ];

  var TIPS = [
    {
      id: 'tip-sleep', tone: 'success', tag: '趋势提示', metric: 'sleep',
      title: '睡眠趋势值得保持',
      body: '最近 3 天您的平均睡眠时长为 7 小时 28 分钟，较前一周增加 22 分钟。建议继续保持相对固定的入睡时间。',
      action: '查看睡眠详情'
    },
    {
      id: 'tip-ecg', tone: 'warning', tag: '趋势提示', metric: 'ecg',
      title: '今天的心率记录出现轻微波动',
      body: '当前记录暂未形成明确异常趋势。建议在安静状态下重新采集一次，并关注是否伴随胸闷、心悸等不适。如有持续不适，请及时咨询专业人士。',
      action: '查看心电详情'
    },
    {
      id: 'tip-eeg', tone: 'primary', tag: '采集质量', metric: 'eeg',
      title: '采集质量提醒',
      body: '最近一次脑电数据中存在短时信号波动，可能与设备佩戴位置或身体移动有关。建议调整佩戴位置后再次采集。',
      action: '查看脑电详情'
    }
  ];

  var GOAL = {
    id: 'goal-sleep',
    title: '今晚 23:00 前准备入睡',
    desc: '连续 7 天的作息小目标，完成后可查看睡眠评分变化趋势。',
    done: 4,
    total: 7,
    tip: '小目标只用于帮助养成作息习惯，不构成医疗建议。'
  };

  /* ---------- 设备与家庭 ---------- */
  var DEVICE = {
    id: 'dev-main', bound: true,
    name: '脑安神经健康仪', model: 'BW-N1',
    sn: 'BWN1-2026-0417', battery: 78, firmware: '1.4.2',
    mode: '标准采集（脑电 + 脑氧 + 心电）',
    signal: '良好', lastSync: '刚刚', collecting: true,
    syncLogs: [
      { time: '今天 09:12', text: '同步 30 分钟脑电与脑氧数据', state: '成功' },
      { time: '今天 07:05', text: '同步夜间睡眠与心率数据', state: '成功' },
      { time: '昨天 22:40', text: '固件版本检查', state: '已是最新' }
    ]
  };

  var DISCOVERED_DEVICES = [
    { id: 'dev-main', name: '脑安神经健康仪', model: 'BW-N1 · 神经刺激与多模态采集', rssi: '信号强', battery: 78, sn: 'BWN1-2026-0417' },
    { id: 'dev-sleep', name: '脑安睡眠监测带', model: 'BW-S1 · 夜间睡眠与心率趋势', rssi: '信号一般', battery: 64, sn: 'BWS1-2026-0233' }
  ];

  var FAMILY = [
    { id: 'fam-1', name: '妈妈', relation: '母亲', scope: '睡眠数据', status: '已授权', since: '2026-03-12', avatarTone: 'violet' },
    { id: 'fam-2', name: '林先生', relation: '配偶', scope: '全部数据', status: '已授权', since: '2026-05-02', avatarTone: 'primary' }
  ];

  var SCOPE_OPTIONS = [
    { key: 'all', name: '全部数据', desc: '脑电、脑氧、心电与睡眠数据均可查看' },
    { key: 'sleep', name: '睡眠数据', desc: '仅共享睡眠时长、睡眠评分与夜间心率' },
    { key: 'alert', name: '仅异常提醒', desc: '仅在记录出现明显波动时发送提醒' }
  ];

  /* ---------- AI 解读文案（三段式：发生了什么 / 可以怎么做 / 需要注意） ---------- */
  var INSIGHTS = {
    sleep: {
      title: '关于您今天的睡眠，AI 有一段话想告诉您',
      headline: '睡眠时长充足，评分较上次提升 6 分',
      summary: '昨晚记录到睡眠时长 7 小时 42 分钟，睡眠评分 82 分，夜间醒来 2 次。与过去 7 天相比，睡眠时长增加约 18 分钟。',
      what: '从当前演示数据看，您的睡眠时长和连续性较为稳定。深睡阶段约占总睡眠时长的 21%，处于个人近期正常波动范围内，暂未观察到明显下降趋势。',
      how: '今天可以继续保持相对固定的睡前时间。睡前 1 小时尽量减少高亮屏幕和高强度信息输入，帮助身体逐步进入休息状态。',
      care: '以上内容基于本次设备数据生成，仅用于健康趋势参考。AI 不能替代医生诊断。如您存在持续失眠、明显胸闷、心悸或其他不适，请及时咨询专业人士。',
      follow: '我想进一步了解怎样改善我的睡眠质量。'
    },
    eeg: {
      title: '关于您今天的脑电数据，AI 有一段话想告诉您',
      headline: '脑电活跃度 72 分，整体处于清醒放松状态',
      summary: '今日脑电有效采集 6 小时 20 分钟，平均活跃度 71.4 分，最高 81 分，最低 62 分，采集质量良好，Alpha 频段相对活跃。',
      what: '本次脑电数据整体较稳定，Alpha 相关活动处于相对明显状态，结合当前采集时段，更接近清醒放松状态，与 Beta 频段相比放松成分更突出。',
      how: '建议在相似环境和相近时间重复记录，方便对比个人趋势；记录前确认电极贴合、减少身体移动，可提升数据连续性。',
      care: '单次数据不能代表整体健康状态。以上内容仅用于健康趋势参考，不构成诊断或治疗建议；如持续不适请咨询专业人士。',
      follow: '我想了解脑电数据平时应该怎么看。'
    },
    fnirs: {
      title: '关于您今天的脑氧数据，AI 有一段话想告诉您',
      headline: '脑氧相对指数 76，较昨日 +3.2%',
      summary: '今日脑氧相对指数平均 76.2，最高 84，最低 69，曲线连续性较好，左右侧相对趋势平衡，信号质量良好。',
      what: '本次脑氧相关指数较上一记录略有上升，当前曲线连续性较好，暂未观察到明显的左右侧差异扩大。',
      how: '建议保持设备贴合、减少头部移动，并在相近时间段持续记录，观察连续多日的相对变化，而不是只看某一次结果。',
      care: '脑氧数据容易受到佩戴位置、头部移动和环境条件影响。不要依据单次结果自行判断疾病，以上内容仅用于健康趋势参考。',
      follow: '脑氧和我平时测的血氧有什么区别？'
    },
    ecg: {
      title: '关于您今天的心电数据，AI 有一段话想告诉您',
      headline: '心率 72 BPM，趋势整体平稳',
      summary: '今日心率平均 71.6 BPM，最高 78 BPM，最低 66 BPM，静息心率 68 BPM，HRV 48 ms，心电信号质量良好。',
      what: '当前心率为 72 BPM，演示数据中的心率趋势整体平稳，未观察到持续偏离个人常态范围的情况，日内波动与活动、休息时段基本对应。',
      how: '建议在安静坐姿下再记录一次作为对照，并留意睡眠时长、咖啡因摄入和运动时间对心率与 HRV 的影响。',
      care: '若测量时存在运动、情绪紧张、咖啡因摄入或设备接触不良，数据可能出现波动。若持续出现明显不适，请及时咨询专业人士。',
      follow: '我最近心率有一点波动，需要注意什么？'
    }
  };

  /* ---------- AI 医生对话 ---------- */
  var WELCOME = '您好，我是脑安 AI 医生。我可以结合您的设备数据，帮助您理解睡眠、心率、脑电和脑氧趋势，也可以一起制定更容易坚持的健康小目标。';

  var PRESETS = [
    { q: '如何通过科学方法提升睡眠质量？',
      a: '可以先从三个容易坚持的方向开始：第一，尽量固定起床时间，让身体形成稳定节律；第二，睡前 1 小时减少高强度工作和屏幕刺激；第三，把咖啡因、酒精和剧烈运动尽量安排在距离入睡更远的时间。您最近 7 天的演示数据中，周末入睡时间比工作日晚约 52 分钟，可以先尝试缩小这个差异。建议连续记录 7 天，再观察睡眠评分和夜间醒来次数是否出现稳定变化。以上为健康科普内容，不能替代医生诊断。' },
    { q: '我的睡眠评分为什么会变化？',
      a: '睡眠评分主要综合时长、连续性、深睡与 REM 占比等维度。评分变化通常来自入睡时间推迟、夜间醒来次数增加、睡前情绪或运动强度变化，也可能与佩戴状态有关。您最近 7 天的评分在 76—88 分之间波动，属于个人近期常态范围。建议先看连续 7 天趋势，再判断是否需要调整作息，而不是只关注某一晚的分数。' },
    { q: '脑电数据应该怎么看？',
      a: '看脑电数据建议关注三点：状态倾向（放松 / 清醒 / 专注）、频段相对变化（Alpha、Beta、Theta、Delta）、以及采集质量。您今天的数据显示 Alpha 相对活跃、采集质量良好，更接近清醒放松状态。请在同一时间段、相似环境下重复记录，这样趋势才有可比性。单次结果不能代表整体健康状态。' },
    { q: '脑氧和普通血氧有什么区别？',
      a: '普通血氧一般通过指夹式设备测量外周血氧饱和度（SpO₂），反映全身氧合水平；脑氧（fNIRS）测量的是前额等部位局部脑组织的氧合相关变化趋势，展示的是相对指数而不是绝对饱和度。脑氧数据对佩戴位置和头部移动比较敏感，更适合看连续多日的自身趋势，而不是与单次数值比较高低。' },
    { q: '如何提高健康检测数据的准确性？',
      a: '可以从四件事入手：一是佩戴到位并保持清洁，减少电极与皮肤之间的空隙；二是采集时尽量保持安静，减少说话和大幅移动；三是尽量固定采集时段与姿势，让数据具备可比性；四是关注采集质量提示，出现波动区间时重新记录。您今天的有效采集时长为 6 小时 20 分钟，质量良好，可以参考这个时段作为日常固定记录时间。' },
    { q: '我最近心率有波动，需要注意什么？',
      a: '单次心率变化不能直接判断心脏是否存在问题。心率会受到运动、情绪、咖啡因、睡眠不足和测量姿势等因素影响。您可以先在安静坐姿下重新测量，并确认设备佩戴贴合。如果心率持续异常，或同时出现胸痛、明显气促、晕厥等不适，请及时寻求专业医疗帮助。' },
    { q: '神经刺激设备使用前要注意什么？',
      a: '使用前建议确认三点：设备电量与电极贴合状态是否良好；身体状态是否适合（避免在疲劳、饮酒、情绪剧烈波动时使用）；使用时长与强度是否按照说明书或专业人员建议设置。本 Demo 只展示数据与记录流程，不提供任何刺激参数建议。如有基础疾病、正在服药或处于孕期，请先咨询专业人士。' }
  ];

  var RULES = [
    { k: ['睡眠', '入睡', '睡不好', '失眠', '作息'], a: PRESETS[0].a },
    { k: ['评分'], a: PRESETS[1].a },
    { k: ['脑电', 'EEG'], a: PRESETS[2].a },
    { k: ['脑氧', 'fNIRS', '血氧'], a: PRESETS[3].a },
    { k: ['准确性', '准确', '质量', '佩戴'], a: PRESETS[4].a },
    { k: ['心率', '心电', '心悸', '心脏', 'HRV'], a: PRESETS[5].a },
    { k: ['刺激', '设备使用', '使用前'], a: PRESETS[6].a },
    { k: ['家庭', '家人', '授权', '共享'], a: '家庭共享需要被关注成员明确授权，并且可以随时调整可见范围或撤回授权。当前演示中妈妈仅可查看睡眠数据，林先生可查看全部数据。建议定期检查授权范围，避免共享超出本人意愿的数据。' },
    { k: ['血压', '糖尿病', '吃药', '用药', '诊断', '治疗'], a: '这类问题已经超出健康趋势参考的范围。本 Demo 的 AI 助手只用于解释设备数据与健康科普，不做疾病判断，也不提供用药建议。如果涉及具体症状或用药，请咨询专业医疗机构的医生。' }
  ];

  var FALLBACK = '我目前可以帮您解释睡眠、心率、脑电和脑氧这几类设备数据，也可以和您一起制定作息小目标。您可以试试问我：「我的睡眠评分为什么会变化？」或「脑电数据应该怎么看？」。如果问题涉及具体症状、用药或诊断，请咨询专业医疗机构的医生。';

  var QUOTES = [
    { key: 'sleep', label: '引用最近睡眠数据',
      text: '引用最近睡眠数据：昨晚睡眠时长 7 小时 42 分钟，睡眠评分 82 分，夜间醒来 2 次。',
      answer: '已引用您最近一次睡眠记录。参考这组数据，您的睡眠时长比较充足，连续性尚可，夜间醒来 2 次属于个人近期常态范围。可以从固定起床时间入手，把周末与工作日的入睡时间差缩小到 30 分钟以内，再观察一周评分变化。以上为趋势参考，不构成诊断建议。' },
    { key: 'ecg', label: '引用最近心率数据',
      text: '引用最近心率数据：当前心率 72 BPM，静息心率 68 BPM，HRV 48 ms。',
      answer: '已引用您最近的心率记录。当前心率 72 BPM、静息 68 BPM，HRV 48 ms，属于演示数据设定的个人常态范围。建议在安静坐姿下再复测一次作对照；如出现持续不适或明显异常，请咨询专业医疗机构的医生。' },
    { key: 'eeg', label: '引用最近脑电数据',
      text: '引用最近脑电数据：脑电活跃度 72 分，Alpha 相对活跃，采集质量良好。',
      answer: '已引用您最近的脑电记录。Alpha 相对活跃通常对应清醒放松状态，本次采集质量良好。脑电趋势需要固定时段、相似环境多次记录后才具有可比性，单次结果不能代表整体健康状态。' }
  ];

  function chatReply(text) {
    var t = String(text || '');
    for (var i = 0; i < RULES.length; i++) {
      var r = RULES[i];
      for (var j = 0; j < r.k.length; j++) {
        if (t.indexOf(r.k[j]) >= 0) { return r.a; }
      }
    }
    return FALLBACK;
  }

  /* ---------- 关于我们 / 隐私 / 联系 / 常见问题 ---------- */
  var ABOUT = {
    company: '杭州演化医疗设备有限公司',
    slogan: '人类增强（Human Augmentation）',
    intro: '杭州演化医疗设备有限公司致力于“人类增强”（Human Augmentation）方向的创新药械研发。我们站在极远未来的视角，审视人类在未来需要的能力，并通过医学手段帮助人类获得这些能力。',
    extra: '脑安健康管理 H5 是面向神经健康设备的概念体验 Demo，旨在探索健康数据、智能硬件和 AI 健康交互之间的连接方式。',
    capabilities: [
      { name: '神经刺激与多模态采集设备', desc: '脑电、脑氧、心电与睡眠数据的统一采集入口' },
      { name: '健康趋势与 AI 解读', desc: '把专业指标翻译成普通用户看得懂的趋势与提示' },
      { name: '个人与家庭健康管理', desc: '在授权范围内实现家庭成员之间的健康关注' }
    ],
    version: 'Demo V1.0 · 概念体验版本'
  };

  var PRIVACY = {
    title: '隐私说明',
    lead: '我们重视您的个人信息与健康数据安全。健康数据仅在获得授权的范围内用于设备连接、趋势展示、AI 解读和家庭共享。',
    points: [
      { title: '演示数据说明', desc: '本演示版本使用虚构用户与模拟数据，不会采集真实生理数据，也不会将数据用于真实诊疗。' },
      { title: '数据用途', desc: '健康数据仅用于设备连接、趋势展示、AI 解读与经授权的家庭共享，不用于广告推送。' },
      { title: '授权与访问', desc: '家庭成员只能在获得明确授权后查看数据，可见范围可随时调整或撤回。' },
      { title: '本地存储', desc: '演示过程中的资料修改、设备绑定与家庭邀请仅保存在当前浏览器本地，刷新后可能重置。' },
      { title: '正式版本规划', desc: '真实产品上线前，应进一步完善数据加密、访问权限、操作日志、数据删除和第三方服务管理机制。' },
      { title: '医疗边界', desc: '本产品用于健康趋势记录与健康科普，不提供疾病诊断、治疗建议或用药指导。' }
    ]
  };

  var CONTACT = {
    email: 'support@brainwell-demo.com',
    serviceTime: '工作日 09:00 — 18:00',
    note: '邮箱仅用于 Demo 展示，不会真实发送邮件。',
    faq: [
      { q: '演示模式的数据从哪里来？', a: '全部数据由前端本地模拟生成，用于展示设备数据与 AI 解读的交互流程，不代表任何真实用户的健康状况。' },
      { q: '为什么没有连接真实设备也能看到数据？', a: '首页提供“暂不添加，查看演示数据”入口，方便在没有硬件的情况下完整走通演示路径。' },
      { q: 'AI 解读的内容可以直接作为医疗依据吗？', a: '不可以。AI 解读仅用于帮助理解健康数据趋势，不构成诊断或治疗建议，如有不适请咨询专业医疗机构的医生。' },
      { q: '家庭成员能看到我的全部数据吗？', a: '默认不可以。共享范围由您选择，可选择全部数据、仅睡眠数据或仅异常提醒，也可以随时撤回授权。' }
    ]
  };

  /* ---------- 对外统一的演示数据入口 ---------- */
  global.MockData = {
    metrics: METRICS,
    order: METRIC_ORDER,
    detail: DETAIL,
    live: { meta: LIVE_META, order: LIVE_ORDER, seed: liveSeed },
    overview: OVERVIEW,
    bands: BANDS,
    tips: TIPS,
    goal: GOAL,
    device: DEVICE,
    discovered: DISCOVERED_DEVICES,
    family: FAMILY,
    scopes: SCOPE_OPTIONS,
    insights: INSIGHTS,
    chat: { welcome: WELCOME, presets: PRESETS, quotes: QUOTES, reply: chatReply },
    about: ABOUT,
    privacy: PRIVACY,
    contact: CONTACT,
    disclaimer: '演示模式：当前数据为模拟数据，不作为医疗判断依据。'
  };
})(window);




