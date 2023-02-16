Vue.prototype.$watch = function (
  expOrFn,
  cb,
  options
) {
  /** vm是当前vue实例 */
  var vm = this;
  if (isPlainObject(cb)) {
    return createWatcher(vm, expOrFn, cb, options)
  }
  /** 如果没传options，则赋予默认值{} */
  options = options || {};
  options.user = true;
  var watcher = new Watcher(vm, expOrFn, cb, options);
  if (options.immediate) {
    cb.call(vm, watcher.value);
  }
  return function unwatchFn () {
    watcher.teardown();
  }
};
