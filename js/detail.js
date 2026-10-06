/**
 * detail.js —— 信息详情页逻辑
 * 负责：按 id 读取信息、渲染详情、一键复制联系方式、
 *       状态更新（标记已找到 / 已归还）、删除本人发布。
 */
(function () {
  'use strict';

  var Core = window.LFCore, Store = window.LFStore, UI = window.LFUI;

  var item = null;
  var root = null;
  var els = {};

  function init() {
    UI.initCommon();
    document.getElementById('brandLogo').innerHTML = UI.icon('box', 20);
    root = document.getElementById('detailRoot');
    els.mask = document.getElementById('modalMask');

    var id = UI.getParam('id');
    item = id ? Store.getById(id) : null;

    if (!item) {
      root.innerHTML = '' +
        '<div class="empty" style="background:#fff;border:1px solid var(--border);border-radius:16px">' +
          '<div class="empty-icon">' + UI.icon('search') + '</div>' +
          '<p>没有找到这条信息</p>' +
          '<span>它可能已被删除，或链接不正确</span>' +
          '<div style="margin-top:18px"><a class="btn btn-primary" href="index.html">返回首页</a></div>' +
        '</div>';
      return;
    }

    if (UI.getParam('new')) {
      UI.toast('发布成功，这就是你的信息 👇', 'success');
    }

    render();
  }

  function render() {
    var isMine = Store.isMine(item.id);
    var resolved = item.status === 'resolved';
    var coverHTML;
    if (item.images && item.images.length) {
      coverHTML = '<img class="main-img" id="mainImg" src="' + item.images[0] + '" alt="' + Core.escapeHtml(item.name) + '">' +
        (item.images.length > 1 ? '<div class="thumbs" id="thumbs">' +
          item.images.map(function (s, i) {
            return '<img src="' + s + '" data-i="' + i + '" class="' + (i === 0 ? 'active' : '') + '" alt="图' + (i + 1) + '">';
          }).join('') + '</div>' : '');
    } else {
      coverHTML = '<div class="no-img">' + UI.categoryIcon(item.category) + '</div>';
    }

    var html = '' +
      '<div class="detail-grid">' +
        // 左侧主体
        '<div class="detail-main">' +
          '<div class="detail-gallery">' + coverHTML + '</div>' +
          '<div class="detail-body">' +
            '<div class="detail-head">' + UI.typeBadge(item.type) + UI.statusBadge(item) +
              '<span class="badge badge-active">' + Core.escapeHtml(item.category) + '</span></div>' +
            '<h1 class="detail-title">' + Core.escapeHtml(item.name) + '</h1>' +
            '<div class="info-list">' +
              infoItem('pin', item.type === 'found' ? '拾获地点' : '丢失地点', item.location) +
              infoItem('clock', '相关日期', item.date || '未填写') +
              infoItem('user', '发布者', item.contactName + '（' + Core.publisherRole(item.type) + '）') +
              infoItem('tag', '发布时间', Core.formatDateTime(item.createdAt)) +
            '</div>' +
            '<div class="detail-desc">' +
              '<div class="k">详细描述</div>' +
              '<div class="v">' + (Core.trim(item.description) ? Core.escapeHtml(item.description) : '发布者未填写更多描述。') + '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // 右侧联系卡片
        '<aside>' +
          '<div class="side-card">' +
            '<div class="publisher">' +
              '<div class="avatar">' + Core.escapeHtml((item.contactName || '?').slice(0, 1)) + '</div>' +
              '<div><div class="name">' + Core.escapeHtml(item.contactName) + '</div>' +
              '<div class="role">' + Core.publisherRole(item.type) + ' · 发布于 ' + Core.timeAgo(item.createdAt) + '</div></div>' +
            '</div>' +
            '<div class="contact-row">' +
              UI.icon('user') +
              '<div><div class="k">' + (Core.CONTACT_TYPES[item.contactType] || '联系方式') + '</div>' +
              '<div class="v" id="contactValue">' + Core.escapeHtml(item.contact) + '</div></div>' +
              '<button class="btn btn-sm copy-btn" id="copyBtn">' + UI.icon('copy', 15) + '复制</button>' +
            '</div>' +
            (resolved
              ? '<div class="side-actions"><div class="btn btn-block" style="background:#f0f1f4;color:#5b6472;border-color:#e8ebf2;cursor:default">' +
                 UI.icon('check', 16) + '该信息已标记为「' + Core.resolvedText(item.type) + '」</div></div>'
              : '<div class="side-actions">' +
                 '<button class="btn btn-accent btn-block" id="contactBtn">' + UI.icon('check', 16) + '我捡到了 / 我来认领</button>' +
                 (isMine
                   ? '<button class="btn btn-primary btn-block" id="resolveBtn">' + UI.icon('check', 16) + '标记为「' + Core.resolvedText(item.type) + '」</button>'
                   : '<div class="hint" style="color:var(--text-3);font-size:12.5px;text-align:center">仅发布者本人可修改状态</div>') +
                '</div>') +
            (isMine
              ? '<div class="side-actions"><button class="btn btn-danger btn-block" id="deleteBtn">' + UI.icon('trash', 16) + '删除这条信息</button></div>'
              : '') +
          '</div>' +

          '<div class="side-card" style="background:linear-gradient(135deg,#f8faff,#eefaf8);border-color:#e2e9ff">' +
            '<div style="font-weight:700;margin-bottom:6px">💡 温馨提示</div>' +
            '<div style="font-size:13.5px;color:var(--text-2);line-height:1.7">' +
              '· 联系时请先说明物品特征，确认无误再线下交接；<br>' +
              '· 贵重物品建议在宿舍楼、食堂等公共场所交接；<br>' +
              '· 归还 / 认领成功后，请发布者及时标记状态，减少无效联系。' +
            '</div>' +
          '</div>' +
        '</aside>' +
      '</div>';

    root.innerHTML = html;
    bindEvents(isMine);
  }

  function infoItem(iconName, k, v) {
    return '<div class="info-item">' + UI.icon(iconName) +
      '<div><div class="k">' + k + '</div><div class="v">' + Core.escapeHtml(v) + '</div></div></div>';
  }

  function bindEvents(isMine) {
    // 缩略图切换
    var thumbs = document.getElementById('thumbs');
    if (thumbs) {
      thumbs.addEventListener('click', function (e) {
        var img = e.target.closest('img');
        if (!img) return;
        document.getElementById('mainImg').src = item.images[Number(img.dataset.i)];
        thumbs.querySelectorAll('img').forEach(function (n) { n.classList.toggle('active', n === img); });
      });
    }

    // 复制联系方式
    var copyBtn = document.getElementById('copyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        UI.copyText(item.contact).then(function (ok) {
          UI.toast(ok ? '联系方式已复制到剪贴板' : '复制失败，请手动长按选择', ok ? 'success' : 'error');
        });
      });
    }

    // 联系按钮（复制 + 提示）
    var contactBtn = document.getElementById('contactBtn');
    if (contactBtn) {
      contactBtn.addEventListener('click', function () {
        UI.copyText(item.contact).then(function (ok) {
          UI.toast(ok ? '已复制联系方式，快去联系 TA 吧～' : '请手动复制联系方式', ok ? 'success' : 'error');
        });
      });
    }

    // 标记已解决
    var resolveBtn = document.getElementById('resolveBtn');
    if (resolveBtn) {
      resolveBtn.addEventListener('click', function () {
        openModal('确认标记为「' + Core.resolvedText(item.type) + '」？',
          '标记后该信息会显示为已解决状态，仍可浏览，但不再提示联系。',
          function () {
            Store.setStatus(item.id, 'resolved');
            item = Store.getById(item.id);
            UI.toast('已标记为「' + Core.resolvedText(item.type) + '」', 'success');
            render();
          });
      });
    }

    // 删除
    var deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function () {
        openModal('确认删除这条信息？', '删除后不可恢复，其他同学将无法再看到它。', function () {
          Store.remove(item.id);
          UI.toast('已删除', 'success');
          setTimeout(function () { location.href = 'my-posts.html'; }, 600);
        });
      });
    }
  }

  /* ---------- 模态框 ---------- */
  function openModal(title, text, onOk) {
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
