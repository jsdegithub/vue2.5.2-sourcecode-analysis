function Vue$3(options) {
  if ("development" !== "production" && !(this instanceof Vue$3)) {
    warn("Vue is a constructor and should be called with the `new` keyword");
  }
  this._init(options);
}
