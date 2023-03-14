//  模板编译得到的render函数是什么样的？如下：
function render(createElement) {
  return createElement(
    "div",
    {
      attrs: {
        id: "app",
      },
    },
    [createElement("h1", "Hello, World!"), createElement("p", "This is my first Vue app.")]
  );
}
