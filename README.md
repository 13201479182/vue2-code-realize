# 作者: 刘汇源
## 注意点
<pre>   当前项目是vue2的简易版,其实现参考了vue2的源码,目的也是为了让自己能够深入的去理解及其掌握源码,同时也为了方便看到此项目的人能够更容易的去读懂且掌握源码。
    当前源码中含有丰富的注释,当然我会在下面对整个脉络以及细节做具体介绍。
</pre>

## 项目背景 
<pre>
    作为web前端开发了两年的初级工程师,自己常常很难受,难受的是自己能力低,能力低对应的就只有两个结果,一个是自己的穷途末路即将到来,一个是自己的薪水很难得到提升,开发vue项目一年了,自己也独立做过两个项目,自己选择了vue这条路,但是在开发中常常怀着很懵懂的思想去开发,当面对问题的抉择时,自己常常因为没有掌握源码,而去选择了一个未知的思路,甚是难受对于一个完美主义者来说。
    如果硬要说背景,当前项目是因为自己开发时对很多东西感到疑惑,那种不确定性导致的忧虑性使得自己去学习源码,且写出此项目。
</pre>


## 项目案例
<pre>
案例中,存在3个组件:
    第一个是以Vue构造函数实例化的根组件app
    第二个是以Vue的全局api->component创建的全局组件yuan
    第三个是以对象定义方式存储于yuan内部的子孙组件child-yuan

案例中存在以下功能:
    1. 组件内部不存在template,只实现了render函数
    2. 组件内部可以定义生命周期钩子
    3. 组件内部props,data,methods,computed,watcher都可以被解析且执行
    4. 组件内部在调用子组件时,可以使用on向子组件派发自定义事件,在子组件实例化时可以得到监听。

全局api的实现:
    1. Vue.mixin:     用于向组件混入配置项
    2. Vue.component: 用于全局定义组件    

    案例成功运行的标志是,组件内的生命周期钩子无论是在初始化还是数据更新都能得到正确的调用顺序。    
</pre>

## 项目实现列表
<ol>
    <li>
        Vue构造函数
        <ol>
            <li>
                原型方法
                <ol>
                    <li>
                        _init
                        <ol>
                            <li>mergeOptions</li>
                            <li>initInternalComponent</li>
                            <li>initLifecycle</li>
                            <li>initEvnets</li>
                            <li>initRender</li>
                            <li>initState</li>
                        </ol>
                    </li>
                    <li>
                        $mount
                        <ol>
                            <li>compile(未实现)</li>
                            <li>mountComponent</li>
                        </ol>
                    </li>
                    <li>_render</li>
                    <li>_update</li>
                    <li>
                        __patch__
                        <ol>
                            <li>createElm</li>
                            <li>patchVnode</li>
                            <li>updateChildren</li>
                        </ol>
                    </li>
                    <li>$watch</li>
                    <li>$set</li>
                    <li>$delete</li>
                    <li>$nextTick</li>
                    <li>$forceUpdate</li>
                    <li>$destroy</li>
                    <li>$on</li>
                    <li>$once</li>
                    <li>$off</li>
                    <li>$emit</li>
                </ol>
            </li>
            <li>
                静态方法
                <ol>
                    <li>component</li>
                    <li>extend</li>
                    <li>mixin</li>
                </ol>
            </li>
        </ol>
    </li>
</ol>

## 项目实现说明
<ol>
    <li>
        _init: 此函数用于根组件或者子组件在实例化时调用,涵盖以下方面成分
        <ol>
            <li>mergeOptions: 此函数仅用于根组件实例化时调用,作用是将全局(vue核心 & 平台)提供的组件、指令、过滤器与当前构造函数传入的options选项进行合并,合并的结果以$options的形式保存在当前实例。
            <p><mark>注意点: 生命周期项将被合并为数组,组件会合并出一个components对象,此对象是基于Vue.options.components为原型创建的</mark></p>
            </li>
            <li>initInternalComponent: 当前函数用于子组件实例化时调用,作用是为子组件合并一些其实例化时就应该具备的属性,具体包括: parent(父级实例)、_parentVnode(当前组件对应的父级组件vnode), _parentListeners(父组件派发的自定义事件), propsData(父组件派发给子组件的属性)。
            <p><mark>注意点: 子组件也经历过mergeOptions,此过程发生在其定义时,即Vue.extend</mark></p></li>
            <li>initLifecycle: 当前函数用于所有组件实例化时调用,作用是为当前实例初始化一些属性,例如$root, $parent, $children, _isMounted, _isDestroyed。
            <p><mark>注意点: 在此之前,实例上只含有$options属性</mark></p></li>
            <li>initEvnets: 当前函数用于所有组件实例化时调用,但仅在含有自定义事件的子组件执行有效,作用是基于_parentListeners进行自定义事件的绑定初始化。
            <p><mark>注意点: 自定义事件的监听和触发都是基于一个vue实例。</mark></p></li>
            </li>
            <li>initRender: 当前函数用于所有组件实例化时调用,作用是在对应的实例上生成一个_c函数,此函数即为rende函数执行时依赖的h参数。</li>
            <p><mark>注意点: _c函数内部返回出了一个依赖当前实例的闭包函数_createElement,此函数和render函数在执行时内部的this都是指向对应的实例,此步骤之后,触发当前实例的生命周期beforeCreate。</mark></p></li>
            <li>initState: 当前函数用于所有组件实例化时调用,作用是初始化状态,包含prop、methods、data、computed、watch。</li>
            <p><mark>注意点: 组件内部的computed和watch都属于独立的watcher,此步骤之后,触发当前实例的生命周期created。</mark></p></li>
        </ol>
    </li>
    <li>
        $mount: 此函数用于将__patch__结果挂载至传入的节点
        <ol>
            <li>
                compile: 用于将template或者el转化为render函数。
                <p><mark>注意点: 优先级render>template>el,即用户只要传入render函数就会采用,不会进行编译,当前项目中未实现。</mark></p>
            </li>
            <li>
                mountComponent: 真正意义上用于挂载视图的函数,内部会创建renderWatcher,同步调用实例上的_update完成视图的初始化。
                <p><mark>注意点: _update既用于视图的初始化,同时又用于视图的更新,此函数执行前会先触发当前实例的beforeMount生命周期。</mark></p>
            </li>
        </ol>
    <li>
        _render: 当前函数在内部调用当前实例的render函数,传入一个_c函数为参数,产生一个结构型的vnode树。
        <p>
            <mark>注意点: 因为_c函数嵌套调用的规律,所以可以产生结构型的树,内层先执行产生vnode,外层执行时就具备了children,封装_render这一层,是为了给vnode指定其prent,当然这针对的仅仅是子组件。</mark>
        </p>
    </li>
    <li>
        _update: 当前函数用于视图的初始化或者更新,内部调用了当前实例的__patch__函数,将__patch__的结果以$el的形式保存在当前实例。
        <p>
            <mark>注意点: 此函数执行时,有一个很高明的地方,就是不断开辟新的闭包来不停的记录与回滚当前更新的实例,这个目的是为了在调用子组件init管理钩子时,能精确的找到其父级,从而完成父子组件关系的建立。</mark>
        </p>
    </li>
    <li>
        __patch__: 别称平台补丁函数,依据参数不同功能也不同,总的来说包含四类功能,初始化视图,为子组件生成真实节点,更新子节点,以及递归销毁oldVnode中的子组件。
        <ol>
            <li>
                createElm: 用于将vnode递归转真实node,且依次插入至父节点,最终的结果是传入的vnode上边具有当前树对应的真实节点elm。
                <p><mark>注意点: createElm内部存在着三种vnode->node的转化,组件型vnode,标签型vnode&文本型vnode。</mark></p>
            </li>
            <li>
                patchVnode: 对比新旧两个vnode且完成真实节点的更新。
                <p><mark>注意点: 组件型vnode调用组件的管理钩子prepatch完成更新,标签型vnode调用所有domOps的update来完成更新,文本型vnode,在文本不一样的情况下替换文本即可。</mark></p>
            </li>
            <li>
                updateChildren: 对比新旧两个vnode的子集vnode,且在内部递归调用patchVnode从而完成子节点的更新。
                <p><mark>注意点: 内部采用了游标策略,让新旧vnode的起始游标和结束游标不停的按规律走动,最终完成更新,值得一提的是这里面存在的优化手段,如果未做优化,传统意义上的双重遍历即可完成,优化一: 数组首尾添加或删除元素,优化二: 数组中元素排序,解决方案: 去头 -> 去尾 -> 对角线去 -> 双重遍历 -> 扫尾,另外值得注意的是vue中提出的复用,是尽可能多的去复用节点和组件实例。</mark></p>
            </li>
        </ol>
        <p>
            <mark></mark>
        </p>
    </li>
    <li>
        $watch: 当前api用于监听组件内部数据,执行特定的cb回调,且在cb回调执行时可以得到新值和旧值。
    </li>
    <li>
        $set: 当前api用于在vue项目运行时,动态的向响应式的对象添加响应式的数据,且可以触发依赖。
        <p><mark>注意点: 这块的响应式对象指的created之后,其上含有__ob__属性的对象,这个api内部实现本质是基于这个__ob__触发依赖的,$delete同理。</mark></p>
    </li>
    <li>
        $delete: 当前api用于在vue项目运行时,动态的移除响应式对象的属性,且可以触发依赖。
    </li>
    <li>
        $nextTick: 当前api用于在vue项目运行时,往callbacks回调函数数组中添加一个回调。
        <p><mark>注意点: 在当前回调中不一定可以获得vue实例,原因在于renderWatcher的执行先后,只有在renderWatcher执行后的回调才可拿到当前实例。</mark></p>
    </li>
    <li>
        $forceUpdate: 当前api用于在vue项目运行时,迫使当前实例的renderWatcher执行。
        <p><mark>注意点: 当前renderWatcher的执行,即_render->_update->__patch__->patchVnode->updateChildren,则会导致以最新的组件状态生成vnode,以最新的vnode进行patch,故视图也为最新。</mark></p>
    </li>
    <li>
        $destroy: 当前api用于销毁当前组件。
        <p><mark>注意点: 销毁指的是销毁当前组件watcher,自定义事件,释放父组件对当前组件的引用,递归销毁子组件。</mark></p>
    </li>
    <li>
        $on: 当前api用于绑定自定义事件。
        <p><mark>注意点: 参数依次为事件名和事件触发时的回调。</mark></p>
    </li>
    <li>
        $once: 当前api用于绑定一次性自定义事件。
        <p><mark>注意点: 一次性事件的实现其实就是个闭包函数,对传入的函数回调进行了一次封装,在触发事件时先执行后销毁。</mark></p>
    </li>
    <li>
        $off: 当前api用于销毁当前组件上的事件。
        <pre><mark>注意点: 1.不传参数,代表销毁当前组件上的全部事件。
        2.传一个参数,代表销毁当前组件上的此类自定义事件。
        3.传两个参数，代表销毁当前组件上此类事件的具体回调。</mark></pre>
    </li>
    <li>
        $emit: 当前api用于触发子组件上的自定义事件。
    </li>
</ol>

## 项目细节说明 

### 细节1: props是如何实现的?
<pre>
    对于这个问题,需要考虑的是,props源于组件的定义,但是在用户使用组件时又可以派发,他本质又来源于父组件的派发,该如何做响应式,又该对哪些属性做?
    
    Vue内部实现: 在定义组件时,会为组件类的原型上代理当前props中的所有属性,他们读写都指向了当前实例的_props属性,做响应式的属性为propsData,其源于父组件调用子组件派发的props属性,但又会配合组件内部定义的属性进行筛选,最终作响应式的属性肯定是默认的,同时又是父组件派发的,至于props为何需要做响应式,因为其需要对应的依赖收集,才可以凑使当前的renderWatcher去工作。
</pre>
### 细节2: data是如何做响应式的?
<pre>
函数调用栈: observe -> Observer -> defineReactive | updateArrayPrototype

说一下流程:
    observe: 首先对于用户传入data,我们会在observe中对其进行初步处理,如果非对象类型直接return,如果是一个已经被observer的对象,返回其__ob__属性,否则就利用Observer去做响应式
    Observer: 内部会产生一个Dep实例绑定至当前的Observer实例上,然后会将当前Observer实例以不可枚举__ob__的属性保存在当前数据上,最后再依据数据的具体类型走响应式流程,数组走observeArray,对象走walk,真正意义上的数组响应式是在构造函数中替换数组的原型来实现的。
    defineReactive: 用于向对象定义响应式属性,即生成get & set,在此中值得注意的是利用了闭包机制,使得get & set在运行时都可以找到其闭包中的dep实例和子集的__ob__,相对很容易的实现了依赖收集以及依赖触发

说一下建解:
    正常来说,响应式只需要做到对象具体的key上即可,即为每一个key生成dep实例就行了,问题点在于为啥要为对象或者数组上定义__ob__属性,且__ob__中还生成了dep实例?
    1> Object.defineProperty的缺陷,无法拦截新添加或者删除的属性,也就是通过这两种方式无法触发依赖,因为有了__ob__的存在,我们可以人为定义一些内部手段即$set & $delete改变数据同时同步触发依赖。
    2> 数组需要,数组在响应式实现上并未对每个属性实现,因为性能问题,它的纬度设置在数组级别,即使可以通过修改原型拦截依赖,但问题的重点是该如何触发依赖,__ob__此时扮演的角色很明显。
</pre>

### 细节3: watcher是如何工作的?
<pre>
首先说一下,在Vue中,watcher有3类存在:
    1> computedWatcher, 计算属性初始化产生的watcher, 特征是lazy: true, 创建这种watcher默认是进行惰性的依赖收集,这种watcher在依赖收集时,其expression为get函数。
    2> userWatcher: 通过实例上的$watch产生的watcher, 特征是user: true,这种watcher是三种中唯一具有cb回调的watcher,且其expression为字符串,进行依赖收集时对数据进行层层读取即可。
    3> renderWatcher: 由组件内部在$mount时产生的watcher, 特征是render: true,这种watcher是唯一一种与视图有关系的watcher,其expression为updateComponent。

下来说一下工作流程:
依赖收集时函数调用栈: data.get -> dep.depend & __ob__.dep.depend -> watcher.addDep -> dep.addSub
依赖变更时函数调用栈: data.set -> dep.notify -> watcher.update -> queenWatcher -> nextTick -> watcher.run
</pre>  

### 细节4: Dep与Watcher?
<pre>
上面说了watcher,下面说一下dep,以及这两者的关系:

dep是啥?
    dep是Dep的实例,其与要被检测的数据是一一对应的,假设_data: {key: value},其中_data对应一个dep,{key: value}中含有一个__ob__属性也包含一个dep,dep目的在于收集watcher,方便data变更时,可以让收集的watcher一起去工作,间接影响视图层。

两者关系:
    说一下背景,vue1.x中因为watcher太多的问题导致其无法应用于中大型项目,vue2.x旨在减少vue1.x中watcher的数量,故vue2.x提出了3中类别的watcher,computed和user旨在影响组件状态,render旨在更新视图,这的确很好的解决了watcher太多的问题,同时又更进一步实现了watcher不用时可以手动销毁的方案,所以说这决定了dep与watcher一对多的关系是行不通的。
    真实关系: 多对多
    原因: watcher销毁时可以寻找到引用它的dep,让对应的dep释放它的引用,从而使得垃圾回收完成销毁。
</pre>

### 细节5: Vue中视图的初始化及其更新?
<pre>
首先说一下函数调用栈:
    视图初始化: $mount -> mountComponent -> _render -> _update -> __patch__(el, vnode) -> createElm -> removeNodes([el], 0, 0)
    视图更新: _render -> _update -> __patch__(oldVnode, vnode) -> createElm | patchVnode(oldVnode, vnode) -> updateChildren 

下来说一下详细思路: 
    视图初始化: 首先当我们传入组件配置选项后,会触发内部的_init方法,在当前组件完成状态初始化后,假若是根组件,会进行$mount的调用,间接调用mountComponent内部创建renderWatcher,且开始同步进行_update的调用,不过在_update执行前会先调用_render产生新的vnode传入至_update中,下来会调用__patch(el, vnode),在__patch__中发现el是节点,因此会调用createElm(el, vnode),将vnode转化为真实节点且插入至el中,此时每一次执行createElm,vnode中都将产生一个elm指向真实节点且插入至el,另外值得注意的是子组件会在createElm中调用子组件的管理钩子init,init后由框架进行$mount的调用,__patch__后子组件的实例上就存在了$el,然后回到刚才createElm执行后,将子组件的$el插入至其父节点。
    视图更新: 假设根组件数据变更,会触发根组件的renderWatcher运作,异步去执行_update,且传入_render产生的新的vnode,下来会调用__patch__(oldVnode, vnode),在__patch__中发现oldVnode和vnode都存在且为sameVnode,下面就会调用patchVnode,假若当前的vnode是组件型的vnode,则沿用oldVnode中的组件实例,然后调用prepatch更新当前实例上的属性,假若当前的vnode是标签型vnode,则替换节点的属性、样式和原生事件,假若当前vnode是文本型vnode,则替换textContent即可,剩下的就是更新子集vnode,调用了updateChildren,在updateChildren中对于web操作中常见两种数组操作首尾添加元素和数组排序操作做了优化,尽可能多的去复用节点,尽可能少的以最没办法的双重for循环去寻找更新节点,这里面的优化就是游标策略,游标自走,分别去头,去尾,对角线去,最后双重for循环,外加扫尾(处理新旧子集数组剩余的元素)。
</pre>

### 细节6: 谈一下vue中watch选项和$watch这个api?
<pre>
首先说一下,这两者之间是存在优先级的
调用栈: watch -> createWatch -> $watch

watch选项: 当我们调用组件传递watch选项时,框架内部会得到这个watch选项,然后依次遍历可以得到key -> handler,当然hander还可能是数组,因此还会继续遍历,然后为每一个key以及数组中的每一个元素调用createWatch方法。

creatWatch方法: 里面主要是对handler做具体区分,然后调用实例上的$watch去创建userWatcher,handle可能是函数,handle可能是对象,handler可能是字符串。

$watch方法: 接收三个参数,分别是key,cb回调,以及watcher的对象配置,注意点是这里面会为options里添加user: true,其次可能存在immediate,会立即触发回调,再其次其返回了watcher的teardown函数用于销毁当前watcher。

说一下deep:true的含义:
    这个俗称深度监听,何为深度,意思就是对这个对象进行递归读取,使得这个对象的每一个属性都对当前key产生的watcher具有依赖,即deps中存在当前watcher。
</pre>

### 细节7: 谈一下vue中的事件?
<pre>
首先说一下vue中的事件分为两类,分别是dom原生事件(nativeOn)和组件自定义事件(on)

定义时机:
自定义事件: 定义时机为beforeCreate之前,此事件源头来源于render中的data.on,当创建子组件的vnode时,会将on中的属性以listeners的形式转存至componentOptions中,在子组件进行选项合并时,以_parentListeners的形式保存在当前组件实例的$options中,最终在initEvents中完成初始化。
原生事件: 定义时机为创建完真实节点,插入父级之前,此事件源头来源于render中的data.nativeOn,当创建子组件的vnode时,会往vnode定义on属性指向nativeOn,最终在createElm时,会为当前节点invokeCreateHook里面绑上原生事件。

自定义事件本质?
本质就是一个_events的对象,里面以事件名为key,[]为value保存在组件实例的对象。
</pre>

### 细节8: Vue中Vue构造函数与VueComponent构造函数的渊源?
<pre>
先介绍一下:
Vue: Vue项目的根基,根组件的实例类。
VueComponent: Vue项目的精髓,丰富的组件以及组件关系带来了让人认可的项目,子组件的实例类,vue的衍生类。

说一下在项目中的表现:
Vue: 最先调用,经历过_init -> $mount -> -> _render -> _update -> __patch__ -> createElm -> 子组件的流程 -> insert(el),它是最晚替换至根节点,也是最晚进行$mount。
VueComponent: 经历过createComponent -> init -> $mount -> _render -> _update -> __patch__ -> createElm -> insert(parent)

说一下组件定义:
全局组件: 通过Vue.component或者Vue.extend的定义,但其底层都是通过Vue.extend定义的,区别就是Vue.component对参数进行了一些包装,Vue.extend执行完会返回出一个VueComponent构造函数,这个函数是啥,它的prototype实则来源于vue,其构造函数内部同样调用了原型上_init函数,特殊点就在于VueComponent.options,这块这个options,vue的options来源于全局定义或者混入,而VueComponent的是经过与选项合并而产生的,故其不需要mergeOptions而需要initInternalComponent。
局部组件: 通过配置对象定义的组件,注意这种组件一开始非VueComponent,而是以对象的形式存在于$options.components中,他是在组件转vnode时,通过extend转化为VueComponent的。
</pre> 