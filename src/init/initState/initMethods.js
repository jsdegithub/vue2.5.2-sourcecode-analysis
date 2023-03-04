function initMethods(vm, methods) {
  var props = vm.$options.props;
  for (var key in methods) {
    {
      /** 检查methods中的某个方法名对应的实际引用是否为空 */
      if (methods[key] == null) {
        warn(
          'Method "' +
            key +
            '" has an undefined value in the component definition. ' +
            "Did you reference the function correctly?",
          vm
        );
      }
      /** 检查methods中的方法名是否与props中的属性名重复 */
      if (props && hasOwn(props, key)) {
        warn('Method "' + key + '" has already been defined as a prop.', vm);
      }
      /** 检查methods中的方法名是否与Vue实例上的保留方法名重复 */
      if (key in vm && isReserved(key)) {
        warn(
          'Method "' +
            key +
            '" conflicts with an existing Vue instance method. ' +
            "Avoid defining component methods that start with _ or $."
        );
      }
    }
    /** 将methods中的方法绑定到Vue实例上 */
    /**
     * 注意这里的 bind(methods[key], vm)，从这里就可以看出methods中的this被绑定为当前vm实例，
     * 所以这就解释了为什么在methods方法中可以直接使用this来访问vm实例上的各种属性和方法。
     */
    vm[key] = methods[key] == null ? noop : bind(methods[key], vm);
  }
}
