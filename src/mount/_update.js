Vue.prototype._update = function (vnode, hydrating) {
  var vm = this;
  if (vm._isMounted) {
    callHook(vm, "beforeUpdate");
  }
  var prevEl = vm.$el;
  var prevVnode = vm._vnode;
  var prevActiveInstance = activeInstance;
  activeInstance = vm;
  vm._vnode = vnode;
  // Vue.prototype.__patch__ is injected in entry points
  // based on the rendering backend used.

  /**
   * 组件的初始挂载流程
    _update.js
    Vue.prototype._update = function (vnode, hydrating) {
      var vm = this;
      var prevVnode = vm._vnode;
      vm._vnode = vnode;
      if (!prevVnode) {
        // initial render
        vm.$el = vm.__patch__(
          vm.$el,
          vnode,
          hydrating,
          false,
          vm.$options._parentElm,
          vm.$options._refElm
        );
        // no need for the ref nodes after initial patch
        // this prevents keeping a detached DOM tree in memory (#5851)
        vm.$options._parentElm = vm.$options._refElm = null;
      } else {
        // updates
        vm.$el = vm.__patch__(prevVnode, vnode);
      }
    };

    根据 _update.js可知：初始渲染时，prevVnode为空，所以执行 if(!prevVnode) 语句中的逻辑；

    patch.js
    function patch(oldVnode, vnode){
      if(!oldVnode){
        return createElm(vnode)
      }
      const isRealElement=oldVNode.nodeType
      if(isRealElement){
        const elm=oldVNode
        const parentElm=elm.parentNode
        let newElm=createElm(vnode)
        parentElm.insertBefore(newElm, elm.nextSibling)
        parentElm.removeChild(elm)
        return newElm
      }else{
        return patchVnode(oldVNode, vnode)
      }
    }

    由patch.js可知：当oldVnode为空时，走if(!oldVnode)中的逻辑，进而执行createElm(vnode)；

    createElm.js
    function createElm(vnode) {
      var { tag, data, children, text } = vnode;
      if (typeof tag === "string") {
        if (createComponent(vnode)) {
          return vnode.componentInstance.$el;
        }
        vnode.el = document.createElement(tag);
        patchProps(vnode.el, {}, data);
        children.forEach((child) => {
          vnode.el.appendChild(createElm(child));
        });
      } else {
        vnode.el = document.createTextNode(text);
      }
      return vnode.el;
    }

    进而执行
    children.forEach((child) => {
      vnode.el.appendChild(createElm(child));
    });
    这里再次执行createElm(child)，此时child是组件，进入以下逻辑
    if (createComponent(vnode)) {
      return vnode.componentInstance.$el;
    }
    再回到上层，执行vnode.el.appendChild(createElm(child))，从而将组件返回的$el元素append到它的父元素上。

    createComponent.js
    function createComponent(vnode) {
      var i = vnode.data;
      if ((i = i.hook) && (i = i.init)) {
        i(vnode);
      }
    }

    createComponentVnode.js
    function createComponentVnode(vm, tag, key, data, children, Ctor) {
      if (typeof Ctor === "object") {
        Ctor = vm.$options._base.extend(Ctor);
      }
      data.hook = {
        init(vnode) {
          var instance = (vnode.componentInstance = new Ctor({}));
          instance.$mount();
        },
      };
      return vnode(vm, tag, key, data, children, null, { Ctor });
    }
   */

  if (!prevVnode) {
    // initial render
    vm.$el = vm.__patch__(
      vm.$el,
      vnode,
      hydrating,
      false /* removeOnly */,
      vm.$options._parentElm,
      vm.$options._refElm
    );
    // no need for the ref nodes after initial patch
    // this prevents keeping a detached DOM tree in memory (#5851)
    vm.$options._parentElm = vm.$options._refElm = null;
  } else {
    // updates
    vm.$el = vm.__patch__(prevVnode, vnode);
  }
  activeInstance = prevActiveInstance;
  // update __vue__ reference
  if (prevEl) {
    prevEl.__vue__ = null;
  }
  if (vm.$el) {
    vm.$el.__vue__ = vm;
  }
  // if parent is an HOC, update its $el as well
  if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
    vm.$parent.$el = vm.$el;
  }
  // updated hook is called by the scheduler to ensure that children are
  // updated in a parent's updated hook.
};
