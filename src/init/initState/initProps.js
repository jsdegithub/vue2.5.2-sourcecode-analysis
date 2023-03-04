function initProps(vm, propsOptions) {
  var propsData = vm.$options.propsData || {};
  var props = (vm._props = {});
  // cache prop keys so that future props updates can iterate using Array
  // instead of dynamic object key enumeration.
  var keys = (vm.$options._propKeys = []);
  var isRoot = !vm.$parent;
  // root instance props should be converted
  observerState.shouldConvert = isRoot;
  var loop = function (key) {
    keys.push(key);
    /**
     * propsData是父组件提供的props数据，
     * propsOptions是子组件设置的props选项。
     */
    var value = validateProp(key, propsOptions, propsData, vm);
    /* istanbul ignore else */
    {
      var hyphenatedKey = hyphenate(key);
      if (isReservedAttribute(hyphenatedKey) || config.isReservedAttr(hyphenatedKey)) {
        warn('"' + hyphenatedKey + '" is a reserved attribute and cannot be used as component prop.', vm);
      }
      defineReactive(props, key, value, function () {
        if (vm.$parent && !isUpdatingChildComponent) {
          warn(
            "Avoid mutating a prop directly since the value will be " +
              "overwritten whenever the parent component re-renders. " +
              "Instead, use a data or computed property based on the prop's " +
              'value. Prop being mutated: "' +
              key +
              '"',
            vm
          );
        }
      });
    }
    // static props are already proxied on the component's prototype
    // during Vue.extend(). We only need to proxy props defined at
    // instantiation here.
    if (!(key in vm)) {
      proxy(vm, "_props", key);
    }
  };

  for (var key in propsOptions) loop(key);
  observerState.shouldConvert = true;
}

/**
 * propsData是父组件提供的props数据，
 * propsOptions是子组件设置的props选项。
 */
function validateProp(key, propOptions, propsData, vm) {
  var prop = propOptions[key];
  /** absent表示：这个在子组件中声明的key在不在父组件传递的props列表中 */
  var absent = !hasOwn(propsData, key);
  var value = propsData[key];
  // handle boolean props
  if (isType(Boolean, prop.type)) {
    /**
     * 如果父组件并没有向子组件传递该prop，且子组件中没有为该prop设置default值
     */
    if (absent && !hasOwn(prop, "default")) {
      value = false;
      /**
       * 如果父组件向子组件传递了该prop，
       * 但父组件是以 propName='propName'的形式传递的该prop，
       * 或者干脆直接以 <childComponent id='child' propName class='child'>
       * （联想checked就是这样，不传value默认为true）这样的形式传递的该prop，那么value的值就是true。
       */
      /**
       * 如果父组件并没有向子组件传递该prop，但是子组件中为该prop设置了default值，
       * 那么value的值就是子组件中为该prop设置的default值。
       */
    } else if (!isType(String, prop.type) && (value === "" || value === hyphenate(key))) {
      value = true;
    }
  }
  // check default value
  /** 如果在子组件中声明的prop，父组件并没有为其传递值 */
  if (value === undefined) {
    /** 获取prop的默认值 */
    value = getPropDefaultValue(vm, prop, key);
    // since the default value is a fresh copy,
    // make sure to observe it.
    var prevShouldConvert = observerState.shouldConvert;
    observerState.shouldConvert = true;
    /**
     * 将prop的默认值转换为响应式数据，所以当prop取默认值时，对prop的更改也会触发视图
     * 的响应式更新。
     */
    observe(value);
    observerState.shouldConvert = prevShouldConvert;
  }
  {
    assertProp(prop, key, value, vm, absent);
  }
  return value;
}

/**
 * Assert whether a prop is valid.
 */
function assertProp(prop, name, value, vm, absent) {
  /**
   * 如果子组件中对prop的要求是必须的，但是父组件并没有传递这个prop，
   * 那么就会在控制台打印出警告信息：Missing required prop: "xxx"
   */
  if (prop.required && absent) {
    warn('Missing required prop: "' + name + '"', vm);
    return;
  }
  /**
   * 如果子组件并没有要求该prop是必须的，且父组件也没有传递这个prop，
   * 而仅仅是在子组件中声明了这个prop，那么不会有任何警告信息。
   * 这种情况下，value的值就是undefined/null，所以在子组件中通过this.propName
   * 使用该prop时，会得到undefined/null。
   */
  if (value == null && !prop.required) {
    return;
  }
  /** 这个prop.type就是我们在子组件中定义的prop的类型 */
  var type = prop.type;
  /** 如果type没传，则取valid为true => 类型校验成功 */
  /** 如果type为true，也认为校验成功 */
  /**
   * 如果type传了，那么此时的type应该是一个原生的构造函数或是一个数组，
   * 里面的元素都是原生的构造函数，比如：String、Number、Boolean、Array、Object、Date、Function、Symbol，
   * 或者是自定义的构造函数，比如：Vue.component('child', { props: ['propName'] })中的child组件。
   * 那么此时valid取false
   *
   */
  var valid = !type || type === true;
  var expectedTypes = [];
  if (type) {
    if (!Array.isArray(type)) {
      type = [type];
    }
    /** 遍历type数组，当遍历完毕或valid为true时退出循环 */
    for (var i = 0; i < type.length && !valid; i++) {
      /**
       * assertType函数校验后会返回一个对象，该对象有两个属性valid和expectedType，
       * 前者表示是否校验成功，后者表示类型，例如：
       * {valid:true, expectedType: "Boolean"}。
       */
      var assertedType = assertType(value, type[i]);
      expectedTypes.push(assertedType.expectedType || "");
      valid = assertedType.valid;
    }
  }
  /**
   * 如果type数组遍历完毕，valid仍然为false，则说明父组件传递的prop类型在子组件该prop的type数组中
   * 没有找到，所以最终valid应该为false，此时断定校验失败，打印警告信息。
   */
  if (!valid) {
    warn(
      'Invalid prop: type check failed for prop "' +
        name +
        '".' +
        " Expected " +
        expectedTypes.map(capitalize).join(", ") +
        ", got " +
        toRawType(value) +
        ".",
      vm
    );
    /** 这里需要注意，类型校验失败后打印警告信息后，程序结束，不会再执行用户自定义的validator */
    return;
  }
  /** 获取用户自定义的validator */
  var validator = prop.validator;
  if (validator) {
    /**
     * 如果validator返回false（这个false是用户自定义的validator中返回的），
     * 则说明校验失败，打印警告信息 */
    if (!validator(value)) {
      warn('Invalid prop: custom validator check failed for prop "' + name + '".', vm);
    }
  }
}
