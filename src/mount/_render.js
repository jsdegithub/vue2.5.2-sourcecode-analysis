Vue.prototype._render = function () {
  var vm = this;
  var ref = vm.$options;
  var render = ref.render;
  var _parentVnode = ref._parentVnode;

  if (vm._isMounted) {
    // if the parent didn't update, the slot nodes will be the ones from
    // last render. They need to be cloned to ensure "freshness" for this render.
    for (var key in vm.$slots) {
      var slot = vm.$slots[key];
      if (slot._rendered) {
        vm.$slots[key] = cloneVNodes(slot, true /* deep */);
      }
    }
  }

  vm.$scopedSlots = (_parentVnode && _parentVnode.data.scopedSlots) || emptyObject;

  // set parent vnode. this allows render functions to have access
  // to the data on the placeholder node.
  vm.$vnode = _parentVnode;
  // render self
  var vnode;
  try {
    /**
     * 模板编译得到的render函数是什么样的？如下：
     * function render(createElement) {
     *   return createElement(
     *     'div',
     *     {
     *       attrs: {
     *         id: 'app'
     *       }
     *     },
     *     [
     *       createElement('h1', 'Hello, World!'),
     *       createElement('p', 'This is my first Vue app.')
     *     ]
     *   )
     * }
     */
    vnode = render.call(vm._renderProxy, vm.$createElement);
  } catch (e) {
    handleError(e, vm, "render");
    // return error render result,
    // or previous vnode to prevent render error causing blank component
    /* istanbul ignore else */
    {
      if (vm.$options.renderError) {
        try {
          vnode = vm.$options.renderError.call(vm._renderProxy, vm.$createElement, e);
        } catch (e) {
          handleError(e, vm, "renderError");
          vnode = vm._vnode;
        }
      } else {
        vnode = vm._vnode;
      }
    }
  }
  // return empty vnode in case the render function errored out
  if (!(vnode instanceof VNode)) {
    if ("development" !== "production" && Array.isArray(vnode)) {
      warn(
        "Multiple root nodes returned from render function. Render function " + "should return a single root node.",
        vm
      );
    }
    vnode = createEmptyVNode();
  }
  // set parent
  vnode.parent = _parentVnode;
  return vnode;
};
