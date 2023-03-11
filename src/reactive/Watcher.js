var uid = 0;

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
// vm就是调用this.$watch的this
// expOrFn可以
/** 这个vm是从$watcher传递过来的，而$watcher上的vm是调用$watcher的vue实例 */
var Watcher = function Watcher(vm, expOrFn, cb, options) {
  // 将该watcher所属的vm实例赋值给该watcher实例的this.vm属性
  this.vm = vm;
  // 每一个watcher都会被推入到vm._watchers列表中，包括选项中的watch和$watcher中实例化的watcher
  // this就是该watcher实例
  vm._watchers.push(this);
  // options
  if (options) {
    // 转换成布尔值
    /** 注意这里没有immediate，因为immediate不是在这里处理的 */
    this.deep = !!options.deep;
    this.user = !!options.user;
    this.lazy = !!options.lazy;
    this.sync = !!options.sync;
  } else {
    // 如果没传options，则赋予默认值false
    this.deep = this.user = this.lazy = this.sync = false;
  }
  this.cb = cb;
  this.id = ++uid; // uid for batching
  this.active = true;
  this.dirty = this.lazy; // for lazy watchers
  /**
   * 这个deps列表存储了所有收集了该watcher的dep实例，而每一个dep实例又是为某个属性收集依赖，
   * 也就是说，这些属性中的任何一个发生变化，都会通知它自己的subs列表，而subs列表取出所有存储
   * 的watcher，调用watcher.update。
   *
   */
  this.deps = [];
  this.newDeps = [];
  this.depIds = new _Set();
  this.newDepIds = new _Set();
  this.expression = expOrFn.toString();
  // parse expression for getter
  if (typeof expOrFn === "function") {
    this.getter = expOrFn;
  } else {
    this.getter = parsePath(expOrFn);
    if (!this.getter) {
      this.getter = function () {};
      "development" !== "production" &&
        warn(
          'Failed watching path: "' +
            expOrFn +
            '" ' +
            "Watcher only accepts simple dot-delimited paths. " +
            "For full control, use a function instead.",
          vm
        );
    }
  }
  // lazy默认为false，所以默认执行 this.get()
  /**
   * 注意：
   * 当lazy为true，也就是computed的情况，
   * 此时在new watcher阶段，
   */
  this.value = this.lazy ? undefined : this.get();
};

/**
 * Evaluate the getter, and re-collect dependencies.
 */
Watcher.prototype.get = function get() {
  // 将当前 watcher 实例放到 Dep.target 上
  pushTarget(this);
  var value;
  var vm = this.vm;
  try {
    // 获取值，这时会触发属性的getter，从而将Dep.target收集到该属性的依赖列表
    /**
     * 第一个vm是给computed函数里的this用的，第二个vm是给parsePath(expOrFn)返回的函数用的，
     * 参照parthPath的返回值，它的入参是obj，其实就是vm
     * return function (obj) {
     *  for (var i = 0; i < segments.length; i++) {
     *  if (!obj) {
     *   return;
     *  }
     *  obj = obj[segments[i]];
     *  }
     * return obj;
     * };
     */
    /**
     * 这里我们需要注意一个点：
     * 当expOrFn是一个computed函数时，可能它是这样的：
     * computedData(){
     *  return this.a + this.b
     * }
     * 那么在调用this.getter.call(vm, vm)时，this.a和this.b都会被读取，
     * 这时pushTarget已经被执行，所以window.target是有值的，所以此时读取的任何data都会将
     * 当前的watcher实例收集进它的依赖列表，所以今后这些data有任何一个变动都会导致当前watcher调用
     * update方法更新视图，但这显然不是我们想要的，因为computed的最终值可能压根就没有发生变化，
     * 这个点正是后续vue版本修复的内容。
     */
    value = this.getter.call(vm, vm);
  } catch (e) {
    if (this.user) {
      handleError(e, vm, 'getter for watcher "' + this.expression + '"');
    } else {
      throw e;
    }
  } finally {
    // "touch" every property so they are all tracked as
    // dependencies for deep watching
    if (this.deep) {
      traverse(value);
    }
    // 收集完毕，将当前Dep.target弹出
    /**
     * 既然收集依赖完就popTarget了，那么组件watcher的依赖收集是怎么做的呢？
     * 首先，new Watcher的时候，会调用get方法，在get方法中，会调用pushTarget，
     * 之后会调用getter，而渲染watcher的getter是updateComponent，所以此时是执行updateComponent
     * 方法，而在执行updateComponent方法时，会读取所有模板中用到的data，并且对所有这些data进行new Watcher，
     * 此时会调用watcher.get方法，而watcher.get方法中又会调用pushTarget，将当前watcher实例放到Dep.target上，
     * 然后触发data的getter，将当前watcher实例收集进data的依赖列表
     */
    popTarget();
    this.cleanupDeps();
  }
  return value;
};

// the current target watcher being evaluated.
// this is globally unique because there could be only one
// watcher being evaluated at any time.
Dep.target = null;
var targetStack = [];

function pushTarget(_target) {
  if (Dep.target) {
    targetStack.push(Dep.target);
  }
  Dep.target = _target;
}

function popTarget() {
  Dep.target = targetStack.pop();
}

/**
 * Add a dependency to this directive.
 */
/**
 * addDep只在depend方法中使用过
 * Dep.prototype.depend = function depend () {
    if (Dep.target) {
      Dep.target.addDep(this);
    }
  };
 */
Watcher.prototype.addDep = function addDep(dep) {
  var id = dep.id;
  /** this是watcher实例 */
  if (!this.newDepIds.has(id)) {
    this.newDepIds.add(id);
    this.newDeps.push(dep);
    if (!this.depIds.has(id)) {
      dep.addSub(this);
    }
  }
};

/**
 * Clean up for dependency collection.
 */
Watcher.prototype.cleanupDeps = function cleanupDeps() {
  var this$1 = this;

  var i = this.deps.length;
  while (i--) {
    var dep = this$1.deps[i];
    if (!this$1.newDepIds.has(dep.id)) {
      dep.removeSub(this$1);
    }
  }
  var tmp = this.depIds;
  this.depIds = this.newDepIds;
  this.newDepIds = tmp;
  this.newDepIds.clear();
  tmp = this.deps;
  this.deps = this.newDeps;
  this.newDeps = tmp;
  this.newDeps.length = 0;
};

/**
 * Subscriber interface.
 * Will be called when a dependency changes.
 */
Watcher.prototype.update = function update() {
  /* istanbul ignore else */
  /** lazy与sync默认都为false，所以默认情况是执行queueWatcher(this) */
  if (this.lazy) {
    this.dirty = true;
  } else if (this.sync) {
    this.run();
  } else {
    queueWatcher(this);
  }
};

var MAX_UPDATE_COUNT = 100;
var queue = [];
var activatedChildren = [];
var has = {};
var circular = {};
var waiting = false;
var flushing = false;
var index = 0;
/**
 * Push a watcher into the watcher queue.
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 */
/**
 * 将一个观察者推入观察者队列。
 * 具有重复ID的任务将被跳过，除非它是在队列刷新时push。
 */
/**
 * 给watcher设定id的原因是：如果某个属性的watcher已经在待更新队列中，则不需要再重复添加，
 * 因为一个属性的watcher只需要执行一次就可以更新到该属性的最新值，而我们的代码中可能会涉及多次对
 * 同一个属性的重新赋值，所以需要对watcher进行去重。
 * 实际的dom更新执行时(微任务)，data早已是最新值，所以不需要使用watcher重复更新。
 */
function queueWatcher(watcher) {
  var id = watcher.id;
  // 如果watcher已经在队列中，则不再重复添加
  if (has[id] == null) {
    // 添加后，将has[id]置为true
    has[id] = true;
    // flushing默认为false，所以默认情况下，watcher将被推进队列
    if (!flushing) {
      queue.push(watcher);
    } else {
      // if already flushing, splice the watcher based on its id
      // if already past its id, it will be run next immediately.
      var i = queue.length - 1;
      while (i > index && queue[i].id > watcher.id) {
        i--;
      }
      queue.splice(i + 1, 0, watcher);
    }
    // queue the flush
    // waiting默认为false，所以默认情况下，flushSchedulerQueue将被推进nextTick
    if (!waiting) {
      waiting = true;
      nextTick(flushSchedulerQueue);
    }
  }
}

/**
 * Flush both queues and run the watchers.
 */
function flushSchedulerQueue() {
  flushing = true;
  var watcher, id;

  // Sort queue before flush.
  // This ensures that:
  // 1. Components are updated from parent to child. (because parent is always
  //    created before the child)
  // 2. A component's user watchers are run before its render watcher (because
  //    user watchers are created before the render watcher)
  // 3. If a component is destroyed during a parent component's watcher run,
  //    its watchers can be skipped.
  // 在刷新前对队列进行排序。
  // 这样可以保证:
  // 1.组件从父代更新到子代。(因为父组件总是先于子组件创建）。
  // 2.组件的 user watcher 在其 render watcher 之前运行（因为 user watcher 是先于 render watcher 创建的）。
  // 3.如果一个组件在父组件的 watcher 运行过程中被销毁，那么它的 watcher 可以被跳过。
  queue.sort(function (a, b) {
    return a.id - b.id;
  });

  // do not cache length because more watchers might be pushed
  // as we run existing watchers
  for (index = 0; index < queue.length; index++) {
    // 从队列中取出watcher
    watcher = queue[index];
    // 获取watcher的id（每一个watcher都有一个唯一的id）
    id = watcher.id;
    // 将has[id]置为null（因为执行完flushSchedulerQueue，id应该被置为空）
    has[id] = null;
    // 执行watcher的run方法
    watcher.run();
    // in dev build, check and stop circular updates.
    // watcher.run()执行完毕后，此时has[id]也被置为null，此时再次判断has[id]，若不为null，
    // 则说明该watcher再次处于更新队列中，使用对象circular记录循环次数为circular[id]，
    // 若超过 MAX_UPDATE_COUNT 次，说明出现无限更新循环。
    if (process.env.NODE_ENV !== "production" && has[id] != null) {
      circular[id] = (circular[id] || 0) + 1;
      if (circular[id] > MAX_UPDATE_COUNT) {
        warn(
          "You may have an infinite update loop " +
            (watcher.user
              ? 'in watcher with expression "' + watcher.expression + '"'
              : "in a component render function."),
          watcher.vm
        );
        break;
      }
    }
  }

  // keep copies of post queues before resetting state
  var activatedQueue = activatedChildren.slice();
  var updatedQueue = queue.slice();

  resetSchedulerState();

  // call component updated and activated hooks
  callActivatedHooks(activatedQueue);
  callUpdatedHooks(updatedQueue);

  // devtool hook
  /* istanbul ignore if */
  if (devtools && config.devtools) {
    devtools.emit("flush");
  }
}

/**
 * Scheduler job interface.
 * Will be called by the scheduler.
 */
/**
 * run函数中是怎么触发组件jian的更新的？
 * 1. 在组件的render函数中，会调用this._s(name)方法，这个方法会调用watcher的get方法
 * 2. watcher的get方法会调用getter方法，getter方法会调用pushTarget方法，将当前watcher
 *   添加到Dep.target中
 * 3. 在getter方法中，会调用this.data[name]，这个过程会触发属性的getter方法，这个getter方法
 *  会调用Dep.target.addDep(this)，将当前属性的dep添加到watcher的deps中
 */
Watcher.prototype.run = function run() {
  // 如果watcher处于激活状态，则执行watcher的get方法（调用tearDown方法会将active置为false）
  // 这个active主要是用来控制watcher的激活与禁用，给tearDown用的
  if (this.active) {
    // run方法的调用会触发watcher的get方法，从而触发属性的getter方法，这里就会重复收集依赖
    /**
     * 注意这个value是this.data中的最新data，也就是newVal。例子：
     * 如 this.name='jinshuo'，这个过程是同步的，下面的 var value = this.get() 获取的
     * 就是最新的name值 => 'jinshuo'
     */
    /**
     * 这里执行的get方法会在其内部调用getter，如果是渲染watcher，
     * 那么这个getter就是updateComponent方法，也就是说当watcher.run的watcher是渲染watcher时，
     * 这里执行get方法其实就是执行的updateComponent方法，从而触发组件的重新渲染。
     * 那么数据更新时，组件的watcher是怎么得到通知的呢？
     */
    /**
     * 组件watcher是怎么被收集到data的依赖列表中的呢？
     */
    var value = this.get();
    if (
      // 新旧值不相等，或者新值是对象或数组，或者deep为true
      value !== this.value ||
      // Deep watchers and watchers on Object/Arrays should fire even
      // when the value is the same, because the value may
      // have mutated.
      isObject(value) ||
      this.deep
    ) {
      // set new value
      var oldValue = this.value;
      // 将value（newVal）赋值给this.value(watcher实例的value)
      // 注意这并不会触发属性的setter方法，因为这个this.value是watcher实例的value，
      // 而不是响应式对象data中的value
      this.value = value;
      // user默认为false，所以默认情况下，this.cb.call(this.vm, value, oldValue)将被执行
      if (this.user) {
        try {
          this.cb.call(this.vm, value, oldValue);
        } catch (e) {
          handleError(e, this.vm, 'callback for watcher "' + this.expression + '"');
        }
      } else {
        /**
         * 这里就是执行我们在this.$watch中传入的回调函数，也是在这里传入了newVal和oldVal
         */
        this.cb.call(this.vm, value, oldValue);
      }
    }
  }
};

/**
 * Evaluate the value of the watcher.
 * This only gets called for lazy watchers.
 */
Watcher.prototype.evaluate = function evaluate() {
  this.value = this.get();
  this.dirty = false;
};

/**
 * Depend on all deps collected by this watcher.
 */
Watcher.prototype.depend = function depend() {
  var _this = this;

  /**
   * this.deps是计算属性中用到的所有状态的dep实例
   */
  var i = this.deps.length;
  while (i--) {
    /**
     * Dep.prototype.depend的作用是将Dep.target上的watcher实例
     * 添加到dep实例的依赖列表dep.subs中
     */
    _this.deps[i].depend();
  }
};

/**
 * Remove an item from an array
 */
function remove(arr, item) {
  if (arr.length) {
    var index = arr.indexOf(item);
    if (index > -1) {
      return arr.splice(index, 1);
    }
  }
}

/**
 * Remove self from all dependencies' subscriber list.
 */
Watcher.prototype.teardown = function teardown() {
  var _this = this;

  if (this.active) {
    // remove self from vm's watcher list
    // this is a somewhat expensive operation so we skip it
    // if the vm is being destroyed.
    if (!this.vm._isBeingDestroyed) {
      // 将当前watcher实例从vm实例的_watchers数组中移除
      // 这个this.vm就是调用this.$watch的this
      remove(this.vm._watchers, this);
    }
    var i = this.deps.length;
    while (i--) {
      _this.deps[i].removeSub(_this);
    }
    this.active = false;
  }
};
