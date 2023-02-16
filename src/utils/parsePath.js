/**
 * Parse simple path.
 */
/** 不匹配 数字、字母、下划线、点号 和 $符号  */
var bailRE = /[^\w.$]/;
function parsePath(path) {
  /** 如果是除了 数字、字母、下划线、点号 和 $ 之外的特殊字符，直接返回。  */
  if (bailRE.test(path)) {
    return;
  }
  var segments = path.split(".");
  return function (obj) {
    for (var i = 0; i < segments.length; i++) {
      if (!obj) {
        return;
      }
      obj = obj[segments[i]];
    }
    return obj;
  };
}
