/**
 * core.test.js —— 核心业务逻辑单元测试（Mocha + Chai）
 * ------------------------------------------------------------------
 * 运行方式：
 *   1) Node 环境：在项目根目录执行 `npm test`
 *   2) 浏览器环境：用 Chrome 打开 tests/test.html 查看可视化结果
 *
 * 说明：本文件同时兼容 Node（require）与浏览器（window.LFCore / chai 全局变量）。
 * ------------------------------------------------------------------
 */
(function () {
  'use strict';

  // 兼容 Node 与浏览器两种运行环境
  var isNode = (typeof module !== 'undefined' && module.exports);
  var Core = isNode ? require('../js/core.js') : window.LFCore;
  var assert = isNode ? require('chai').assert : window.chai.assert;

  /* ============ 测试数据工厂 ============ */
  function makeValid(overrides) {
    var base = {
      type: 'lost',
      name: '黑色雨伞',
      category: '生活用品',
      location: '图书馆一楼大厅',
      date: '2026-10-01',
      description: '伞面带小碎花，伞柄有划痕',
      contactName: '王同学',
      contactType: 'wechat',
      contact: 'wang_2026'
    };
    return Object.assign({}, base, overrides || {});
  }

  function makeItem(overrides) {
    return Object.assign({
      id: 't1', type: 'lost', name: '测试物品', category: '其他',
      location: '某地', date: '', description: '', contactName: '张三',
      contactType: 'wechat', contact: 'test', images: [],
      status: 'active', createdAt: 1000, updatedAt: 1000
    }, overrides || {});
  }

  /* ======================================================
     一、validateItem —— 表单校验（白盒：覆盖每个字段的边界）
     ====================================================== */
  describe('validateItem 表单校验', function () {

    it('用例1：合法数据应通过校验（返回空错误对象）', function () {
      var errors = Core.validateItem(makeValid());
      assert.deepEqual(errors, {});
      assert.isTrue(Core.isValid(makeValid()));
    });

    it('用例2：缺少必填字段时，应逐项给出错误提示', function () {
      var errors = Core.validateItem({});
      assert.property(errors, 'type');
      assert.property(errors, 'name');
      assert.property(errors, 'category');
      assert.property(errors, 'location');
      assert.property(errors, 'contact');
      assert.property(errors, 'contactName');
      assert.isFalse(Core.isValid({}));
    });

    it('用例3：物品名称长度边界（1 字过短、31 字过长、2 字与 30 字合法）', function () {
      assert.property(Core.validateItem(makeValid({ name: '伞' })), 'name');       // 1 字 -> 过短
      assert.property(Core.validateItem(makeValid({ name: 'a'.repeat(31) })), 'name'); // 31 字 -> 过长
      assert.notProperty(Core.validateItem(makeValid({ name: '雨伞' })), 'name');       // 2 字 -> 合法
      assert.notProperty(Core.validateItem(makeValid({ name: 'a'.repeat(30) })), 'name'); // 30 字 -> 合法
    });

    it('用例4：类别必须在预定义列表内（非法类别被拒绝）', function () {
      assert.notProperty(Core.validateItem(makeValid({ category: '电子产品' })), 'category');
      assert.property(Core.validateItem(makeValid({ category: '不存在的类别' })), 'category');
    });

    it('用例5：手机号格式校验（11 位合法号码通过，非法号码被拒）', function () {
      assert.notProperty(Core.validateItem(makeValid({ contactType: 'phone', contact: '13800138000' })), 'contact');
      assert.property(Core.validateItem(makeValid({ contactType: 'phone', contact: '12345' })), 'contact');
      assert.property(Core.validateItem(makeValid({ contactType: 'phone', contact: '23800138000' })), 'contact');
    });

    it('用例6：QQ 号格式校验（5~12 位数字合法，含字母被拒）', function () {
      assert.notProperty(Core.validateItem(makeValid({ contactType: 'qq', contact: '102401134' })), 'contact');
      assert.property(Core.validateItem(makeValid({ contactType: 'qq', contact: 'abc123' })), 'contact');
      assert.property(Core.validateItem(makeValid({ contactType: 'qq', contact: '1234' })), 'contact');
    });

    it('用例7：描述为空允许通过，超过 300 字被拒', function () {
      assert.notProperty(Core.validateItem(makeValid({ description: '' })), 'description');
      assert.property(Core.validateItem(makeValid({ description: 'x'.repeat(301) })), 'description');
    });

    it('用例8：手机号类型下，含空格的输入应被 trim 后正确判断', function () {
      var errors = Core.validateItem(makeValid({ contactType: 'phone', contact: '  13800138000  ' }));
      assert.notProperty(errors, 'contact');
    });
  });

  /* ======================================================
     二、createItem —— 记录构造
     ====================================================== */
  describe('createItem 构造信息记录', function () {

    it('用例9：应补全 id、状态、时间戳，并去除首尾空格', function () {
      var item = Core.createItem(makeValid({ name: '  黑色雨伞  ' }), { id: 'fixed-1', now: 20261004 });
      assert.equal(item.id, 'fixed-1');
      assert.equal(item.name, '黑色雨伞');
      assert.equal(item.status, 'active');
      assert.equal(item.createdAt, 20261004);
      assert.equal(item.updatedAt, 20261004);
      assert.isArray(item.images);
    });

    it('用例10：图片最多保留 3 张', function () {
      var item = Core.createItem(makeValid({ images: ['a', 'b', 'c', 'd', 'e'] }));
      assert.lengthOf(item.images, 3);
    });

    it('用例11：未传 id 时应自动生成不重复的 id', function () {
      var a = Core.createItem(makeValid());
      var b = Core.createItem(makeValid());
      assert.isString(a.id);
      assert.notEqual(a.id, b.id);
    });
  });

  /* ======================================================
     三、searchItems —— 关键词搜索
     ====================================================== */
  describe('searchItems 关键词搜索', function () {
    var items = [
      makeItem({ id: '1', name: '校园一卡通', category: '证件卡类', location: '紫金园食堂' }),
      makeItem({ id: '2', name: '黑色无线耳机', category: '电子产品', location: '图书馆三楼', description: '带充电仓' }),
      makeItem({ id: '3', name: '宿舍钥匙', category: '钥匙门禁', location: '操场跑道' })
    ];

    it('用例12：空关键词应返回全部（且为新数组）', function () {
      var r = Core.searchItems(items, '');
      assert.lengthOf(r, 3);
      assert.notEqual(r, items); // 不修改原数组引用
    });

    it('用例13：按物品名称命中（支持部分匹配）', function () {
      var r = Core.searchItems(items, '一卡通');
      assert.lengthOf(r, 1);
      assert.equal(r[0].id, '1');
    });

    it('用例14：按地点、描述等其它字段也能命中', function () {
      assert.lengthOf(Core.searchItems(items, '图书馆'), 1); // 命中 location
      assert.lengthOf(Core.searchItems(items, '充电仓'), 1); // 命中 description
    });

    it('用例15：搜索不区分大小写，且无结果时返回空数组', function () {
      var data = [makeItem({ id: 'x', name: 'AirPods Pro' })];
      assert.lengthOf(Core.searchItems(data, 'airpods'), 1);
      assert.lengthOf(Core.searchItems(items, '不存在的关键词zzz'), 0);
    });

    it('用例16：关键词首尾空格应被忽略', function () {
      assert.lengthOf(Core.searchItems(items, '  一卡通  '), 1);
    });
  });

  /* ======================================================
     四、filterItems / sortItems / queryItems —— 筛选与排序
     ====================================================== */
  describe('filterItems / sortItems / queryItems 筛选与排序', function () {
    var items = [
      makeItem({ id: '1', type: 'lost', category: '电子产品', status: 'active', createdAt: 300 }),
      makeItem({ id: '2', type: 'found', category: '电子产品', status: 'resolved', createdAt: 100 }),
      makeItem({ id: '3', type: 'found', category: '生活用品', status: 'active', createdAt: 200 })
    ];

    it('用例17：按类型筛选（lost / found / all）', function () {
      assert.lengthOf(Core.filterItems(items, { type: 'lost' }), 1);
      assert.lengthOf(Core.filterItems(items, { type: 'found' }), 2);
      assert.lengthOf(Core.filterItems(items, { type: 'all' }), 3);
    });

    it('用例18：多条件组合筛选（类型 + 状态 + 类别）', function () {
      var r = Core.filterItems(items, { type: 'found', status: 'active', category: '生活用品' });
      assert.lengthOf(r, 1);
      assert.equal(r[0].id, '3');
    });

    it('用例19：默认按时间倒序（最新在前）', function () {
      var r = Core.sortItems(items, 'newest');
      assert.deepEqual(r.map(function (i) { return i.id; }), ['1', '3', '2']);
      var r2 = Core.sortItems(items, 'oldest');
      assert.deepEqual(r2.map(function (i) { return i.id; }), ['2', '3', '1']);
    });

    it('用例20：queryItems 组合搜索 + 筛选 + 排序', function () {
      var r = Core.queryItems(items, {
        keyword: '电子',
        filter: { status: 'active' },
        order: 'newest'
      });
      assert.lengthOf(r, 1);
      assert.equal(r[0].id, '1');
    });
  });

  /* ======================================================
     五、updateStatus / removeItem —— 状态更新与删除
     ====================================================== */
  describe('updateStatus / removeItem 状态更新与删除', function () {
    var items = [
      makeItem({ id: '1', status: 'active' }),
      makeItem({ id: '2', status: 'active' })
    ];

    it('用例21：更新指定 id 的状态为 resolved（不修改原数组）', function () {
      var r = Core.updateStatus(items, '1', 'resolved');
      assert.equal(r[0].status, 'resolved');
      assert.equal(r[1].status, 'active');
      assert.equal(items[0].status, 'active'); // 原数组保持不可变
    });

    it('用例22：非法状态值应被忽略，返回原列表', function () {
      var r = Core.updateStatus(items, '1', 'unknown-status');
      assert.equal(r, items);
    });

    it('用例23：删除指定 id，返回不含该条的新列表', function () {
      var r = Core.removeItem(items, '1');
      assert.lengthOf(r, 1);
      assert.equal(r[0].id, '2');
      assert.lengthOf(items, 2); // 原数组不变
    });
  });

  /* ======================================================
     六、getStats —— 统计
     ====================================================== */
  describe('getStats 数据统计', function () {

    it('用例24：正确统计总数 / 寻物 / 招领 / 进行中 / 已解决', function () {
      var items = [
        makeItem({ type: 'lost', status: 'active' }),
        makeItem({ type: 'found', status: 'active' }),
        makeItem({ type: 'found', status: 'resolved' })
      ];
      var s = Core.getStats(items);
      assert.deepEqual(s, { total: 3, lost: 1, found: 2, active: 2, resolved: 1 });
    });

    it('用例25：空列表统计应全部为 0', function () {
      assert.deepEqual(Core.getStats([]), { total: 0, lost: 0, found: 0, active: 0, resolved: 0 });
    });
  });

  /* ======================================================
     七、文案与工具函数
     ====================================================== */
  describe('文案与工具函数', function () {

    it('用例26：resolvedText 根据类型返回「已找到 / 已归还」', function () {
      assert.equal(Core.resolvedText('lost'), '已找到');
      assert.equal(Core.resolvedText('found'), '已归还');
      assert.equal(Core.resolvedText('other'), '已解决');
    });

    it('用例27：publisherRole 返回「失主 / 拾获者」', function () {
      assert.equal(Core.publisherRole('lost'), '失主');
      assert.equal(Core.publisherRole('found'), '拾获者');
    });

    it('用例28：timeAgo 相对时间文案正确', function () {
      var now = 1000 * 60 * 60 * 24 * 10; // 固定基准
      assert.equal(Core.timeAgo(now - 30 * 1000, now), '刚刚');
      assert.equal(Core.timeAgo(now - 5 * 60 * 1000, now), '5 分钟前');
      assert.equal(Core.timeAgo(now - 3 * 60 * 60 * 1000, now), '3 小时前');
      assert.equal(Core.timeAgo(now - 2 * 24 * 60 * 60 * 1000, now), '2 天前');
    });

    it('用例29：escapeHtml 转义脚本字符，防止 XSS', function () {
      var out = Core.escapeHtml('<script>alert("x")</script>');
      assert.notInclude(out, '<script>');
      assert.include(out, '&lt;script&gt;');
    });

    it('用例30：highlight 高亮关键词并保持 HTML 转义', function () {
      var out = Core.highlight('校园一卡通丢失', '一卡通');
      assert.include(out, '<mark>一卡通</mark>');
      var evil = Core.highlight('<img src=x onerror=alert(1)>', 'img');
      assert.notInclude(evil, '<img src=x');
    });
  });

  /* ======================================================
     八、seedItems —— 示例数据
     ====================================================== */
  describe('seedItems 示例数据', function () {

    it('用例31：应返回若干条结构完整的示例数据', function () {
      var seed = Core.seedItems(1000000);
      assert.isAtLeast(seed.length, 3);
      seed.forEach(function (it) {
        assert.property(it, 'id');
        assert.property(it, 'type');
        assert.property(it, 'name');
        assert.property(it, 'status');
        assert.include(['lost', 'found'], it.type);
      });
    });
  });

})();
