function initState(vm) {
  /** 用来保存当前组件中所有的watcher实例
   * 无论是使用vm.$watch注册的watcher实例还是使用
   * watch选项添加的watcher实例，都会添加到vm._watchers中
   */
  vm._watchers = [];
  var opts = vm.$options;
  if (opts.props) {
    initProps(vm, opts.props);
  }
  if (opts.methods) {
    initMethods(vm, opts.methods);
  }
  if (opts.data) {
    initData(vm);
  } else {
    observe((vm._data = {}), true /* asRootData */);
  }
  if (opts.computed) {
    initComputed(vm, opts.computed);
  }
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch);
  }
}
