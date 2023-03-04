function initData(vm) {
  var data = vm.$options.data;
  data = vm._data = typeof data === "function" ? getData(data, vm) : data || {};
  /** 如果data不是一个普通对象，给出警告 */
  if (!isPlainObject(data)) {
    data = {};
    "development" !== "production" &&
      warn(
        "data functions should return an object:\n" +
          "https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function",
        vm
      );
  }
  // proxy data on instance
  var keys = Object.keys(data);
  var props = vm.$options.props;
  var methods = vm.$options.methods;
  var i = keys.length;
  while (i--) {
    var key = keys[i];
    {
      /** 检查data中的某个属性是否与现有的某个method重名 */
      if (methods && hasOwn(methods, key)) {
        warn('Method "' + key + '" has already been defined as a data property.', vm);
      }
    }
    /** 检查data中的某个属性是否与props中的某个属性重名 */
    if (props && hasOwn(props, key)) {
      "development" !== "production" &&
        warn('The data property "' + key + '" is already declared as a prop. ' + "Use prop default value instead.", vm);
    } else if (!isReserved(key)) {
      /** 将data中的属性代理到vm实例上 */
      proxy(vm, "_data", key);
    }
  }
  // observe data
  /** 将data中的属性转换为响应式数据 */
  observe(data, true /* asRootData */);
}
