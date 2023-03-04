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
