/**
 * By default, when a reactive property is set, the new value is
 * also converted to become reactive. However when passing down props,
 * we don't want to force conversion because the value may be a nested value
 * under a frozen data structure. Converting it would defeat the optimization.
 */
/** observerState是个全局对象，observerState.shouldConvert用来控制数据是否应该被转换为响应式  */
var observerState = {
  shouldConvert: true,
};

function initInjections(vm) {
  /** resolveInject函数的作用是通过用户配置的inject，自底向上搜索可用的注入内容，并将搜索结果返回  */
  var result = resolveInject(vm.$options.inject, vm);
  /** 如果有可用的注入内容，就把它们挂载到当前vm实例上，这样，就可以直接使用this.xxx调用了  */
  if (result) {
    observerState.shouldConvert = false;
    Object.keys(result).forEach(function (key) {
      /* istanbul ignore else */
      {
        defineReactive(vm, key, result[key], function () {
          warn(
            "Avoid mutating an injected value directly since the changes will be " +
              "overwritten whenever the provided component re-renders. " +
              'injection being mutated: "' +
              key +
              '"',
            vm
          );
        });
      }
    });
    observerState.shouldConvert = true;
  }
}

function resolveInject(inject, vm) {
  if (inject) {
    // inject is :any because flow is not smart enough to figure out cached
    var result = Object.create(null);
    var keys = hasSymbol
      ? Reflect.ownKeys(inject).filter(function (key) {
          /* istanbul ignore next */
          return Object.getOwnPropertyDescriptor(inject, key).enumerable;
        })
      : Object.keys(inject);

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var provideKey = inject[key].from;
      var source = vm;
      while (source) {
        if (source._provided && provideKey in source._provided) {
          result[key] = source._provided[provideKey];
          break;
        }
        source = source.$parent;
      }
      if (!source) {
        if ("default" in inject[key]) {
          var provideDefault = inject[key].default;
          result[key] = typeof provideDefault === "function" ? provideDefault.call(vm) : provideDefault;
        } else {
          warn('Injection "' + key + '" not found', vm);
        }
      }
    }
    return result;
  }
}
