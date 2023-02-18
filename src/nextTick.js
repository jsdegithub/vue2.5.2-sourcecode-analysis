var callbacks = [];
var pending = false;

function flushCallbacks() {
  pending = false;
  var copies = callbacks.slice(0);
  callbacks.length = 0;
  for (var i = 0; i < copies.length; i++) {
    copies[i]();
  }
}

// Here we have async deferring wrappers using both micro and macro tasks.
// In < 2.4 we used micro tasks everywhere, but there are some scenarios where
// micro tasks have too high a priority and fires in between supposedly
// sequential events (e.g. #4521, #6690) or even between bubbling of the same
// event (#6566). However, using macro tasks everywhere also has subtle problems
// when state is changed right before repaint (e.g. #6813, out-in transitions).
// Here we use micro task by default, but expose a way to force macro task when
// needed (e.g. in event handlers attached by v-on).
var microTimerFunc;
var macroTimerFunc;
var useMacroTask = false;

// Determine (macro) Task defer implementation.
// Technically setImmediate should be the ideal choice, but it's only available
// in IE. The only polyfill that consistently queues the callback after all DOM
// events triggered in the same loop is by using MessageChannel.
/* istanbul ignore if */
// 判断是否原生支持 setImmediate
if (typeof setImmediate !== "undefined" && isNative(setImmediate)) {
  macroTimerFunc = function () {
    setImmediate(flushCallbacks);
  };
} else if (
  typeof MessageChannel !== "undefined" && // 若不原生支持setImmediate，则判断是否支持 MessageChannel
  (isNative(MessageChannel) ||
    // PhantomJS
    MessageChannel.toString() === "[object MessageChannelConstructor]")
) {
  var channel = new MessageChannel();
  var port = channel.port2;
  channel.port1.onmessage = flushCallbacks;
  macroTimerFunc = function () {
    port.postMessage(1);
  };
} else {
  //若连MessageChannel也不支持，则使用定时器代替
  /* istanbul ignore next */
  macroTimerFunc = function () {
    setTimeout(flushCallbacks, 0);
  };
}

// Determine MicroTask defer implementation.
// 判断是否原生支持 Promise
if (typeof Promise !== "undefined" && isNative(Promise)) {
  var p = Promise.resolve();
  microTimerFunc = function () {
    p.then(flushCallbacks);
    // in problematic UIWebViews, Promise.then doesn't completely break, but
    // it can get stuck in a weird state where callbacks are pushed into the
    // microtask queue but the queue isn't being flushed, until the browser
    // needs to do some other work, e.g. handle a timer. Therefore we can
    // "force" the microtask queue to be flushed by adding an empty timer.
    if (isIOS) {
      setTimeout(noop);
    }
  };
} else {
  // fallback to macro
  // 如果不支持 Promise，则使用宏任务
  microTimerFunc = macroTimerFunc;
}

/**
 * Wrap a function so that if any code inside triggers state change,
 * the changes are queued using a Task instead of a MicroTask.
 */
// 用于包装函数，使其在执行时，如果触发了状态变化，则使用宏任务来处理
function withMacroTask(fn) {
  return (
    fn._withTask ||
    (fn._withTask = function () {
      useMacroTask = true;
      var res = fn.apply(null, arguments);
      useMacroTask = false;
      return res;
    })
  );
}

// nextTick所做的就是将传入的cb回调函数放到微任务队列中
function nextTick(cb, ctx) {
  var _resolve;
  // 将传入的cb函数包装后，推入callbacks数组中
  callbacks.push(function () {
    if (cb) {
      try {
        cb.call(ctx);
      } catch (e) {
        handleError(e, ctx, "nextTick");
      }
    } else if (_resolve) {
      _resolve(ctx);
    }
  });
  if (!pending) {
    pending = true;
    // useMacroTask默认为false，所以默认使用微任务
    if (useMacroTask) {
      macroTimerFunc();
    } else {
      microTimerFunc(); // => Promise.resolve().then(flushCallbacks)
    }
  }
  // 如果不传cb，则返回一个Promise，等到包裹callbacks的函数执行完毕后，再resolve
  if (!cb && typeof Promise !== "undefined") {
    return new Promise(function (resolve) {
      _resolve = resolve;
    });
  }
}
