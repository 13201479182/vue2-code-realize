
    /**
     * vmId: 组件实例数
     * componentId: 组件种类id
     * observeId: Observe实例id
     * depId: Dep实例id
     * watcherId: Watcher实例id
     */
    let vmId = 0,
        componentId = 0,
        observeId = 0,
        depId = 0,
        watcherId = 0;
    /**
     * queens:    待更新的watcher队列
     * callbacks: nextTick添加的微任务队列
     * flushing:  watcher队列是否在更新中
     * pending: nextTick中的cb是否在异步运行中
     */
    let queens = [],
        callbacks = [];
        flushing = false,
        pending = false;

    // 生命周期钩子
    let hooks = ["beforeCreate", "created", "beforeMount", "mounted", "beforeUpdate", "updated", "beforeDestroy", "destroyed"]; 

    // 定义正在patch的组件实例
    let patchingInstance = null;

    // 以闭包来记录patchingInstance的状态
    function setPatchingInstance(vm) {
        var prePatchingInstance = patchingInstance;
        patchingInstance = vm;

        return function() {
            patchingInstance = prePatchingInstance;
        };
    };

    // 根组件选项初始化
    function mergeOptions(userOptions, globalOptions) {
        var options = {};

        // 组件项合并
        if (globalOptions.components) {
            options.components = Object.create(
                globalOptions.components
            );
        }else {
            options.components = {};
        };
        
        // 生命周期项初始化
        hooks.forEach(key => {
            if (userOptions[key] || globalOptions[key]) {
                options[key] = [];
            };

            // 全局生命周期混入合并
            if (globalOptions[key]) {
                globalOptions[key].forEach(hook => {
                    options[key].push(hook);
                });
            };
        });

        // 全局项合并
        Object.keys(globalOptions).forEach(key => {
            if (!options[key]) {
                options[key] = globalOptions[key];
            };
        });
        
        // 用户配置项合并
        Object.keys(userOptions).forEach(key => {
            if (!options[key]) {
                options[key] = userOptions[key];
            }else {
                if (Array.isArray(options[key])) {
                    options[key].push(userOptions[key]);
                }else {
                    options[key] = Object.assign(options[key], userOptions[key]);
                };
            };
        });

        return options;
    };

    // 通用组件选项初始化
    function initInternalComponent(vm, options) {
        var ops = vm.$options = Object.create(vm.constructor.options),
            componentOptions = options._parentVnode.componentOptions;
        
        ops.parent = options.parent;
        ops._parentVnode = options._parentVnode;
        
        ops.propsData = componentOptions.propsData;
        ops._parentListeners = componentOptions.listeners;
    };

    // 初始化当前实例的属性
    function initLifecycle(vm) {
        const { parent } = vm.$options;
        if (parent) {
            parent.$children.push(vm);
        };

        vm.$root = parent ? parent.$root : vm;
        vm.$parent = parent;
        vm.$children = [];

        vm._data = {};
        vm._props = {};
        
        vm._events = {};
        vm._watcher = null;
        vm._computedWatchers = {};
        vm._watchers = [];

        vm._vnode = null;

        vm._isMounted = false;
        vm._isDestroyed = false;
    };

    // 初始化当前实例的自定义事件
    function initEvents(vm) {
        const listeners = vm.$options._parentListeners;

        // 绑定事件
        if (listeners && typeof listeners === "object") {
            Object.keys(listeners).forEach(eventName => {
                vm.$on(eventName, listeners[eventName]);
            });
        };
    };

    // 初始化当前实例的渲染器
    function initRender(vm) {
        // 生成渲染函数依赖的_c函数,且保存至当前实例
        vm._c = function(tag, data, children) {
            // 参数标准化
            if (typeof data !== "object") {
                children = data;
                data = {};
            };

            // 当传入单个子元素非数组时处理成数组
            if (children && !Array.isArray(children)) {
                children = [children];
            };

            return _createElement(vm, tag, data, children);
        };
    };

    // 初始化当前实例的状态
    function initState(vm) {
        var options = vm.$options;

        // 初始化props
        if (options.props) {
            initProps(vm, options.propsData);
        };
        // 初始化methods
        if (options.methods) {
            initMethods(vm, options.methods);
        };
        // 初始化data
        if (options.data) {
            initData(vm, options.data);
        };
        // 初始化computed
        if (options.computed) {
            initComputed(vm, options.computed);
        };
        // 初始化watch
        if (options.watch) {
            initWatch(vm, options.watch);
        };
    };

    // 初始化当前实例的属性
    function initProps(vm, propsData) {
        // 依次对子组件的prop做响应式处理
        Object.keys(propsData).forEach(key => {
            defineReactive(vm._props, key, propsData[key]);
        });
    };

    // 初始化当前实例的方法
    function initMethods(vm, methods) {
        // 依次对子组件的method进行绑定
        Object.keys(methods).forEach(key => {
            vm[key] = methods[key];
        });
    };

    // 初始化当前实例的数据
    function initData(vm, data) {
        var data = vm._data = typeof data === "function" ? data() : data;

        // 代理_data中的属性至vm上
        Object.keys(vm._data).forEach(key => {
            proxy(vm, key, "_data");
        });

        // 对_data做响应式处理
        observe(data);
    };

    // 初始化当前实例的计算属性
    function initComputed(vm, computed) {
        // 遍历computed,为每一个属性生成对应的Watcher
        if (typeof computed === "object") {
            Object.keys(computed).forEach(key => {
                var handler = typeof computed[key] === "function" ? computed[key] : computed[key].get;
                
                // 创建watcher,且保存在当前实例上
                vm._computedWatchers[key] = new Watcher(vm, handler, null, {
                    lazy: true
                }, false);

                // 代理当前的属性至vm实例上
                Object.defineProperty(vm, key, {
                    get() {
                        var target = vm._computedWatchers[key];
                        if (target) {
                            // 初次进行依赖收集
                            if (target.dirty) {
                                target.evaluate();
                            };

                            return target.value;
                        }
                    },

                    set() {
                        console.warn(key, ":为计算属性不允许设置值");
                    }
                })
            });
        };
    };

    // 初始化当前实例的watch选项
    function initWatch(vm, watch) {
        var handler = null;

        if (typeof watch === "object") {
            Object.keys(watch).forEach(key => {
                handler = watch[key];

                if (Array.isArray(handler)) {
                    for(let i=0,l=handler.length; i<l; i++) {
                        // 为handler数组中的每一个handler生成watcher实例
                        createWatch(vm, key, handler[i]);
                    };            
                }else { 
                    createWatch(vm, key, handler);
                };
            });
        };
    };

    function createWatch(vm, key, handler) {
        // handler可以是函数,可以是配置对象,还可以是字符串
        if (typeof handler === "function") {
            vm.$watch(key, handler, {});
        }else if (typeof handler === "object") {
            vm.$watch(key, handler.handler, handler);
        }else {
            // 字符串
            vm.$watch(key, vm[handler], {});
        };
    };

    function observe(data) {
        var ob;
        if (typeof data === "object") {
            if (data.__ob__) {
                ob = data.__ob__;
            }else {
                ob = new Observe(data);
            }
        };
        return ob;
    };

    class Observe {
        constructor(data) {
            this.id = observeId++;
            this.value = data;
            this.dep = new Dep();

            // 往当数据上定义不可枚举的属性__ob__,代指当前Observe实例
            Object.defineProperty(data, "__ob__", {
                value: this,
                enumerable: false
            });

            // 对数据进行具体的响应式处理 
            if (Array.isArray(data)) {
                // 替换数组的原型
                updateArrayPrototype(data);
                // 对数组做响应式处理
                this.observeArray(data);
            }else {
                // 对对象做响应式处理
                this.walk(data);
            };
        }

        walk(obj) {
            var keys = Object.keys(obj);
            if (keys.length) {
                keys.forEach(key => {
                    defineReactive(obj, key, obj[key]);
                });
            };
        }

        observeArray(arr) {
            arr.forEach(item => {
                observe(item);
            });
        }
    };

    // 用于向对象定义响应式的属性
    function defineReactive(obj, key, val) {
        var dep = new Dep;
        var ob = observe(val);

        Object.defineProperty(obj, key, {
            get() {
                // 依赖收集
                if (Dep.target) {
                    // 对象key值对应的依赖收集
                    dep.depend();
                    if (ob) {
                        // 对象__ob__对应的依赖收集 
                        ob.dep.depend();
                    };
                }; 
                return val;
            },

            set(newVal) {
                if (val !== newVal) {
                    val = typeof newVal === "object" ? observe(newVal).value : newVal;
                    // 依赖触发
                    dep.notify();
                };
            }
        });
    };

    // 用于替换数组的原型
    function updateArrayPrototype(arr) {
        var arrayMethods = [
            "unshift",
            "shift",
            "push",
            "pop",
            "splice",
            "reverse",
            "sort"
        ];
        var arrPrototype = Object.create(Array.prototype);
        
        // 追加7个方法的定义至arrProto上
        arrayMethods.forEach(method => {
            arrPrototype[method] = function(...args) {
                var result = Array.prototype[method].apply(this, args);
                var inserted;

                if (method === "push" || method === "unshift") {
                    inserted = args;
                }else if(method === "splice") {
                    inserted = args.slice(2);
                };

                // 对新增的做响应式
                if (inserted && inserted.length) {
                    arr.__ob__.observeArray(inserted);
                };

                // 触发依赖变更
                arr.__ob__.dep.notify();

                return result;
            };
        });
        
        // 覆盖原型
        arr.__proto__ = arrPrototype;
    };

    class Dep {
        static target = null;

        constructor() {
            this.id = depId++;
            this.subs = [];
        }

        // 通知watcher保存当前实例
        depend() {
            if (Dep.target) {
                Dep.target.addDep(this);
            }
        }

        // 通知watcher进行更新
        notify() {
            this.subs.forEach(sub => {
                sub.update();
            });
        }

        // 添加watcher
        addSub(watcher) {
            this.subs.push(watcher);
        }

        // 移出watcher
        removeSub(watcher) {
            this.subs.splice(
                this.subs.indexOf(watcher),
                1
            );
        }
    };

    class Watcher {
        constructor(vm, exp, cb, options, isRenderWatcher) {
            // 实例属性初始化
            this.vm = vm;
            this.isRenderWatcher = isRenderWatcher;
            this.id = watcherId++;
            this.active = true;
            this.deps = [];
            this.depIds = new Set;
            this.cb = cb;

            // 当前组件的所有watcher都保存在_watchers中
            if (vm._watchers) {
                vm._watchers.push(this);
            };
            // 当前组件的_watcher代指renderWatcher
            if (isRenderWatcher) {
                vm._watcher = this;
            };

            /**
             * 初始化options
             * deep: $watch内部会对被监听的数据进行深度依赖收集
             * user: 代指通过$watch创建即具有cb回调的watcher
             * lazy: 指创建watcher时,watcher不会同步去工作,即依赖收集
             * sync: 代指watcher的更新策略选择同步
             * before: 代指watcher执行exp之前应该做的事情,函数
             */
            options = options ? options : {};
            this.deep = options.deep;
            this.user = options.user;
            this.lazy = options.lazy;
            this.dirty = options.lazy;
            this.sync = options.sync;
            this.before = options.before;

            // 对exp进行处理
            if (typeof exp === "function") {
                // 数函数
                this.getter = exp;        
            }else if(typeof exp === "string") {
                // 字符串
                this.getter = parsePath(exp);
            };

            // 执行watcher
            this.value = this.lazy ? false : this.get();
        }

        // 依赖收集函数
        get() {
            Dep.target = this;
            // 对value进行基本依赖收集
            var value = this.getter.call(this.vm, this.vm);
            // 对val进行深度依赖收集
            if (this.deep) {
                traverse(value);
            };
            Dep.target = null;

            return value;
        }

        // 执行惰性的watcher
        evaluate() {
            // 初始化计算属性依赖的值
            this.value = this.get();
            // 变更状态,代表已进行依赖收集了
            this.dirty = false;
        }

        // 更新watcher
        update() {
            if (this.sync) {
                this.run();
            }else {
                // 异步更新
                queenWatcher(this);
            };
        }

        // 运行watcher
        run() {
            if (this.active) {
                // 这个值主要被computedWatcher直接依赖,被userWatcher回调间接依赖
                const newValue = this.get();
                if (this.lazy) {
                    // computedWatcher
                    this.value = newValue;
                }else if (this.user) {
                    // userWatcher
                    this.cb.call(this.vm, newValue, this.value);
                    this.value = newValue;
                };
            }
        }

        // 保存被依赖的dep
        addDep(dep) {
            if ( !(this.depIds.has(dep.id)) ) {
                // 这块是相互依赖 你中有我我中有你 故addSub中不需要判重
                this.depIds.add(dep.id);
                this.deps.push(dep);  
                dep.addSub(this);
            };
        }

        // 销毁当前watcher
        teardown() {
            if (this.active) {
                var vm = this.vm;
                this.active = false;

                // 1>销毁当前实例对watcher的引用
                if (this.isRenderWatcher) {
                    // 释放_watcher的引用
                    vm._watcher = null;
                }else if (this.lazy) {
                    // 释放_computedWatchers的引用
                    var cWatcher = vm._computedWatchers;

                    Object.keys(cWatcher).forEach(key => {
                        if (this === cWatcher[key]) {
                            delete cWatcher[key];
                        };
                    });
                };
               
                // 1>销毁dep对watcher的引用
                this.deps.forEach(dep => {
                    dep.removeSub(dep);
                });
        
                // 2>释放_watchers的引用
                vm._watchers.splice(
                    vm._watchers.indexOf(this),
                    1
                );
                
                return this;
            }
        }
    };

    // 用于对author.name这种类型进行深度依赖收集
    function parsePath(string) {
        var segments =  string.split(".");

        return function(vm) {
            if (segments.length) {
                for(let i=0,l=segments.length; i<l; i++) {
                    vm = vm[segments[i]];
                };
            }
            return vm;
        };
    };

    // 让watcher被深度收集至dep中
    function traverse(val) {
        if (Array.isArray(val)) {
            for (var i=0,l=val.length; i<l; i++) {
                traverse(val[i]);
            };
        }else if (typeof val === "object") {
            var keys = Object.keys(val);
            for (var i=0,l=keys.length; i<l; i++) {
                traverse(val[keys[i]]);    
            };
        }else {
            return;
        };
    };

    // wacther入队
    function queenWatcher(watcher) {
        // 仅当队列中不存在时入队
        for (let i=0,l=queens.length; i<l; i++) {
            if (queens[i].id === watcher.id) {
                return;
            };
        };

        // watcher入队
        if (!flushing) {
            queens.push(watcher);

            // 开始冲刷
            nextTick(flushSchedulerQueen);
        }else {
            for (let i=0,l=queens.length; i<l; i++) {
                if (queens[i].id > watcher.id) {
                    queens.splice(i-1, 0, watcher);
                };
            };

            // 当前watcher的id为最大的
            queens.push(watcher);
        };
    };

    // watcher队列更新
    function flushSchedulerQueen() {
        flushing = true;
        var i = 0,
            watcher = null;
        
        /**
         * 保证了renderWatcher执行在其他watcher执行之后
         * 保证了父子组件watcher的执行先后
         */
        queens.sort((a, b) => a.id - b.id);
        // 执行队列更新
        if (queens.length) {
            while(watcher = queens[i++]) {
                if (watcher) {
                    // 触发watcher中配置的before函数
                    if (watcher.before) {
                        watcher.before();
                    };
                    // 执行watcher
                    watcher.run();
                };
            };

            // 反向触发watchers的updated
            for (let i=queens.length; i>=0; i--) {
                if (queens[i]) {
                    callHook(queens[i].vm, "updated");
                };
            };
        };

        // 状态初始化
        queens = [];
        flushing = false;
    };

    function flushCallbacks() {
        var copies = callbacks.slice(0);
            callbacks = [];
            pending = false;
        
        copies.forEach(cb => {
            cb();
        });
    };

    // watcher异步策略执行
    function nextTick(fn, ctx) {
        if (fn) {
            callbacks.push(() => {
                // 错误捕获
                try {
                    fn.call(ctx);
                }catch(err) {
                    console.warn(err);
                };
            });
        };

        // 微任务队列未执行时,让其执行
        if (!pending) {
            pending = true;
            if (typeof Promise) {
                Promise.resolve()
                    .then(
                        flushCallbacks
                    );
            }else {
                setTimeout(flushCallbacks, 0);
            };  
        }
    };

    // 真正的挂载组件函数
    function mountComponent(vm, el) {
        // 每一个组件实例上都存在$el
        vm.$el = el;

        // 触发钩子beforeMount: 模板编译成渲染函数后
        callHook(vm, "beforeMount");

        // 定义组件更新函数
        let updateComponent = () => {
            vm._update(vm._render());
        };

        // 创建render级watcher
        new Watcher(vm, updateComponent, null, {
            before() {
                callHook(vm, "beforeUpdate");
            }
        }, true);

        // 触发mounted钩子
        callHook(vm, "mounted");
    };

    function updateChildComponent(vnode) {
        const {componentOptions, componentInstance} = vnode;

        // 更新实例来源的vnode
        componentInstance.$vnode = vnode;
        componentInstance.$options._parentVnode = vnode;
        if (componentInstance._vnode) {
            componentInstance._vnode.parent = vnode;
        };
        
        // 更新实例的props属性
        var propsData = componentOptions.propsData;
        if (propsData) {
            for (var prop in propsData) {
                if (componentInstance[prop]) {
                    componentInstance[prop] = propsData[prop];
                };
            };
        };
    };

    // 依据渲染函数生成虚拟dom的函数
    function _createElement(ctx, tag, data, children) {
        /***
         * 当前函数主要用于对标签或者组件生成虚拟dom
         * 
         */
        var vnode = {},
            components = ctx.$options["components"];
        // 处理属性
        var selector = data.attrs && data.attrs.id;
    
        if (typeof tag === "string") {
            if (components[tag]) {
                // 创建组件类型的vdom
                vnode = createComponetVnode(
                    ctx, tag, data, children, components[tag]
                );
            }else {
                // 创建标签类型的vdom
                vnode= new Vnode(
                    ctx, tag, data, children
                );
            };
        }else {
            // tag不存在
            vnode = new Vnode;
        };

        return vnode;
    };

    // 创建组件的vnode
    function createComponetVnode(ctx, tag, data, children, VueComponent) {
        var Vue = ctx.$options._base;

        // 直接通过选项定义的组件,转化为组件类,局部组件
        if (typeof VueComponent === "object") {
            VueComponent = ctx.$options.components[tag] = Vue.extend(VueComponent);
        };

        // 初始化data
        data = data || {};
        // 初始化组件名字
        const name = VueComponent.options.name || tag;
        // 初始化组件属性及其自定义属性
        const propsData = getComponentProps(VueComponent, data);

        // 获取自定义事件
        const listeners = data.on;
        // 设置原生事件
        data.on = data.nativeOn;

        // 安装组件管理钩子
        installComponentHook(data);

        // 创建组件类型的vnode
        return new Vnode(
            ctx,
            `vue-component-${VueComponent.id}${name ? `-${name}` : ''}`,
            data,
            null, null, null,
            {
                VueComponent,
                propsData,
                listeners,
                tag,
                children
            }
        );
    };

    // 获取组件在调用时传入的可以使用的props
    function getComponentProps(VueComponent, data) {
        // 获取调用组件时传入的props
        const { props } = data;
        // 获取定义组件时声明的props
        const definePropsArr = VueComponent.options.props;
        
        let result = {};
        
        if (typeof props === "object") {
            Object.keys(props).forEach(key => {
                if (definePropsArr.indexOf(key) !== -1) {
                    // 若传入的props确定已经声明
                    result[key] = props[key];
                };
            });
    
            // 删除props属性
            delete data.props;
        };

        return result;
    };

    // 定义组件管理钩子
    let componentVnodeHooks = {
        // 实例化组件
        init(vnode) {
            // 基于vnode创建组件实例
            const options = {
                _isComponent: true,
                _parentVnode: vnode,
                parent: patchingInstance
            };
            
            var childComponent = vnode.componentInstance =  new vnode.componentOptions.VueComponent(options);
            // 实例完成时挂载子组件
            childComponent.$mount(vnode.elm);

            return vnode;
        },

        // 更新组件
        prepatch(vnode, oldVnode) {
            // 新的vnode沿用原有的实例
            vnode.componentInstance = oldVnode.componentInstance;

            updateChildComponent(
                vnode
            );
        },

        // 销毁组件
        destroy(vnode) {
            const { componentInstance } = vnode;

            if (!componentInstance._isDestroyed) {
                componentInstance.$destroy();
            };
            
            // 返回销毁的组件实例
            return componentInstance;
        }
    };

    // 为组件型vnode安装组件管理钩子
    function installComponentHook(data) {
        let hooks = data.hook || (data.hook = {});

        Object.keys(componentVnodeHooks).forEach(hookKey => {
            if (hooks[hookKey]) {
                // 用户传入了自定义管理钩子
                hooks[hookKey] = mergeComponentHook(componentVnodeHooks[hookKey], hooks[hookKey]);
            }else {
                hooks[hookKey] = componentVnodeHooks[hookKey];
            };
        }); 
    };

    // 合并用户传入的组件管理钩子与组件默认管理钩子
    function mergeComponentHook(defaultHook, userHook) {
        return function(vnode, oldVnode) {
            userHook.call(defaultHook(vnode, oldVnode));
        };
    };

    // vnode
    class Vnode {
        constructor(ctx, tag, data, children, text, elm, componentOptions) {
            /**
             * ctx:         当前render函数产生Vnode所属的实例
             * tag:         标签或者组件
             * data:        配置对象
             * children:    子集
             * text:        文本,用于创建文本节点
             * elm:         当前vnode产生的真实节点
             * componentOptions:    组件型vnode参数项
             */
            this.tag = tag;
            this.data = data;
            this.children = children;
            this.text = text;
            this.vm = ctx;
            this.elm = elm;
            this.key = data && data.key;
            this.componentOptions= componentOptions;

            this.componentInstance = null;
            this.parent = null;
        }
    };

    // 创建文本节点
    function createTextVnode(string) {
        return new Vnode(null, null, null, null, string);
    };
    
    /**
     * 向vm上代理key,源资源source
     * @param { 组件实例 } vm 
     * @param { 属性 } key 
     * @param { 资源 } source 
     */
    function proxy(vm, key, source) {
        var handler = {
            get() {
                return vm[source][key];
            },
            set(newVal) {
                vm[source][key] = newVal;
            }
        };

        Object.defineProperty(vm, key, handler);
    };

    /**
     * 触发对应实例的生命周期钩子
     * @param { 组件实例 } vm 
     * @param { 生命周期钩子 } hook 
     */
    function callHook(vm, hook) {
        var hookArr = vm.$options[hook];
        if (hookArr) {
            hookArr.forEach(hook => {
                hook.call(vm);
            });
        };
    };

    // 递归销毁vnode中存在的组件实例
    function destroyComponentByVnode(vnode) {
        const { data } = vnode;
        
        if (data && data.hook) {
            data.hook.destroy(vnode);
        };

        if (vnode.children) {
            vnode.children.forEach(vnode => {
                destroyComponentByVnode(vnode);
            });
        };
    };

    // 移出节点
    function removeNodes(vnodes, startIndex, endIndex) {
        if (vnodes) {
            for(; startIndex<=endIndex; startIndex++) {
                var el = vnodes[startIndex];

                if (el.tag) {
                    // 虚拟dom
                    el.elm.parentElement.removeChild(el.elm);
                }else {
                    // 真实dom
                    el.parentElement.removeChild(el);
                };
            };
        };
    };

    // 添加节点
    function addNodes(el, ref, vnodes, start, end) {
        for (; start<=end; start++) {
            createElm(vnodes[start], el, ref);
        };  
    };

    // 判断两个vnode是不是同一个vnode
    function isSameVnode(oldVnode, vnode) {
        return oldVnode.tag === vnode.tag && oldVnode.key === vnode.key;
    };

    // 将组件型的vnode转化为真实节点
    function createComponent(vnode, parent, ref) {
        const { data } = vnode;

        if (data) {
            if (data.hook && !vnode.componentInstance) {
                data.hook.init(vnode);
            };

            if (vnode.componentInstance) {
                // 创建组件实例成功
                vnode.elm = vnode.componentInstance.$el;

                // 插入节点值具体位置
                if (ref) {
                    parent.insertBefore(vnode.elm, ref);
                }else {
                    parent.appendChild(vnode.elm);
                };
                return true;
            };
        };
    };

    // diff新旧vnode的children
    function updateChildren(el, oldVnodeChildren, vnodeChildren) {
        // 定义游标
        var oldStartIndex = 0,
            oldEndIndex = oldVnodeChildren.length - 1,
            newStartIndex = 0,
            newEndIndex = vnodeChildren.length - 1;
        // 定义节点    
        var oldStartVnode = oldVnodeChildren[0],
            oldEndVnode = oldVnodeChildren[oldEndIndex],
            newStartVnode = vnodeChildren[0],
            newEndVnode = vnodeChildren[newEndIndex];
        
        // 循环的条件是两个游标没有任何一个走完
        while(oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
            if (isSameVnode(oldStartVnode, newStartVnode)) {
                // 按序对比头部节点
                patchVnode(oldStartVnode, newStartVnode);
                oldStartVnode = oldVnodeChildren[++oldStartIndex];
                newStartVnode = vnodeChildren[++newStartIndex];
            }else if (isSameVnode(oldEndVnode, newEndVnode)) {
                // 按序对比尾部节点
                patchVnode(oldEndVnode, newEndVnode);
                oldEndVnode = oldVnodeChildren[--oldEndIndex];
                newEndVnode = vnodeChildren[--newEndIndex];
            }else if (isSameVnode(oldStartVnode, newEndVnode)) {
                // 对角线按序对比节点
                patchVnode(oldStartVnode, newEndVnode);
                // 旧的开始新的结束 此节点移入到尾部
                el.insertBefore(oldStartVnode.elm, oldEndVnode.elm.nextSibling);
                
                oldStartVnode = oldVnodeChildren[++oldStartIndex];
                newEndVnode = vnodeChildren[--newEndIndex];
            }else if (isSameVnode(newStartVnode, oldEndVnode)) {
                // 对角线按序对比节点
                patchVnode(oldEndVnode, newStartVnode);
                // 旧的结束新的开始 此节点移入到首部
                el.insertBefore(oldEndVnode.elm, oldStartVnode.elm);
                
                oldEndVnode = oldVnodeChildren[--oldEndIndex];
                newStartVnode = vnodeChildren[++newStartIndex];
            }else {
                var oldVnode = null;
                // 按最原始的双向遍历处理剩下的vnode
                for (; newStartIndex<=newEndIndex; newStartIndex++) {
                    newStartVnode = vnodeChildren[newStartIndex];
                    // 遍历旧的在旧的里面找
                    for (let i=oldStartIndex,j=oldEndIndex; i<=j; i++) {
                        oldVnode = oldVnodeChildren[i];
                        if (isSameVnode(oldVnode, newStartVnode)) {
                            // 更新且替换位置至首部
                            patchVnode(oldVnode, newStartVnode);
                            el.insertBefore(oldVnode.elm, oldStartVnode.elm);
                            break;
                        };
                    };
                    // 未找到则创建
                    createElm(newStartVnode, el, oldStartVnode.elm);
                };
            };
        };

        // 扫尾最后肯定有一个数组有剩余的vnode
        if (oldStartIndex > oldEndIndex) {
            // 新数组存在剩余
            ref = vnodeChildren[newEndIndex + 1] ? vnodeChildren[newEndIndex + 1].elm : null;
            addNodes(el, ref, vnodeChildren, newStartIndex, newEndIndex);
        }else if (newStartIndex > newEndIndex) {
            // 旧数组存在剩余
            removeNodes(oldVnodeChildren, oldStartIndex, oldEndIndex);
        };
    };

    // diff新旧虚拟dom
    function patchVnode(oldVnode, vnode) {
        if (oldVnode === vnode) {
            // 新旧节点一样不用diff
            return;
        };  
        // 替换节点,更新次节点
        const elm = vnode.elm = oldVnode.elm;
        // 更新当前的vnode可能是标签,组件,文本节点
        if (vnode.componentOptions) {
            // 情形1: 组件
            var prepatch = vnode.data.hook && vnode.data.hook.prepatch;
            prepatch(vnode, oldVnode);
        }else if(vnode.tag) {
            // 情形2: 标签
            invokeUpdateHooks(oldVnode, vnode);
            var oc = oldVnode.children,
                nc = vnode.children;
            // 更新子节点
            if (oc && nc) {
                // 新旧vnode都存在
                updateChildren(elm, oc, nc);
            }else if(oc) {
                // 仅存在旧vnode,删除
                removeNodes(oc, 0, oc.length - 1);
            }else if(nc) {
                // 仅存在新vnode,添加
                addNodes(elm, null, ch, 0, ch.length-1);
            };
        }else {
            // 情形3: 文本
            if (vnode.text !== oldVnode.text) {
                elm.textContent = vnode.text;
            };
        };
    };

    // modules -> 样式
    let styleHooks = {
        create(vnode) {
            var styleList = vnode.data && vnode.data.style,
                el = vnode.elm;

            if (styleList) {
                for (var key in styleList) {
                    el.style[key] = styleList[key];
                };
            };
        },

        update(oldVnode, vnode) {
            var oldStyle = oldVnode.data.style,
                newStyle = vnode.data.style,
                el = vnode.elm;
            
            if (!oldStyle && !newStyle) {
                return;
            }else {
                // 删除原有的样式
                Object.keys(oldStyle).forEach(style => {
                    el.style[style] = "";
                });
                // 添加新的样式
                Object.keys(newStyle).forEach(style => {
                    el.style[style] = newStyle[style];
                });
            };
        }
    };

    // modules -> 属性
    let attrsHooks = {
        create(vnode) {
            var attrsList = vnode.data && vnode.data.attrs,
                el = vnode.elm;
            if (attrsList) {
                for (var key in attrsList) {
                    el[key] = attrsList[key];
                };
            };
        },

        update(oldVnode, vnode) {
            var oldAttrs = oldVnode.data.attrs,
                newAttrs = vnode.data.attrs,
                el = vnode.elm;
            
            if (!oldAttrs && !newAttrs) {
                return;
            }else {
                // 删除原有的属性
                Object.keys(oldAttrs).forEach(attr => {
                    el[attr] = "";
                });
                // 添加新的属性
                Object.keys(newAttrs).forEach(attr => {
                    el[attr] = newAttrs[attr];
                });
            };
        }
    };

    // modules -> 原生事件
    let nativeOnHooks = {
        create(vnode) {
            var eventsList = vnode.data && vnode.data.nativeOn,
                el = vnode.elm;

            if (eventsList) {
                for (var event in eventsList) {
                    el["on"+event] = function() {
                        eventsList[event]();
                    };
                };
            };
        },

        update(vnode, oldVnode) {
            var oldEvents = oldVnode.data.nativeOn,
                newEvents = vnode.data.nativeOn,
                el = vnode.elm;
            
            if (!oldEvents && !newEvents) {
                return;
            }else {
                // 删除原有的事件
                Object.keys(oldEvents).forEach(eventName => {
                    el["on"+eventName] = null;
                });
                // 添加新的事件
                Object.keys(newEvents).forEach(eventName => {
                    el["on"+eventName] = newEvents[eventName];
                });
            };
        }
    };

    let domOperations = [styleHooks, attrsHooks, nativeOnHooks];

    function invokeCreateHooks(vnode) {
        domOperations.forEach(domOp => {
            domOp.create(vnode);
        });
    };

    function invokeUpdateHooks(oldVnode, vnode) {
        domOperations.forEach(domOp => {
            domOp.update(oldVnode, vnode);
        });
    };

    // 递归创建真实节点,且插入至文档
    function createElm(vnode, parent, ref) {
        // 尝试创建组件
        if (createComponent(vnode, parent, ref)) {
            return;
        }else {
            const {tag, data, children} = vnode;

            if (tag) {
                // 创建元素节点
                vnode.elm = document.createElement(tag);
                // 为vnode.elm 初始化属性
                invokeCreateHooks(vnode);

                // 递归创建
                if (Array.isArray(children)) {
                    for (let i=0,l=children.length; i<l; i++) {
                        createElm(children[i], vnode.elm, null);
                    };
                };
            }else {
                // 创建文本节点
                vnode.elm = document.createTextNode(vnode.text);
            };

            // 插入创建的新节点至其父级节点上
            if (parent) {
                if (ref) {
                    parent.insertBefore(vnode.elm, ref);
                }else {
                    parent.appendChild(vnode.elm);
                };
            };
        };
    };

    // vue构造函数,用于实例化根组件
    class Vue {
        static options = {
            components: {},
            _base: Vue
        };

        constructor(options) {
            if (this instanceof Vue) {
                this._init(options);
            }
        }

        _init(options) {
            this.id = vmId++;
            // 选项合并
            if (options._isComponent) {
                initInternalComponent(this, options);
            }else {
                this.$options = mergeOptions(options, Vue.options);
            };
            
            // 1>初始化原始属性
            initLifecycle(this);
            // 2>初始化自定义事件
            initEvents(this);
            // 3>初始化渲染器
            initRender(this);
            // 触发beforeCreate
            callHook(this, "beforeCreate");

            // 4>初始化组件状态
            initState(this);
            // 触发created
            callHook(this, "created");  

            // 如果存在el,则直接挂载(根组件)
            if (options.el) {
                this.$mount(options.el);
            };
        }
    }

    // 混入lifecycle对应的方法
    function lifecycleMixin(Vue) {
        // 混入挂载函数
        Vue.prototype.$mount = function(el) {
            /**
             * 说明:
             * 1> 这个函数定义于web平台的runtime文件,本意功能就是如此
             * 2> 这个函数在web平台的打包入口文件进行了扩展,扩展了编译器
             * 
             * 注意点: 
             *  在mountComponent执行时,template|el已被编译器编译成render放在实例的options中
             *  这块不提供编译器,故测试中都直接使用render函数
             */

            el = typeof el === "string" ? document.querySelector(el) : el;
            
            return mountComponent(this, el);
        };

        // 混入更新函数
        Vue.prototype._update = function(vnode) {
            const vm = this;
            const preVnode = vm._vnode;
           
            // 保存vnode至当前实例
            vm._vnode = vnode;

            // 设置正在patching的实例
            var returnPre = setPatchingInstance(vm);
            if (!preVnode) {
                // 初始化视图
                vm.$el = vm.__patch__(vm.$el, vnode);
            }else {
                // 更新视图
                vm.$el = vm.__patch__(preVnode, vnode);
            };
            // 回滚patchng状态
            returnPre();

            // 节点上存储当前其所属的实例
            if (vm.$el) {
                vm.$el.__vue__ = vm;
            };
        };

        // 混入强制组件更新函数
        Vue.prototype.$forceUpdate = function() {
            const vm = this;

            if (vm._watcher) {
                // 当当前组件存在render Watcher时,迫使其更新
                vm._watcher.update();
            };
        };

        // 混入销毁当前组件的函数
        Vue.prototype.$destroy = function() {
            const vm = this;

            callHook(vm, "beforeDestroy");

            if (vm._isDestroyed) {
                return;
            }else {
                // 1> 销毁当前的watchers
                while(vm._watchers.length) {
                    vm._watchers[0].teardown();
                };

                // 2> 销毁全部的自定义事件
                if (vm._events) {
                    vm.$off();
                };

                /**
                 * 3> 释放引用
                 * $vnode: 代表当前组件的虚拟dom,由render直接产生,未实例化
                 * _vnode: 代表当前组件的虚拟dom,经过实例化后的
                 */
                
                // 释放父组件对子组件的引用
                if (vm.$parent) {
                    vm.$parent.$children.splice(
                        vm.$parent.$children.indexOf(vm),
                        1
                    );
                };
                // 释放组件vnode对父节点的引用
                if (vm.$vnode) {
                    vm.$vnode.parent = null;
                };
                // 释放节点对实例的引用
                if (vm.$el) {
                    delete vm.$el.__vue__;
                }; 
                
                // 递归销毁子组件
                vm.__patch__(vm._vnode, null);

                vm._isDestroyed = true;
                callHook(vm, "destroyed");
            };
        };
    };
    lifecycleMixin(Vue);

    // 混入自定义事件处理程序
    function eventMixin(Vue) {
        // 自定义事件绑定
        Vue.prototype.$on = function(eventName, handle) {
            var events = this._events;

            if (events[eventName]) {
                events[eventName].push(handle);
            }else {
                events[eventName] = [
                    handle
                ];
            }
            return this;
        }; 
        
        // 一次性事件绑定
        Vue.prototype.$once = function(eventName, handle) {
            var vm = this;

            function on() {
                // 一次性事件先触发后销毁
                handle.apply(vm, arguments);
                this.$off(eventName, on);
            };
            this.$on(eventName, on);

            return vm;
        }; 

        // 销毁事件
        Vue.prototype.$off = function(eventName, handle) {
            /**
             * 这块利用参数数量来决定处理方式
             * 0: 销毁全部事件
             * 1: 销毁事件名对应的全部事件
             * 2: 销毁事件名对应的具体回调
             */
            var vm = this;

            if (!arguments.length) {
                vm._events = {};
            }else if (arguments.length === 1) {
                if (vm._events[eventName]) {
                    delete vm._events[eventName];
                };
            }else if (arguments.length === 2) {
                if (vm._events[eventName]) {
                    vm._events[eventName].splice(
                        vm._events[eventName].indexOf(handle)
                    , 1)
                };
            };
            return vm;
        }; 

        // 触发事件
        Vue.prototype.$emit = function(eventName, ...args) {
            var vm = this,
                events = null;

            if (events = vm._events[eventName]) {
                events.forEach(event => {
                    event.apply(vm, args);
                });
            };
        }; 
    };
    eventMixin(Vue);

    // 混入渲染器
    function renderMixin(Vue) {
        Vue.prototype._render = function() {
            const vm = this;
            const {render, _parentVnode} = vm.$options;
            
            // 子组件的组件配置项
            vm.$vnode = _parentVnode;

            // 执行渲染函数,获取组件的vnode
            var vnode = render.call(vm, vm._c);

            // 绑定子组件配置选项至vnode上
            vnode.parent = _parentVnode;

            return vnode;
        };

        Vue.prototype.__patch__ = function(oldVnode, vnode) {
            // 情形一: 新的vnode不存在,旧的vnode存在
            if (oldVnode && !vnode) {
                // 销毁oldVnode树中的所有组件实例
                destroyComponentByVnode(oldVnode);
                return;
            };
            // 情形二: 旧的vnode不存在,新的vnode存在
            if (!oldVnode && vnode) {
                // 为子组件创建真实节点
                createElm(vnode);
                return vnode.elm;
            };

            // 情形三: 新旧vnode都存在
            if (!oldVnode.nodeType && isSameVnode(oldVnode, vnode)) {
                patchVnode(oldVnode, vnode);
            }else {
                // 情形四: oldVnode为真实节点,或者说新旧虚拟dom发生变更,需要创建
                // 视图初始化
                createElm(
                    vnode,
                    oldVnode.parentElement,
                    oldVnode.nextSibling
                );

                // 移出原来的oldVnode的真实节点
                removeNodes([oldVnode], 0, 0);
            };

            return vnode.elm;
        };

        Vue.prototype.$nextTick = function(fn) {
            nextTick(fn, this);
        };

        Vue.prototype._v = function(str) {
            return createTextVnode(str);
        };
    };
    renderMixin(Vue);

    // 混入状态
    function stateMixin(Vue) {   
        // 混入$watch
        Vue.prototype.$watch = function(key, cb, options) {
            // 经由此方法创建的watcher都属于userWatcher
            options.user = true;
            // 创建watcher
            var watcher = new Watcher(
                this, key, cb, options, false
            );

            if (options.immediate) {
                cb.call(this, watcher.value);
            };

            // 返回watcher的销毁方法
            return function() {
                watcher.teardown();
            };
        };

        // 为响应式的对象添加响应式的属性
        Vue.prototype.$set = function(obj, key, val) {
            var ob = obj.__ob__;

            if (typeof obj === "object" && ob) {
                defineReactive(obj, key, val);

                ob.dep.notify();
            };
        };

        // 删除响应式对象的属性
        Vue.prototype.$delete = function(obj, key) {
            var ob = obj.__ob__;

            if (typeof obj === "object" && ob) {
                delete obj[key];
                
                ob.dep.notify();
            };
        };
    };
    stateMixin(Vue);

    // 全局api提供
    // 创建全局组件
    Vue.component = function(id, options) {
        var components = this.options.components;

        if (!options) {
            // 返回id对应的组件类
            if (id) {
                return components[id] ? components[id] : null;
            };
        }else {
            options.name = options.name || id;
            // 创建
            components[id] = this.extend(options);
        };
    };

    // 生成VueComponent类
    Vue.extend = function(definition) {
        var Vue = this,
            props = definition.props;

        // 定义Vue组件类
        function VueComponent(options) {
            this._init(options);
        };

        // 组件类的原型实际就是Vue的原型,不同组件的不同点在于options
        VueComponent.prototype = Object.create(Vue.prototype);
        VueComponent.prototype.constructor = VueComponent;
        VueComponent.id = componentId++;

        // 选项合并
        VueComponent.options = mergeOptions(definition, Vue.options);

        // 初始化props
        if (props && Array.isArray(props)) {
            props.forEach(prop => {
                Object.defineProperty(VueComponent.prototype, prop, {
                    get() {
                        return this._props[prop];
                    },
                    set(newVal) {
                        this._props[prop] = newVal;
                    }
                });
            }); 
        };

        return VueComponent;
    };

    // 全局api混入
    Vue.mixin = function(options) {
        this.options = mergeOptions(options, this.options);
    };

