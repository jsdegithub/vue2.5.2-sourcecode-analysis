function initMethods(vm, methods) {
  var props = vm.$options.props;
  for (var key in methods) {
    {
      if (methods[key] == null) {
        warn(
          'Method "' +
            key +
            '" has an undefined value in the component definition. ' +
            "Did you reference the function correctly?",
          vm
        );
      }
      if (props && hasOwn(props, key)) {
        warn('Method "' + key + '" has already been defined as a prop.', vm);
      }
      if (key in vm && isReserved(key)) {
        warn(
          'Method "' +
            key +
            '" conflicts with an existing Vue instance method. ' +
            "Avoid defining component methods that start with _ or $."
        );
      }
    }
    vm[key] = methods[key] == null ? noop : bind(methods[key], vm);
  }
}
