/**
 * my-posts.js —— 我的发布页逻辑
 * 负责：列出本机发布的信息、按状态筛选、快速标记已解决 / 删除、导出数据。
 */
(function () {
  'use strict';

  var Core = window.LFCore, Store = window.LFStore, UI = window.LFUI;

  var state = { status: 'all' };
  var els = {};

  function init() {
    UI.initCommon();
    document.getElementById('brandLogo').innerHTML = UI.icon('box', 20);
    els.list = document.getElementById('myList');
    els.mask = document.getElementById('modalMask');
    els.sub = document.getElementById('mySub');

    document.getElementById('mySeg').addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-status]');
      if (!btn) return;
      state.status = btn.dataset.status;
      Array.prototype.forEach.call(btn.parentNode.children, function (b) {
        b.classList.toggle('active', b === btn);
      });
      render();
    });

    document.getElementById('exportBtn').addEventListener('click', exportData);

    render();
  }

  function getMineItems() {
    var mine = Store.getMine();
    return Store.getAll().filter(function (it) { return mine.indexOf(it.id) !== -1; });
  }

  function render() {
    var mine = getMineItems();
    var stats = Core.getStats(mine);
    els.sub.textContent = '共 ' + stats.total + ' 条 · 进行中 ' + stats.active + ' 条 · 已解决 ' + stats.resolved + ' 条';

    var list = mine.filter(function (it) {
      return state.status === 'all' || it.status === state.status;
    });
    list = Core.sortItems(list, 'newest');

    if (!list.length) {
      els.list.innerHTML = '' +
        '<div class="empty" style="background:#fff;border:1px solid var(--border);border-radius:16px">' +
          '<div class="empty-icon">' + UI.icon('plus') + '</div>' +
          '<p>' + (mine.length ? '该状态下暂无信息' : '你还没有发布过信息') + '</p>' +
          '<span>点击右上角「发布信息」，把丢失 / 捡到的物品告诉大家吧</span>' +
          '<div style="margin-top:18px"><a class="btn btn-primary" href="publish.html">立即发布</a></div>' +
        '</div>';
      return;
    }

    els.list.innerHTML = list.map(rowHTML).join('');
    bindRowEvents();
  }

  function rowHTML(it) {
    var thumb = (it.images && it.images[0])
      ? '<img src="' + it.images[0] + '" alt="">'
      : UI.categoryIcon(it.category);
    var resolved = it.status === 'resolved';
    return '' +
      '<div class="mypost-item" data-id="' + it.id + '">' +
        '<div class="mypost-thumb">' + thumb + '</div>' +
        '<div class="mypost-info">' +
          '<h3>' + Core.escapeHtml(it.name) + ' ' + UI.typeBadge(it.type) + ' ' + UI.statusBadge(it) + '</h3>' +
          '<div class="sub">' +
            '<span>' + UI.icon('pin', 14) + ' ' + Core.escapeHtml(it.location) + '</span>' +
            '<span>' + UI.icon('clock', 14) + ' ' + Core.timeAgo(it.createdAt) + '</span>' +
            '<span>' + UI.icon('tag', 14) + ' ' + Core.escapeHtml(it.category) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="mypost-actions">' +
          '<a class="btn btn-sm" href="detail.html?id=' + encodeURIComponent(it.id) + '">查看</a>' +
          (resolved
            ? '<button class="btn btn-sm" data-act="unresolve">恢复进行中</button>'
            : '<button class="btn btn-sm btn-primary" data-act="resolve">标记「' + Core.resolvedText(it.type) + '」</button>') +
          '<button class="btn btn-sm btn-danger" data-act="delete">删除</button>' +
        '</div>' +
      '</div>';
  }

  function bindRowEvents() {
    els.list.querySelectorAll('.mypost-item').forEach(function (row) {
      var id = row.dataset.id;
      row.querySelectorAll('button[data-act]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var act = btn.dataset.act;
          var item = Store.getById(id);
          if (!item) return;
          if (act === 'resolve') {
            confirmModal('标记为「' + Core.resolvedText(item.type) + '」？',
              '标记后表示物品已找到 / 已归还，列表仍会保留。', function () {
                Store.setStatus(id, 'resolved'); UI.toast('已标记为「' + Core.resolvedText(item.type) + '」', 'success'); render();
              });
          } else if (act === 'unresolve') {
            Store.setStatus(id, 'active'); UI.toast('已恢复为进行中', 'success'); render();
          } else if (act === 'delete') {
            confirmModal('确认删除？', '删除后不可恢复。', function () {
              Store.remove(id); UI.toast('已删除', 'success'); render();
            });
          }
        });
      });
    });
  }

  /* ---------- 导出 ---------- */
  function exportData() {
    var mine = getMineItems();
    if (!mine.length) { UI.toast('暂无可导出的数据', 'error'); return; }
    var blob = new Blob([JSON.stringify(mine, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '我的失物招领数据.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    UI.toast('已导出 ' + mine.length + ' 条数据', 'success');
  }

  /* ---------- 模态框 ---------- */
  function confirmModal(title, text, onOk) {
    els.mask.querySelector('#modalTitle').textContent = title;
    els.mask.querySelector('#modalText').textContent = text;
    els.mask.classList.add('show');
    var ok = els.mask.querySelector('#modalOk');
    var cancel = els.mask.querySelector('#modalCancel');
    function close() { els.mask.classList.remove('show'); ok.onclick = null; cancel.onclick = null; }
    ok.onclick = function () { close(); onOk(); };
    cancel.onclick = close;
    els.mask.onclick = function (e) { if (e.target === els.mask) close(); };
  }

  document.addEventListener('DOMContentLoaded', init);
})();
