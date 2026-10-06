/**
 * publish.js —— 发布信息页逻辑
 * 负责：类型切换、类别下拉、图片预览、表单校验（调用 Core.validateItem）、
 *       提交入库（LFStore.add）并跳转详情页。
 */
(function () {
  'use strict';

  var Core = window.LFCore, Store = window.LFStore, UI = window.LFUI;

  var els = {};
  var images = []; // 已选择的图片 dataURL

  function cacheEls() {
    els.form = document.getElementById('publishForm');
    els.typeToggle = document.getElementById('typeToggle');
    els.typeInput = document.getElementById('typeInput');
    els.category = document.getElementById('category');
    els.locationLabel = document.getElementById('locationLabel');
    els.contactType = document.getElementById('contactType');
    els.contactLabel = document.getElementById('contactLabel');
    els.contact = document.getElementById('contact');
    els.description = document.getElementById('description');
    els.descCount = document.getElementById('descCount');
    els.uploader = document.getElementById('uploader');
    els.imageInput = document.getElementById('imageInput');
  }

  function init() {
    cacheEls();
    UI.initCommon();
    document.getElementById('brandLogo').innerHTML = UI.icon('box', 20);
    document.getElementById('uploadPlus').innerHTML = UI.icon('plus', 28);

    // 类别下拉
    var opts = ['<option value="">请选择类别</option>'];
    Core.CATEGORIES.forEach(function (c) {
      opts.push('<option value="' + c + '">' + c + '</option>');
    });
    els.category.innerHTML = opts.join('');

    bindEvents();
    updateContactPlaceholder();
    updateLocationLabel();
  }

  function bindEvents() {
    // 类型卡片切换
    els.typeToggle.addEventListener('click', function (e) {
      var card = e.target.closest('.type-card');
      if (card) selectType(card.dataset.type);
    });
    els.typeToggle.addEventListener('keydown', function (e) {
      var card = e.target.closest('.type-card');
      if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); selectType(card.dataset.type); }
    });

    // 联系方式类型 -> 输入提示
    els.contactType.addEventListener('change', updateContactPlaceholder);

    // 描述字数
    els.description.addEventListener('input', function () {
      els.descCount.textContent = els.description.value.length;
    });

    // 图片上传
    els.imageInput.addEventListener('change', handleImages);
    els.uploader.addEventListener('click', function (e) {
      var del = e.target.closest('.del');
      if (del) {
        e.preventDefault();
        var idx = Number(del.dataset.idx);
        images.splice(idx, 1);
        renderImages();
      }
    });

    // 提交
    els.form.addEventListener('submit', onSubmit);
    // 重填
    document.getElementById('resetBtn').addEventListener('click', function () {
      images = [];
      renderImages();
      clearErrors();
      els.descCount.textContent = '0';
      setTimeout(function () { selectType('lost'); }, 0);
    });

    // 失焦即时校验单字段
    ['name', 'location', 'contactName', 'contact'].forEach(function (f) {
      var el = document.getElementById(f);
      el.addEventListener('blur', function () { validateField(f); });
    });
    els.category.addEventListener('change', function () { validateField('category'); });
  }

  function selectType(type) {
    els.typeInput.value = type;
    Array.prototype.forEach.call(els.typeToggle.children, function (c) {
      c.classList.toggle('active', c.dataset.type === type);
    });
    updateContactPlaceholder();
    updateLocationLabel();
  }

  function updateLocationLabel() {
    els.locationLabel.innerHTML = (els.typeInput.value === 'found' ? '拾获地点' : '丢失地点') +
      ' <span class="req">*</span>';
  }

  function updateContactPlaceholder() {
    var t = els.contactType.value;
    var map = { wechat: ['微信号', '填写你的微信号，方便他人联系你'],
                qq: ['QQ 号', '填写 5~12 位 QQ 号'],
                phone: ['手机号', '填写 11 位手机号'] };
    var m = map[t] || map.wechat;
    els.contactLabel.innerHTML = m[0] + ' <span class="req">*</span>';
    els.contact.placeholder = m[1];
    els.contact.type = (t === 'phone') ? 'tel' : 'text';
  }

  /* ---------- 图片处理 ---------- */
  function handleImages(e) {
    var files = Array.prototype.slice.call(e.target.files || []);
    var remain = 3 - images.length;
    files = files.slice(0, remain);
    var pending = files.length;
    if (!pending) { UI.toast('最多上传 3 张图片', 'error'); return; }
    files.forEach(function (file) {
      if (!/^image\//.test(file.type)) { pending--; return; }
      var reader = new FileReader();
      reader.onload = function () {
        images.push(reader.result);
        renderImages();
      };
      reader.readAsDataURL(file);
    });
    els.imageInput.value = '';
  }

  function renderImages() {
    // 保留上传按钮，清掉其它预览
    els.uploader.querySelectorAll('.preview').forEach(function (n) { n.remove(); });
    images.forEach(function (src, i) {
      var tile = document.createElement('div');
      tile.className = 'upload-tile preview';
      tile.innerHTML = '<img src="' + src + '" alt="预览"><span class="del" data-idx="' + i + '" title="删除">×</span>';
      els.uploader.insertBefore(tile, els.uploader.firstChild);
    });
    document.getElementById('uploadTile').style.display = images.length >= 3 ? 'none' : 'grid';
  }

  /* ---------- 校验 ---------- */
  function collect() {
    return {
      type: els.typeInput.value,
      name: document.getElementById('name').value,
      category: els.category.value,
      location: document.getElementById('location').value,
      date: document.getElementById('date').value,
      description: els.description.value,
      contactName: document.getElementById('contactName').value,
      contactType: els.contactType.value,
      contact: els.contact.value,
      images: images
    };
  }

  function validateField(field) {
    var data = collect();
    var errors = Core.validateItem(data);
    setFieldError(field, errors[field]);
    return !errors[field];
  }

  function setFieldError(field, msg) {
    var box = document.querySelector('[data-err="' + field + '"]');
    if (box) box.textContent = msg || '';
    var input = document.getElementById(field);
    if (input) {
      var wrap = input.closest('.field');
      if (wrap) wrap.classList.toggle('has-error', !!msg);
    }
  }

  function clearErrors() {
    document.querySelectorAll('.err').forEach(function (n) { n.textContent = ''; });
    document.querySelectorAll('.field.has-error').forEach(function (n) { n.classList.remove('has-error'); });
  }

  function onSubmit(e) {
    e.preventDefault();
    var data = collect();
    var errors = Core.validateItem(data);

    // 清空后逐项回填
    clearErrors();
    var firstBad = null;
    Object.keys(errors).forEach(function (k) {
      setFieldError(k, errors[k]);
      if (!firstBad) firstBad = k;
    });

    if (firstBad) {
      UI.toast('请检查表单中标红的内容', 'error');
      var el = document.getElementById(firstBad) || document.querySelector('[data-err="' + firstBad + '"]');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // 入库
    var item = Core.createItem(data);
    Store.add(item);
    UI.toast('发布成功！正在跳转到详情页…', 'success');
    setTimeout(function () {
      location.href = 'detail.html?id=' + encodeURIComponent(item.id) + '&new=1';
    }, 700);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
