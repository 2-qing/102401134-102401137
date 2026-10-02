/**
 * app.js —— 首页逻辑
 * 负责：读取筛选状态 -> 调用 LFStore.query 组合查询 -> 渲染卡片与统计。
 */
(function () {
  'use strict';

  var Core = window.LFCore, Store = window.LFStore, UI = window.LFUI;

  // 页面筛选状态
  var state = {
    type: 'all',
    category: 'all',
    status: 'all',
    order: 'newest',
    keyword: ''
  };

  var els = {};

  function cacheEls() {
    els.stats = document.getElementById('stats');
    els.grid = document.getElementById('cardGrid');
    els.hint = document.getElementById('resultHint');
    els.searchForm = document.getElementById('searchForm');
    els.searchInput = document.getElementById('searchInput');
    els.typeSeg = document.getElementById('typeSeg');
    els.categorySelect = document.getElementById('categorySelect');
    els.statusSelect = document.getElementById('statusSelect');
    els.orderSelect = document.getElementById('orderSelect');
  }

  /** 初始化：图标、类别下拉、示例数据 */
  function init() {
    cacheEls();
    UI.initCommon();
    document.getElementById('brandLogo').innerHTML = UI.icon('box', 20);
    document.getElementById('searchIcon').innerHTML = UI.icon('search', 20);

    // 类别下拉
    var opts = ['<option value="all">全部类别</option>'];
    Core.CATEGORIES.forEach(function (c) {
      opts.push('<option value="' + c + '">' + c + '</option>');
    });
    els.categorySelect.innerHTML = opts.join('');

    Store.initSeed();

    // 若 URL 带关键词（从别的页面跳转搜索），则回填
    var kw = UI.getParam('q');
    if (kw) { state.keyword = kw; els.searchInput.value = kw; }

    bindEvents();
    render();
  }

  function bindEvents() {
    // 搜索
    els.searchForm.addEventListener('submit', function (e) {
      e.preventDefault();
      state.keyword = els.searchInput.value.trim();
      render();
      document.querySelector('.toolbar').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    // 搜索框实时清空
    els.searchInput.addEventListener('input', function () {
      if (els.searchInput.value.trim() === '' && state.keyword !== '') {
        state.keyword = '';
        render();
      }
    });

    // 类型切换
    els.typeSeg.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-type]');
      if (!btn) return;
      state.type = btn.dataset.type;
      Array.prototype.forEach.call(els.typeSeg.children, function (b) {
        b.classList.toggle('active', b === btn);
      });
      render();
    });

    els.categorySelect.addEventListener('change', function () {
      state.category = els.categorySelect.value; render();
    });
    els.statusSelect.addEventListener('change', function () {
      state.status = els.statusSelect.value; render();
    });
    els.orderSelect.addEventListener('change', function () {
      state.order = els.orderSelect.value; render();
    });
  }

  function render() {
    renderStats();
    var items = Store.query({
      keyword: state.keyword,
      filter: { type: state.type, category: state.category, status: state.status },
      order: state.order
    });
    UI.renderCards(els.grid, items, { keyword: state.keyword });

    // 结果提示
    var parts = [];
    if (state.keyword) parts.push('关键词「<b>' + Core.escapeHtml(state.keyword) + '</b>」');
    if (state.type !== 'all') parts.push(Core.TYPES[state.type]);
    if (state.category !== 'all') parts.push(state.category);
    if (state.status !== 'all') parts.push(Core.STATUS[state.status]);
    var scope = parts.length ? parts.join(' · ') + ' ' : '';
    els.hint.innerHTML = '共找到 <b>' + items.length + '</b> 条信息' + (scope ? '（' + scope + '）' : '');
  }

  function renderStats() {
    var s = Store.stats();
    var data = [
      { num: s.total, label: '信息总数', cls: '' },
      { num: s.lost, label: '寻物启事', cls: 'lost' },
      { num: s.found, label: '失物招领', cls: 'found' },
      { num: s.resolved, label: '已成功解决', cls: '' }
    ];
    els.stats.innerHTML = data.map(function (d) {
      return '<div class="stat ' + d.cls + '"><div class="num">' + d.num +
        '</div><div class="label">' + d.label + '</div></div>';
    }).join('');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
