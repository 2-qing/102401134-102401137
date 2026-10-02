/**
 * ui.js —— 共享 UI 组件与工具
 * ------------------------------------------------------------------
 * 负责：导航栏高亮、信息卡片渲染、Toast 提示、空状态、复制联系方式等。
 * 依赖 core.js（LFCore），不依赖具体页面。
 * ------------------------------------------------------------------
 */
(function (root) {
  'use strict';

  var Core = root.LFCore;

  /* ---------- 提示条 Toast ---------- */
  function toast(message, type) {
    var box = document.getElementById('toast');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toast';
      document.body.appendChild(box);
    }
    box.textContent = message;
    box.className = 'toast show' + (type ? ' toast-' + type : '');
    clearTimeout(box._timer);
    box._timer = setTimeout(function () {
      box.className = 'toast';
    }, 2200);
  }

  /* ---------- 导航栏高亮 ---------- */
  function highlightNav() {
    var path = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(function (a) {
      var href = a.getAttribute('href');
      if (href === path) a.classList.add('active');
    });
  }

  /* ---------- 信息卡片 ---------- */
  function typeBadge(type) {
    var label = Core.TYPES[type] || '未知';
    return '<span class="badge badge-' + type + '">' + label + '</span>';
  }

  function statusBadge(item) {
    if (item.status === 'resolved') {
      return '<span class="badge badge-resolved">' + Core.resolvedText(item.type) + '</span>';
    }
    return '<span class="badge badge-active">进行中</span>';
  }

  /**
   * 渲染单个信息卡片。
   * @param {Object} item
   * @param {Object} options { keyword }
   */
  function cardHTML(item, options) {
    var opt = options || {};
    var kw = opt.keyword || '';
    var cover = (item.images && item.images[0])
      ? '<div class="card-cover" style="background-image:url(' + item.images[0] + ')"></div>'
      : '<div class="card-cover card-cover-empty">' + categoryIcon(item.category) + '</div>';
    var resolvedClass = item.status === 'resolved' ? ' is-resolved' : '';
    return '' +
      '<a class="card' + resolvedClass + '" href="detail.html?id=' + encodeURIComponent(item.id) + '">' +
        cover +
        '<div class="card-body">' +
          '<div class="card-tags">' + typeBadge(item.type) + statusBadge(item) + '</div>' +
          '<h3 class="card-title">' + Core.highlight(item.name, kw) + '</h3>' +
          '<p class="card-desc">' + Core.highlight(shorten(item.description, 42), kw) + '</p>' +
          '<div class="card-meta">' +
            '<span class="meta-item" title="地点">' + icon('pin') + Core.highlight(item.location, kw) + '</span>' +
            '<span class="meta-item" title="类别">' + icon('tag') + Core.escapeHtml(item.category) + '</span>' +
          '</div>' +
          '<div class="card-foot">' +
            '<span class="card-cat">' + Core.escapeHtml(item.date || '时间待定') + '</span>' +
            '<span class="card-time">' + Core.timeAgo(item.createdAt) + '</span>' +
          '</div>' +
        '</div>' +
      '</a>';
  }

  function shorten(text, len) {
    var t = Core.trim(text) || '暂无详细描述';
    return t.length > len ? t.slice(0, len) + '…' : t;
  }

  /** 渲染卡片列表到容器 */
  function renderCards(container, items, options) {
    if (!container) return;
    if (!items || items.length === 0) {
      container.innerHTML = emptyState();
      return;
    }
    container.innerHTML = items.map(function (it) {
      return cardHTML(it, options);
    }).join('');
  }

  function emptyState() {
    return '' +
      '<div class="empty">' +
        '<div class="empty-icon">' + icon('search') + '</div>' +
        '<p>暂时没有找到相关信息</p>' +
        '<span>换个关键词，或点击右上角「发布信息」帮 TA 一把～</span>' +
      '</div>';
  }

  /* ---------- 类别图标（纯内联 SVG，无外部依赖） ---------- */
  function categoryIcon(category) {
    var map = {
      '证件卡类': 'card',
      '电子产品': 'device',
      '书籍文具': 'book',
      '衣物饰品': 'shirt',
      '钥匙门禁': 'key',
      '运动器材': 'ball',
      '生活用品': 'cup',
      '其他': 'box'
    };
    return icon(map[category] || 'box');
  }

  /* ---------- 简易 SVG 图标库 ---------- */
  var PATHS = {
    search: '<circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/>',
    pin: '<path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7-7A2 2 0 0 1 3 12.2V5a2 2 0 0 1 2-2h7.2a2 2 0 0 1 1.4.6l7 7a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>',
    device: '<rect x="7" y="3" width="10" height="18" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/>',
    book: '<path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z"/><line x1="8" y1="8" x2="14" y2="8"/>',
    shirt: '<path d="M8 3 4 6l2 3 2-1v10h8V8l2 1 2-3-4-3-2 2h-4z"/>',
    key: '<circle cx="8" cy="14" r="4"/><path d="M11 11 20 2m-3 0 3 3m-6 0 3 3"/>',
    ball: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/>',
    cup: '<path d="M6 3h9v13a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z"/><path d="M15 6h3a3 3 0 0 1 0 6h-3"/>',
    box: '<path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/><line x1="12" y1="11" x2="12" y2="21"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    back: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    trash: '<polyline points="4 7 20 7"/><path d="M6 7v13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7"/><path d="M9 7V4h6v3"/>'
  };

  function icon(name, size) {
    var p = PATHS[name];
    if (!p) return '';
    var s = size || 18;
    return '<svg class="ic ic-' + name + '" width="' + s + '" height="' + s +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }

  /* ---------- 复制到剪贴板 ---------- */
  function copyText(text) {
    var t = Core.trim(text);
    if (!t) return Promise.resolve(false);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(t).then(function () { return true; })
        .catch(function () { return fallbackCopy(t); });
    }
    return Promise.resolve(fallbackCopy(t));
  }

  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
    }
  }

  /* ---------- URL 参数 ---------- */
  function getParam(name) {
    var params = new URLSearchParams(location.search);
    return params.get(name) || '';
  }

  /* ---------- 初始化通用部分 ---------- */
  function initCommon() {
    // 任意页面首次打开都保证有示例数据（便于直接打开详情页等场景）
    if (root.LFStore && typeof root.LFStore.initSeed === 'function') {
      root.LFStore.initSeed();
    }
    highlightNav();
    // 导航「发布」按钮注入图标
    var pub = document.querySelector('.nav-publish');
    if (pub && !pub.querySelector('.ic')) {
      pub.innerHTML = icon('plus', 16) + '<span>发布信息</span>';
    }
  }

  root.LFUI = {
    toast: toast,
    highlightNav: highlightNav,
    cardHTML: cardHTML,
    renderCards: renderCards,
    emptyState: emptyState,
    categoryIcon: categoryIcon,
    typeBadge: typeBadge,
    statusBadge: statusBadge,
    icon: icon,
    copyText: copyText,
    getParam: getParam,
    shorten: shorten,
    initCommon: initCommon
  };
})(typeof self !== 'undefined' ? self : this);
