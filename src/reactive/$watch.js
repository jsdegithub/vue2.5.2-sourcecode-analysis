// 将组件中的watcher书写形式转换为$watch的调用形式
function createWatcher(vm, keyOrFn, handler, options) {
  if (isPlainObject(handler)) {
    options = handler;
    handler = handler.handler;
  }
  if (typeof handler === "string") {
    handler = vm[handler];
  }
  return vm.$watch(keyOrFn, handler, options);
}

Vue.prototype.$watch = function (expOrFn, cb, options) {
  /** vm是当前vue实例 */
  var vm = this;
  /**
   * 这是在组件中使用watch的场景，如：
   * watch: {
   *   'a': {
   *     handler: function (val, oldVal) { ... },
   *     deep: true
   *   }
   * }
   * */
  if (isPlainObject(cb)) {
    return createWatcher(vm, expOrFn, cb, options);
  }
  /** 如果没传options，则赋予默认值{} */
  options = options || {};
  options.user = true;
  var watcher = new Watcher(vm, expOrFn, cb, options);
  if (options.immediate) {
    /**
     * 从源码中可以看出，immediate的调用阶段cb函数只能拿到newVal，
     * 所以immediate阶段 watch回调函数的oldVal将会是undefined
     */
    cb.call(vm, watcher.value);
  }
  return function unwatchFn() {
    watcher.teardown();
  };
};

/**
 * 以下是自己实现：
 * 实现思路：
 * 既然要监听变化，首要的事肯定是追踪变化，也就是依赖收集，如何依赖收集？
 * 答：new Watcher()
 * 所以$watche里要做的首要的便是 new Watcher。
 * 而 new watcher 需要4个参数： vm, expOrFn, cb, options，
 * vm肯定是调用$watch的vue实例，所以: var vm=this;
 * 最后还需要返回一个unWatch函数，所以需要watcher.tearDown, 所以new Watcher的实例需要被使用到,
 * 所以，需要：var watcher= new Watcher(vm, expOrFn, cb, options);
 * 这样基本的功能就完成了，但是别忘了还有一个 immediate，所以要有一个options.immediate的判断,
 * 在哪判断？想一想，既然cb函数需要newVal，那newVal正好在watcher上取得，
 * 所以就要放在new watcher的后面。另外cb里使用的this肯定是调用$watcher的vue实例，所以要将vm
 * 作为cb.call的第一个参数传入。
 * 最后我们可以再做个容错处理，当options为undefined时，为其赋一个默认值: {}, 在哪里做这一步？
 * 当然是在使用到options的代码行的前一行啦。
 * 总结：
 * $watch就是在内部执行的 new Watcher(), 只不过比new watcher()多了两点内容：
 * 1、unWatch
 * 2、immediate的判断
 */

Vue.prototype.$watch = function (expOrFn, cb, options) {
  var vm = this;

  options = options || {};

  var watcher = new Watcher(vm, expOrFn, cb, options);

  if (options.immediate) {
    cb.call(vm, watcher.value);
  }

  return function unwatchFn() {
    watcher.teardown();
  };
};
