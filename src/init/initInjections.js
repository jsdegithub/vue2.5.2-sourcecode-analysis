/**
 * By default, when a reactive property is set, the new value is
 * also converted to become reactive. However when passing down props,
 * we don't want to force conversion because the value may be a nested value
 * under a frozen data structure. Converting it would defeat the optimization.
 */
/** observerState是个全局对象，observerState.shouldConvert用来控制数据是否应该被转换为响应式。
 */
/**
 * 提示：provide 和 inject 绑定并不是可响应的。这是刻意为之的。然而，如果你传入了一个可监听的对象，
 * 那么其对象的 property 还是可响应的。
 * 通过控制observerState.shouldConvert，做的事情仅仅是让defineReactive函数不再将一个对象的属性
 * 转换为响应式，而若一个injections的属性本来就是响应式的，那么即使设置了observerState.shouldConvert
 * 为false，该属性将仍然是响应式的。
 */
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

/** 调用resolveInject时，传入的vm是当前实例（即使用injections的子组件，而不是提供provide的父组件）  */
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
      /**
       * 最开始source等于当前组件实例，如果原始属性在source的_provided中能找到对应的值，
       * 那么将其设置到result中，并使用break跳出循环。否则，将source设置为父组件实例进行
       * 下一轮循环，以此类推。
       */
      /**
       * 注意当父组件使用provide注入内容时，其实是将内容注入到当前组件实例的_provided中，
       * 所以inject可以从父组件实例的_provided中获取注入的内容。通过这样的方式，
       * 最终会在祖先组件中搜索到inject中设置的所有属性的内容。
       */
      var source = vm;
      while (source) {
        if (source._provided && provideKey in source._provided) {
          result[key] = source._provided[provideKey];
          break;
        }
        source = source.$parent;
      }
      /**
       * 如果循环结束后，source仍然为null，那么说明没有找到对应的值，那么就使用default属性
       * 作为默认值，如果default属性也不存在，那么就报错。
       */
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
