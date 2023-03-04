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
    cb.call(vm, watcher.value);
  }
  return function unwatchFn() {
    watcher.teardown();
  };
};
