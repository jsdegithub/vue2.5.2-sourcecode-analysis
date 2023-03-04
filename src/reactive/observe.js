/**
 * By default, when a reactive property is set, the new value is
 * also converted to become reactive. However when passing down props,
 * we don't want to force conversion because the value may be a nested value
 * under a frozen data structure. Converting it would defeat the optimization.
 */
 var observerState = {
  shouldConvert: true,
};

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
function observe(value, asRootData) {
  /** 如果不是对象类型 或 是VNode实例，直接返回。*/
  if (!isObject(value) || value instanceof VNode) {
    return;
  }
  var ob;
  /** 如果value上已被定义__ob__这个私有的不可枚举属性，说明value已经是响应式，则直接将__ob__赋值给ob  */
  if (hasOwn(value, "__ob__") && value.__ob__ instanceof Observer) {
    ob = value.__ob__;
  } else if (
    observerState.shouldConvert &&
    !isServerRendering() &&
    /** 如果是数组或普通对象  */
    (Array.isArray(value) || isPlainObject(value)) &&
    /** Object.isExtensible() 方法判断一个对象是否是可扩展的（是否可以在它上面添加新的属性）  */
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    /** 如果value还没有被响应化，那么将其转化为响应式数据  */
    ob = new Observer(value);
  }
  if (asRootData && ob) {
    ob.vmCount++;
  }
  return ob;
}

function isObject(obj) {
  return obj !== null && typeof obj === "object";
}

/**
 * Check whether the object has the property.
 */
var hasOwnProperty = Object.prototype.hasOwnProperty;
function hasOwn(obj, key) {
  return hasOwnProperty.call(obj, key);
}
// [].hasOwnProperty('length') => true
// ({}).hasOwnProperty('__proto__') => false //__proto__是继承属性

/**判断是否是普通对象 */
function isPlainObject(obj) {
  return _toString.call(obj) === "[object Object]";
}
