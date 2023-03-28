Vue.cid = 0;
var cid = 1;

/**
 * 这个extendOptions就是我们定义的.vue组件中的options
 *
 */
Vue.extend = function (extendOptions) {
  extendOptions = extendOptions || {};
  var Super = this;
  var SuperId = Super.cid;

  var cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {});
  if (cachedCtors[SuperId]) {
    return cachedCtors[SuperId];
  }

  var name = extendOptions.name || Super.options.name;
  {
    if (!/^[a-zA-Z][\w-]*$/.test(name)) {
      warn(
        'Invalid component name: "' +
          name +
          '". Component names ' +
          "can only contain alphanumeric characters and the hyphen, " +
          "and must start with a letter."
      );
    }
  }

  /**
   * 这个options并不是我们定义的.vue组件中的options
   */
  var Sub = function VueComponent(options) {
    /**
     * 在创建新的组件实例时，在_init中会进行options合并，options为空：
     * vm.$options = mergeOptions(resolveConstructorOptions(vm.constructor), options || {}, vm);
     * 这里的vm.constructor就是Sub, 这句的最终结果是 => mergeOptions(Sub.options, options || {}, vm);
     * 而Sub.options= mergeOptions(Vue.options, extendOptions),所以组件实例的最终options就是Sub.options,
     * 所以当我们定义组件时,不能将data写成对象,否则不同的组件实例将共用同一个data对象。
     */
    this._init(options);
  };
  Sub.prototype = Object.create(Super.prototype);
  Sub.prototype.constructor = Sub;
  Sub.cid = cid++;
  Sub.options = mergeOptions(Super.options, extendOptions);
  Sub["super"] = Super;

  // For props and computed properties, we define the proxy getters on
  // the Vue instances at extension time, on the extended prototype. This
  // avoids Object.defineProperty calls for each instance created.
  if (Sub.options.props) {
    initProps$1(Sub);
  }
  if (Sub.options.computed) {
    initComputed$1(Sub);
  }

  // allow further extension/mixin/plugin usage
  Sub.extend = Super.extend;
  Sub.mixin = Super.mixin;
  Sub.use = Super.use;

  // create asset registers, so extended classes
  // can have their private assets too.
  ASSET_TYPES.forEach(function (type) {
    Sub[type] = Super[type];
  });
  // enable recursive self-lookup
  if (name) {
    Sub.options.components[name] = Sub;
  }

  // keep a reference to the super options at extension time.
  // later at instantiation we can check if Super's options have
  // been updated.
  Sub.superOptions = Super.options;
  Sub.extendOptions = extendOptions;
  Sub.sealedOptions = extend({}, Sub.options);

  // cache constructor
  cachedCtors[SuperId] = Sub;

  return Sub;
};
