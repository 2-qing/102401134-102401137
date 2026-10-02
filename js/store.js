/**
 * store.js —— 数据存储层
 * ------------------------------------------------------------------
 * 使用浏览器 localStorage 持久化数据，使「刷新页面后数据不丢失」。
 * 页面的所有读写都通过本模块完成，业务规则仍由 core.js 提供。
 * 采用 UMD 写法：浏览器下挂载到 window.LFStore，Node 下可 require（便于测试）。
 * ------------------------------------------------------------------
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node.js 环境
    module.exports = factory(require('./core.js'));
  } else {
    // 浏览器环境
    root.LFStore = factory(root.LFCore);
  }
})(typeof self !== 'undefined' ? self : this, function (Core) {
  'use strict';

  var KEY = 'campus_lost_found_items_v1';
  var SEED_FLAG = 'campus_lost_found_seeded_v1';
  var MINE_KEY = 'campus_lost_found_mine_v1'; // 记录「本机发布过」的信息 id

  /** 统一获取 localStorage（Node 测试时可注入 global.localStorage） */
  function ls() {
    return (typeof localStorage !== 'undefined') ? localStorage : null;
  }

  /* ---------- 我的发布：无登录情况下用本机记录区分 ---------- */
  function getMine() {
    try {
      var s = ls();
      if (!s) return [];
      var raw = s.getItem(MINE_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function addMine(id) {
    var list = getMine();
    if (list.indexOf(id) === -1) list.push(id);
    try { var s = ls(); if (s) s.setItem(MINE_KEY, JSON.stringify(list)); } catch (e) {}
    return list;
  }

  function isMine(id) {
    return getMine().indexOf(id) !== -1;
  }

  /** 读取全部信息 */
  function getAll() {
    try {
      var s = ls();
      if (!s) return [];
      var raw = s.getItem(KEY);
      if (!raw) return [];
      var data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn('[store] 读取数据失败：', e);
      return [];
    }
  }

  /** 覆盖写入全部信息 */
  function saveAll(items) {
    try {
      var s = ls();
      if (!s) return false;
      s.setItem(KEY, JSON.stringify(items || []));
      return true;
    } catch (e) {
      console.warn('[store] 写入数据失败（可能超出容量）：', e);
      return false;
    }
  }

  /** 首次使用时写入示例数据，方便演示与测试 */
  function initSeed() {
    var s = ls();
    if (!s) return;
    if (s.getItem(SEED_FLAG)) return;
    if (getAll().length === 0) {
      saveAll(Core.seedItems());
    }
    s.setItem(SEED_FLAG, '1');
  }

  /** 新增一条信息，返回新增后的完整列表 */
  function add(item) {
    var list = getAll();
    list.unshift(item);
    saveAll(list);
    if (item && item.id) addMine(item.id);
    return list;
  }

  /** 按 id 查询 */
  function getById(id) {
    return getAll().filter(function (it) { return it.id === id; })[0] || null;
  }

  /** 更新状态，返回更新后的列表 */
  function setStatus(id, status) {
    var list = Core.updateStatus(getAll(), id, status);
    saveAll(list);
    return list;
  }

  /** 删除，返回删除后的列表 */
  function remove(id) {
    var list = Core.removeItem(getAll(), id);
    saveAll(list);
    return list;
  }

  /** 组合查询（搜索 + 筛选 + 排序） */
  function query(options) {
    return Core.queryItems(getAll(), options);
  }

  /** 统计 */
  function stats() {
    return Core.getStats(getAll());
  }

  /** 清空全部数据（设置页 / 测试用） */
  function clear() {
    var s = ls();
    if (s) s.removeItem(KEY);
  }

  /** 导出为 JSON 字符串（用于「导出数据」附加功能） */
  function exportJSON() {
    return JSON.stringify(getAll(), null, 2);
  }

  return {
    KEY: KEY,
    MINE_KEY: MINE_KEY,
    getAll: getAll,
    saveAll: saveAll,
    initSeed: initSeed,
    add: add,
    getById: getById,
    setStatus: setStatus,
    remove: remove,
    query: query,
    stats: stats,
    clear: clear,
    exportJSON: exportJSON,
    getMine: getMine,
    addMine: addMine,
    isMine: isMine
  };
});
