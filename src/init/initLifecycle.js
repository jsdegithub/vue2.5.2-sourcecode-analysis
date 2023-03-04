/** vm是当前vue实例  */
function initLifecycle(vm) {
  var options = vm.$options;

  // locate first non-abstract parent
  /** 查找第一个非抽象的父组件 */
  var parent = options.parent;
  /** 如果当前组件不是抽象组件并且存在父级  */
  if (parent && !options.abstract) {
    while (parent.$options.abstract && parent.$parent) {
      parent = parent.$parent;
    }
    parent.$children.push(vm);
  }

  /** $parent即为当前vm实例的第一个非抽象父组件 */
  vm.$parent = parent;
  /** $root取自父组件，若当前vm实例没有parent，则说明自己就是$root，即自己就是根组件  */
  vm.$root = parent ? parent.$root : vm;

  vm.$children = [];
  vm.$refs = {};

  vm._watcher = null;
  vm._inactive = null;
  vm._directInactive = false;
  vm._isMounted = false;
  vm._isDestroyed = false;
  vm._isBeingDestroyed = false;
}
