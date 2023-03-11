function mountComponent(vm, el, hydrating) {
  vm.$el = el;
  /**
   * 在runtime-only版本中，若没有传render函数，那么就会将createEmptyVNode赋值给render
   * （createEmptyVNode方法会创建一个空的VNode），并且会在控制台打印警告信息。
   */
  if (!vm.$options.render) {
    vm.$options.render = createEmptyVNode;
    {
      /* istanbul ignore if */
      /**
       * 如果传了template，但没有传render函数，那么会在控制台打印警告信息：
       * 当前使用的是runtime-only版本，没有compiler，
       * 要么使用compiler-included版本，要么预编译模板为render函数。
       */
      if ((vm.$options.template && vm.$options.template.charAt(0) !== "#") || vm.$options.el || el) {
        warn(
          "You are using the runtime-only build of Vue where the template " +
            "compiler is not available. Either pre-compile the templates into " +
            "render functions, or use the compiler-included build.",
          vm
        );
      } else {
        /**
         * 如果既没有传template，也没有传render函数，那么会在控制台打印警告信息：
         * Failed to mount component: template or render function not defined.
         */
        warn("Failed to mount component: template or render function not defined.", vm);
      }
    }
  }
  callHook(vm, "beforeMount");

  var updateComponent;
  /* istanbul ignore if */
  if ("development" !== "production" && config.performance && mark) {
    updateComponent = function () {
      var name = vm._name;
      var id = vm._uid;
      var startTag = "vue-perf-start:" + id;
      var endTag = "vue-perf-end:" + id;

      mark(startTag);
      var vnode = vm._render();
      mark(endTag);
      measure("vue " + name + " render", startTag, endTag);

      mark(startTag);
      vm._update(vnode, hydrating);
      mark(endTag);
      measure("vue " + name + " patch", startTag, endTag);
    };
  } else {
    updateComponent = function () {
      vm._update(vm._render(), hydrating);
    };
  }

  /**
   * 这就是渲染Watcher，它的作用是在数据变化时重新执行updateComponent函数。
   * 问：什么是渲染Watcher？
   * 答：new Watcher时传入的expOrFn是updateComponent函数时，这个watcher就是渲染watcher。
   * 共有哪几种Watcher？
   * 1、渲染Watcher：在mountComponent中创建的watcher，
   * 它的作用是在数据变化时执行updateComponent函数。
   * 2、计算属性Watcher：在initComputed中创建的watcher，
   * 它的作用是在计算属性的依赖发生变化时执行计算属性的getter函数。
   * 3、用户Watcher：在$watch中创建的watcher，
   * 它的作用是在用户传入的回调函数中使用到的data发生变化时执行用户传入的回调函数。
   * 渲染watcher的响应原理：
   * 1、渲染watcher在创建时，会调用get方法，get方法中会先调用pushTarget将自己添加到Dep.target中，
   * 然后调用getter，对于渲染watcher来说，也就是调用updateComponent函数，在updateComponent函数中，
   * 会调用vm._render()方法，在_render中会读取所有模板中使用到的data，从而触发这些data的getter，
   * 从而将该渲染watcher添加到这些data的依赖列表中，这样就实现了渲染watcher的依赖收集。
   * 2、之后data更新会触发这些data的setter，从而触发这些数据依赖列表中收集的所有watcher的update方法，
   * 而渲染watcher就是其中之一，在update方法中会执行run方法，在run方法中，会调用get方法，在get方法中
   * 会执行getter方法，而渲染watcher的getter就是updateComponent，所以就会进行组件的重新渲染。
   */
  vm._watcher = new Watcher(vm, updateComponent, noop);
  hydrating = false;

  // manually mounted instance, call mounted on self
  // mounted is called for render-created child components in its inserted hook
  if (vm.$vnode == null) {
    vm._isMounted = true;
    callHook(vm, "mounted");
  }
  return vm;
}
