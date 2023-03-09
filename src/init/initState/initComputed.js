var computedWatcherOptions = { lazy: true };

/** 这个vm就是组件实例 */
function initComputed(vm, computed) {
  var watchers = (vm._computedWatchers = Object.create(null));
  // computed properties are just getters during SSR
  var isSSR = isServerRendering();

  for (var key in computed) {
    var userDef = computed[key];
    /**
     * computed类型定义：{ [key: string]: Function | { get: Function, set: Function } }
     * 1. 如果computed选项中的属性值是一个函数，那么getter就是这个函数
     * 2. 如果computed选项中的属性值是一个对象，那么getter就是这个对象的get属性
     */
    var getter = typeof userDef === "function" ? userDef : userDef.get;
    if ("development" !== "production" && getter == null) {
      warn('Getter is missing for computed property "' + key + '".', vm);
    }

    if (!isSSR) {
      // create internal watcher for the computed property.
      /**
       * 新new出来的watcher将会被getter中用到的data的依赖列表收集。
       * 也就是说，在new Watcher的时候，computed watcher就已经被添加到了computed data依赖项
       * 的依赖列表中(准确说并不是new watcher时就添加了，而是第一次读取computed值时)。
       */
      watchers[key] = new Watcher(vm, getter || noop, noop, computedWatcherOptions);
    }

    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    if (!(key in vm)) {
      defineComputed(vm, key, userDef);
    } else {
      /**
       * 注意这里只处理了computed和props以及data重名时的情况，
       * 并没有处理computed和methods重名的情况，所以当computed和methods重名时，
       * vuejs不会给出任何警告，所以此时computed会在没有任何告警的情况下失效，
       * 我们在使用的时候应该尽量避免这种情况。
       */
      if (key in vm.$data) {
        warn('The computed property "' + key + '" is already defined in data.', vm);
      } else if (vm.$options.props && key in vm.$options.props) {
        warn('The computed property "' + key + '" is already defined as a prop.', vm);
      }
    }
  }
}

/** 这是一个默认的存取描述符 */
var sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop,
};

/** 这个target就是组件实例 */
function defineComputed(target, key, userDef) {
  /** shouldCache的初始值是true */
  var shouldCache = !isServerRendering();
  if (typeof userDef === "function") {
    sharedPropertyDefinition.get = shouldCache ? createComputedGetter(key) : userDef;
    sharedPropertyDefinition.set = noop;
  } else {
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : userDef.get
      : noop;
    sharedPropertyDefinition.set = userDef.set ? userDef.set : noop;
  }
  if ("development" !== "production" && sharedPropertyDefinition.set === noop) {
    sharedPropertyDefinition.set = function () {
      warn('Computed property "' + key + '" was assigned to but it has no setter.', this);
    };
  }
  Object.defineProperty(target, key, sharedPropertyDefinition);
}

function createComputedGetter(key) {
  return function computedGetter() {
    var watcher = this._computedWatchers && this._computedWatchers[key];
    if (watcher) {
      /**
       * 当计算属性中的内容发生变化后，计算属性的Watcher与组件的Watcher都会得到通知。
       * 计算属性的Watcher会将自己的dirty属性设置为true，当下一次读取计算属性时，就会
       * 重新计算一次值。然后组件的Watcher也会得到通知，从而执行render函数进行重新渲染的操作。
       * 由于要重新执行render函数，所以会重新读取计算属性的值，这时候计算属性的Watcher已经把
       * 自己的dirty属性设置为true，所以会重新计算一次计算属性的值，用于本次渲染。
       */
      /**
       * Watcher.prototype.update = function update() {
       *  //这里需要注意：computedWatcherOptions = { lazy: true }，
       *  //this.lazy为true，所以会执行这里的代码将dirty置为true，
       *  //也就是说，只要computed属性的watcher.update被调用，dirty就会被置为true，
       *  //等到watcher.evaluate调用完毕后，dirty会被置为false。
       *  if (this.lazy) {
       *     this.dirty = true;
       *   } else if (this.sync) {
       *     this.run();
       *   } else {
       *     queueWatcher(this);
       *   }
       * };
       */
      /**
       * evaluate调用时会调用watcher.get，而watcher.get会调用pushTarget,
       * pushTarget会将当前watcher挂到Dep.target上，然后读取value，触发getter，
       * 进行依赖收集后，会调用popTarget弹出当前watcher。
       */
      if (watcher.dirty) {
        watcher.evaluate();
      }
      /**
       * 疑问：这个Dep.target是哪个watcher?
       * 注意：这个watcher并不是上一步中的watcher, 而应该是上一步中
       * watcher.evaluate调用后从targetStack中pop出来的watcher，
       * 这个watcher其实就是组件的渲染watcher。
       */
      if (Dep.target) {
        /**
         * 令所有收集了此watcher的dep实例调用depend方法，将Dep.target也收集到其依赖列表中
         * 为什么要这么做？
         * 因为computed并没有setter，他没有通知变更重新渲染的能力，但是它的依赖有setter能
         * 通知组件数据已变更，从而触发重新渲染，所以要借助computed的依赖来实现computed变更
         * 后的界面的响应式更新。
         */
        watcher.depend();
      }
      return watcher.value;
    }
  };
}
