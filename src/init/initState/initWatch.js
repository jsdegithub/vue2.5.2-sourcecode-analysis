/**
 *  initWatch方法的作用是将用户写的 watch 对象中的所有需要监听的属性
 *  都拿过来使用 $watch 方法进行监听一遍
 *  在$watcher方法中，会实现对属性的依赖收集，也就是实现了对属性的监听
 *
 */

function initWatch(vm, watch) {
  for (var key in watch) {
    var handler = watch[key];
    /**
     * watch:{
     *  a: [function handler1(){}, function handler2(){}]
     * }
     * watch:{
     *  a: ['handler1', 'handler2']
     * }
     *
     */
    if (Array.isArray(handler)) {
      for (var i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i]);
      }
    } else {
      createWatcher(vm, key, handler);
    }
  }
}

function createWatcher(vm, keyOrFn, handler, options) {
  /**
   * watch:{
   *  a: {
   *   handler: function handler1(){},
   *   deep: true
   *  }
   * }
   */
  // 如果handler是一个对象，那么就从对象中取出handler
  if (isPlainObject(handler)) {
    options = handler;
    handler = handler.handler;
  }
  /**
   * watch:{
   *  a: 'handler1'
   * }
   */
  // 如果handler是一个字符串，那么就从vm中取出对应的函数
  if (typeof handler === "string") {
    handler = vm[handler];
  }
  /**
   * watch:{
   *  a: function handler1(){}
   * }
   */
  return vm.$watch(keyOrFn, handler, options);
}
