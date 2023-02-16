function defineReactive(obj, key, val, customSetter, shallow) {
  /** 用于对象收集依赖  */
  var dep = new Dep();

  /** 获取obj[key]的属性描述符  */
  var property = Object.getOwnPropertyDescriptor(obj, key);
  if (property && property.configurable === false) {
    return;
  }

  // cater for pre-defined getter/setters
  /** 获取obj[key]的getter、setter  */
  /** 没有被defineProperty处理过的对象属性是没有getter和setter的
   * */
  var getter = property && property.get;
  var setter = property && property.set;

  /** 如果val不是对象类型 或 是VNode实例，observe将直接return。*/
  /** 若val是数组，observe将进行new Observer(val)  */
  /** 在Observer中，若val为数组类型，则执行如下代码：
   * if (Array.isArray(value)) {
        var augment = hasProto ? protoAugment : copyAugment;
        augment(value, arrayMethods, arrayKeys);
        this.observeArray(value);
      }
    *其中，protoAugment方法对数组方法进行拦截，实现了对数组变动的监听。
    */
  var childOb = !shallow && observe(val);

  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter() {
      /** 如果getter不存在，就直接从val取值 */
      var value = getter ? getter.call(obj) : val;
      if (Dep.target) {
        dep.depend();
        /** 虽然对象在这一步重复收集了依赖，但是在setter中只触发dep.notify，并不会触发在这步多收集的依赖 */
        /** 只有在数组的7种方法中才会触发这一步收集到childOb.dep上的依赖 */
        if (childOb) {
          childOb.dep.depend();
          if (Array.isArray(value)) {
            dependArray(value);
          }
        }
      }
      return value;
    },
    set: function reactiveSetter(newVal) {
      var value = getter ? getter.call(obj) : val;
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return;
      }
      /* eslint-enable no-self-compare */
      /** 只有在开发环境下才有可能执行customSetter */
      if ("development" !== "production" && customSetter) {
        customSetter();
      }
      if (setter) {
        setter.call(obj, newVal);
      } else {
        val = newVal;
      }
      childOb = !shallow && observe(newVal);
      /** 通知watcher调用update方法更新页面 */
      dep.notify();
    },
  });
}
