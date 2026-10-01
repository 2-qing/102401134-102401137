/**
 * core.js —— 校园失物招领「核心业务逻辑」模块
 * ------------------------------------------------------------------
 * 设计原则：
 *   1. 本文件只包含「纯函数」与常量，不依赖 DOM、不依赖 localStorage，
 *      因此既能在浏览器中直接 <script> 引入，也能被 Node.js require 后在
 *      单元测试中调用（UMD 写法）。
 *   2. 页面脚本（app.js / publish.js / ...）负责 DOM 与存储，业务规则全部
 *      收敛到本文件，方便测试与复用。
 * ------------------------------------------------------------------
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node.js / 单元测试环境
    module.exports = factory();
  } else {
    // 浏览器环境
    root.LFCore = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ==================== 常量定义 ==================== */

  /** 信息类型：lost = 寻物启事（失主发布），found = 失物招领（拾获者发布） */
  var TYPES = {
    lost: '寻物启事',
    found: '失物招领'
  };

  /** 物品类别 */
  var CATEGORIES = [
    '证件卡类',
    '电子产品',
    '书籍文具',
    '衣物饰品',
    '钥匙门禁',
    '运动器材',
    '生活用品',
    '其他'
  ];

  /** 联系方式类型 */
  var CONTACT_TYPES = {
    wechat: '微信',
    qq: 'QQ',
    phone: '手机'
  };

  /** 状态：active = 进行中，resolved = 已解决（已找到 / 已归还） */
  var STATUS = {
    active: '进行中',
    resolved: '已解决'
  };

  /** 各类型信息「已解决」时的文案 */
  var RESOLVED_TEXT = {
    lost: '已找到',
    found: '已归还'
  };

  /** 发布表单字段的长度限制 */
  var LIMITS = {
    name: { min: 2, max: 30 },
    location: { min: 2, max: 40 },
    description: { min: 0, max: 300 },
    contact: { min: 3, max: 60 },
    contactName: { min: 1, max: 20 }
  };

  /* ==================== 工具函数 ==================== */

  /** 去除首尾空白，非字符串返回空串 */
  function trim(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  /** 生成一个足够唯一的字符串 ID（不依赖外部库） */
  function generateId(prefix) {
    var p = prefix || 'item';
    var rand = Math.random().toString(36).slice(2, 8);
    return p + '-' + Date.now().toString(36) + '-' + rand;
  }

  /** 将时间戳格式化为 YYYY-MM-DD HH:mm */
  function formatDateTime(ts) {
    var d = ts instanceof Date ? ts : new Date(ts);
    if (isNaN(d.getTime())) return '';
    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  /** 返回「相对时间」文案，例如「刚刚」「3 分钟前」「2 天前」 */
  function timeAgo(ts, now) {
    var base = now === undefined ? Date.now() : now;
    var diff = base - new Date(ts).getTime();
    if (isNaN(diff)) return '';
    if (diff < 0) diff = 0;
    var min = 60 * 1000, hour = 60 * min, day = 24 * hour;
    if (diff < min) return '刚刚';
    if (diff < hour) return Math.floor(diff / min) + ' 分钟前';
    if (diff < day) return Math.floor(diff / hour) + ' 小时前';
    if (diff < 30 * day) return Math.floor(diff / day) + ' 天前';
    return formatDateTime(ts).slice(0, 10);
  }

  /** 返回某个类型「已解决」时使用的文案 */
  function resolvedText(type) {
    return RESOLVED_TEXT[type] || '已解决';
  }

  /** 返回「发布这条信息的人」的称呼：lost 的发布者是失主，found 的是拾获者 */
  function publisherRole(type) {
    return type === 'lost' ? '失主' : '拾获者';
  }

  /* ==================== 核心业务函数 ==================== */

  /**
   * 校验一条待发布的信息。
   * @param {Object} data 表单数据
   * @returns {Object} errors —— 空对象表示校验通过；否则键为字段名，值为错误提示
   */
  function validateItem(data) {
    var d = data || {};
    var errors = {};

    var type = trim(d.type);
    if (type !== 'lost' && type !== 'found') {
      errors.type = '请选择信息类型（寻物 / 招领）';
    }

    var name = trim(d.name);
    if (!name) {
      errors.name = '请填写物品名称';
    } else if (name.length < LIMITS.name.min) {
      errors.name = '物品名称至少 ' + LIMITS.name.min + ' 个字';
    } else if (name.length > LIMITS.name.max) {
      errors.name = '物品名称不超过 ' + LIMITS.name.max + ' 个字';
    }

    var category = trim(d.category);
    if (!category) {
      errors.category = '请选择物品类别';
    } else if (CATEGORIES.indexOf(category) === -1) {
      errors.category = '物品类别不在可选范围内';
    }

    var location = trim(d.location);
    if (!location) {
      errors.location = '请填写' + (type === 'found' ? '拾获' : '丢失') + '地点';
    } else if (location.length < LIMITS.location.min) {
      errors.location = '地点至少 ' + LIMITS.location.min + ' 个字';
    } else if (location.length > LIMITS.location.max) {
      errors.location = '地点不超过 ' + LIMITS.location.max + ' 个字';
    }

    // 日期：允许为空（表示不确定），但若填写则必须合法且不能是未来时间
    if (d.date) {
      var t = new Date(d.date).getTime();
      if (isNaN(t)) {
        errors.date = '日期格式不正确';
      } else if (d.date.length <= 10) {
        // 只填了日期，无法精确判断未来，跳过
      }
    }

    var contactType = trim(d.contactType);
    if (contactType && Object.keys(CONTACT_TYPES).indexOf(contactType) === -1) {
      errors.contactType = '联系方式类型不正确';
    }

    var contact = trim(d.contact);
    if (!contact) {
      errors.contact = '请填写联系方式';
    } else if (contact.length < LIMITS.contact.min) {
      errors.contact = '联系方式至少 ' + LIMITS.contact.min + ' 个字符';
    } else if (contact.length > LIMITS.contact.max) {
      errors.contact = '联系方式不超过 ' + LIMITS.contact.max + ' 个字符';
    } else if (contactType === 'phone' && !/^1[3-9]\d{9}$/.test(contact)) {
      errors.contact = '手机号格式不正确（应为 11 位大陆手机号）';
    } else if (contactType === 'qq' && !/^\d{5,12}$/.test(contact)) {
      errors.contact = 'QQ 号格式不正确（应为 5~12 位数字）';
    }

    var contactName = trim(d.contactName);
    if (!contactName) {
      errors.contactName = '请填写你的称呼';
    } else if (contactName.length > LIMITS.contactName.max) {
      errors.contactName = '称呼不超过 ' + LIMITS.contactName.max + ' 个字';
    }

    var description = trim(d.description);
    if (description.length > LIMITS.description.max) {
      errors.description = '详细描述不超过 ' + LIMITS.description.max + ' 个字';
    }

    return errors;
  }

  /** 校验是否通过（无错误） */
  function isValid(data) {
    return Object.keys(validateItem(data)).length === 0;
  }

  /**
   * 把表单数据整理成一条标准的信息记录（补全 id / 状态 / 时间戳）。
   * 注意：调用前应确保已通过 validateItem 校验。
   */
  function createItem(data, options) {
    var opt = options || {};
    var now = opt.now === undefined ? Date.now() : opt.now;
    return {
      id: opt.id || generateId('item'),
      type: trim(data.type),
      name: trim(data.name),
      category: trim(data.category),
      location: trim(data.location),
      date: trim(data.date),
      description: trim(data.description),
      contactName: trim(data.contactName),
      contactType: trim(data.contactType) || 'wechat',
      contact: trim(data.contact),
      images: Array.isArray(data.images) ? data.images.slice(0, 3) : [],
      status: 'active',
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * 关键词搜索。
   * 在物品名称、类别、地点、描述、联系人中做「不区分大小写」的包含匹配。
   * @param {Array} items 信息列表
   * @param {string} keyword 关键词（可为空，空则返回全部）
   * @returns {Array} 命中的信息列表（新数组）
   */
  function searchItems(items, keyword) {
    var list = Array.isArray(items) ? items : [];
    var kw = trim(keyword).toLowerCase();
    if (!kw) return list.slice();
    return list.filter(function (it) {
      if (!it) return false;
      var haystack = [
        it.name, it.category, it.location, it.description,
        it.contactName, it.contact, TYPES[it.type] || ''
      ].join(' ').toLowerCase();
      return haystack.indexOf(kw) !== -1;
    });
  }

  /**
   * 多条件筛选。
   * @param {Array} items
   * @param {Object} filter { type, category, status }
   *   type: 'lost' | 'found' | 'all'（或空）
   *   category: 具体类别 或 'all'
   *   status: 'active' | 'resolved' | 'all'
   */
  function filterItems(items, filter) {
    var list = Array.isArray(items) ? items : [];
    var f = filter || {};
    return list.filter(function (it) {
      if (!it) return false;
      if (f.type && f.type !== 'all' && it.type !== f.type) return false;
      if (f.category && f.category !== 'all' && it.category !== f.category) return false;
      if (f.status && f.status !== 'all' && it.status !== f.status) return false;
      return true;
    });
  }

  /**
   * 排序：默认按发布时间倒序（最新在前）。
   * @param {Array} items
   * @param {string} order 'newest' | 'oldest'
   */
  function sortItems(items, order) {
    var list = Array.isArray(items) ? items.slice() : [];
    var dir = order === 'oldest' ? 1 : -1;
    list.sort(function (a, b) {
      return (a.createdAt - b.createdAt) * dir;
    });
    return list;
  }

  /** 组合：搜索 + 筛选 + 排序，页面直接调用它即可 */
  function queryItems(items, options) {
    var opt = options || {};
    var result = filterItems(items, opt.filter);
    result = searchItems(result, opt.keyword);
    return sortItems(result, opt.order);
  }

  /**
   * 更新某条信息的状态。
   * @param {Array} items
   * @param {string} id
   * @param {string} status 'active' | 'resolved'
   * @returns {Array} 新的列表（原列表不被修改）
   */
  function updateStatus(items, id, status) {
    if (status !== 'active' && status !== 'resolved') return items;
    var now = Date.now();
    return (Array.isArray(items) ? items : []).map(function (it) {
      if (it.id === id) {
        var copy = Object.assign({}, it);
        copy.status = status;
        copy.updatedAt = now;
        return copy;
      }
      return it;
    });
  }

  /** 删除某条信息，返回新列表 */
  function removeItem(items, id) {
    return (Array.isArray(items) ? items : []).filter(function (it) {
      return it.id !== id;
    });
  }

  /** 统计信息：总数、寻物数、招领数、进行中、已解决 */
  function getStats(items) {
    var list = Array.isArray(items) ? items : [];
    var stats = { total: list.length, lost: 0, found: 0, active: 0, resolved: 0 };
    list.forEach(function (it) {
      if (!it) return;
      if (it.type === 'lost') stats.lost++;
      if (it.type === 'found') stats.found++;
      if (it.status === 'resolved') stats.resolved++; else stats.active++;
    });
    return stats;
  }

  /** 高亮关键词：把匹配到的片段用 <mark> 包裹（HTML 转义后处理，防 XSS） */
  function highlight(text, keyword) {
    var raw = text === undefined || text === null ? '' : String(text);
    var escaped = escapeHtml(raw);
    var kw = trim(keyword);
    if (!kw) return escaped;
    var safeKw = escapeHtml(kw).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escaped.replace(new RegExp(safeKw, 'gi'), function (m) {
      return '<mark>' + m + '</mark>';
    });
  }

  /** HTML 转义，防止用户输入注入脚本 */
  function escapeHtml(str) {
    return String(str === undefined || str === null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** 生成一段示例数据，供首次打开或演示使用 */
  function seedItems(now) {
    var base = now === undefined ? Date.now() : now;
    var day = 24 * 60 * 60 * 1000;
    return [
      {
        id: 'seed-1', type: 'lost', name: '校园一卡通（王同学）', category: '证件卡类',
        location: '紫金园食堂二楼', date: '2026-10-01',
        description: '卡面为本人照片，卡号尾号 1134，丢失后非常着急，麻烦捡到的同学联系我，必有重谢！',
        contactName: '王同学', contactType: 'wechat', contact: 'wangqingyuan_1134',
        images: [], status: 'active', createdAt: base - 2 * 60 * 60 * 1000, updatedAt: base - 2 * 60 * 60 * 1000
      },
      {
        id: 'seed-2', type: 'found', name: '黑色无线耳机（充电仓）', category: '电子产品',
        location: '图书馆三楼自习区', date: '2026-10-02',
        description: '在靠窗自习桌捡到一副黑色蓝牙耳机，带充电仓，已交给本人保管，请描述特征认领。',
        contactName: '李同学', contactType: 'qq', contact: '102401199',
        images: [], status: 'active', createdAt: base - 8 * 60 * 60 * 1000, updatedAt: base - 8 * 60 * 60 * 1000
      },
      {
        id: 'seed-3', type: 'found', name: '银色保温杯', category: '生活用品',
        location: '博学楼 A 区 305 教室', date: '2026-09-30',
        description: '杯身贴有一张蓝色贴纸，杯盖为白色，已放在 305 教室讲台，失主可自行领取。',
        contactName: '张同学', contactType: 'phone', contact: '13800138000',
        images: [], status: 'resolved', createdAt: base - 3 * day, updatedAt: base - 2 * day
      },
      {
        id: 'seed-4', type: 'lost', name: '宿舍钥匙（一串，挂小恐龙挂件）', category: '钥匙门禁',
        location: '操场跑道附近', date: '2026-10-03',
        description: '一串三把钥匙，挂着一个绿色小恐龙硅胶挂件，晚上跑步时可能掉在操场，捡到请联系。',
        contactName: '陈同学', contactType: 'wechat', contact: 'chen_run2026',
        images: [], status: 'active', createdAt: base - 30 * 60 * 1000, updatedAt: base - 30 * 60 * 1000
      }
    ];
  }

  /* ==================== 导出 ==================== */
  return {
    // 常量
    TYPES: TYPES,
    CATEGORIES: CATEGORIES,
    CONTACT_TYPES: CONTACT_TYPES,
    STATUS: STATUS,
    LIMITS: LIMITS,
    // 工具
    trim: trim,
    generateId: generateId,
    formatDateTime: formatDateTime,
    timeAgo: timeAgo,
    resolvedText: resolvedText,
    publisherRole: publisherRole,
    escapeHtml: escapeHtml,
    highlight: highlight,
    // 业务
    validateItem: validateItem,
    isValid: isValid,
    createItem: createItem,
    searchItems: searchItems,
    filterItems: filterItems,
    sortItems: sortItems,
    queryItems: queryItems,
    updateStatus: updateStatus,
    removeItem: removeItem,
    getStats: getStats,
    seedItems: seedItems
  };
});
