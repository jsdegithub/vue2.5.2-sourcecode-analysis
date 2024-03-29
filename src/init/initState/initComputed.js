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
      /**
       * 当computed data被首次读取时，一定是在updateComponent中读取的
       * （
       * 此时Dep.target是组件的渲染watcher => 为什么？
       * 因为updateComponent执行时，它是作为new Watcher时调用get时的getter执行的，而在getter
       * 执行前，有一步pushTarget已经将当前组件的渲染watcher推到Dep.target上，所以updateComponent
       * 执行时，Dep.target是渲染watcher。此时: watcherStack=[]，Dep.target=渲染watcher
       * ），
       * 此时先判断watcher.dirty，初始时watcher.dirty为true, 所以会执行watcher.evaluate，
       * evaluate中会执行get（注意这是第一次执行get，因为computed data在
       * new Watcher时会因为lazy值为true而不执行get），在get中：
       * ==============================================================================
       * 1、pushTarget将当前computed watcher推入watcherStack;
       * 此时: watcherStack=[渲染watcher]，Dep.target=computedWatcher
       * 2、调用getter也就是computed函数获取computed值，但由于调用computed函数又会读取其中依赖
       * 的data，所以会触发这些依赖的getter，从而将当前computed watcher收集进它们的依赖列表中，
       * 这样当后续依赖的data发生变化时，就会通知到computed watcher, computed watcher调用其
       * update方法，在update方法中设置dirty为true, 这样当再次读取computed值时，由于dirty为
       * true，所以就会触发watcher.evaluate重新计算；
       * 3、读取完毕后再调用popTarget将computed watcher弹出，
       * 此时: watcherStack=[]，Dep.target=渲染watcher
       * ==============================================================================
       * get调用完毕后，evaluate会将watcher.dirty又置为false, 这样后续data没变动时读取computed
       * 将直接返回缓存值。
       */
      /**
       * Dep.target就是渲染watcher，所以在这里会将渲染watcher收集到
       * 所有computed data依赖的data的dep.subs中，也就是该data的依赖列表中。
       * 注：当data变化时，先通知computedWatcher调用update变更dirty为true;
       * 再通知渲染watcher重新读取computed值，并更新页面。
       */
      if (Dep.target) {
        /**
         * 令所有收集了此watcher的dep实例（其实就是computed的几个依赖项的dep）调用depend方法，
         * 将Dep.target也收集到其依赖列表中（注意：这个Dep.target就是渲染watcher）。
         */
        /**
         * 特殊情况：当computed嵌套computed时，假设computed1还依赖着computed2，而computed2依赖
         * 属性a。
         * 那么当computed1被访问时，触发computed1的computtedGetter，在computtedGetter中会调用
         * watcher.evaluate方法，而evaluate方法会调用watcher.get,get会将computed1的watcher推
         * 入stack中，然后调用getter(就是computed1函数)，由于computed1依赖computed2，所以又会触
         * 发computed2的computtedGetter，在computed2的computtedGetter中，又会调用get方法，将
         * computed2的watcher推入stack中，然后调用getter(也就是computed2函数)，由于computed2依
         * 赖a，所以会读取a，此时a的getter被触发，所以a会将当前的Dep.target放入依赖列表
         * （就是computed2的watcher）,最后popTarget将computed2的watcher弹出stack，此时evaluate
         * 调用完毕，然后是if(Dep.target){ watcher.depend() }, 注意此时Dep.target是computed1的
         * watcher,而watcher.depend的watcher则是computed2的watcher,这一句的作用就是让收集了
         * computed2 watcher的所有属性再将computed1 watcher收集进它们的依赖列表中，这样，computed2
         * 的依赖就已经收集了computed2 watcher和computed1 watcher。此时，computed1的getter执行完毕。
         * 接下来，回到computed1的popTarget阶段，弹出computed1 watcher, 这样computed1的evaluate
         * 也执行完毕，进入到if(Dep.target){ watcher.depend() }, 注意此时Dep.target是组件的
         * 渲染watcher,而watcher.depend的watcher则是computed1的watcher,这一句的作用就是让收集了
         * computed1 watcher的所有属性再将组件的渲染watcher收集进它们的依赖列表中，这样，computed2的
         * 依赖就已经收集了computed2 watcher、computed1 watcher和组件的渲染watcher;
         * 这样当后续computed2的依赖变动时，他会将computed2、computed1的dirty置为true，最后调用组件
         * 渲染watcher的update方法，读取最新的computed2、computed1的值，渲染最新的页面。
         */
        watcher.depend();
      }
      return watcher.value;
    }
  };
}
