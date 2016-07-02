(function (root) {
    "use strict";
    const isFunc = o => typeof o === 'function',
        isString = o => typeof o === 'string',
        isBool = o => typeof o === 'boolean',
        isObj = o => toString.call(o) === '[object Object]',
        undef = undefined,
        defineprop = Object.defineProperty,
        desc = (value, write, enumerable) => ({
            value,
            write: isBool(write) ? write : false,
            enumerable: isBool(enumerable) ? enumerable : false,
        })

    function eventsys(obj) {
        if (!obj) obj = {};
        let listeners = new Set,
            stop = false;

        function on(type, func) {
            if (!isFunc(func)) throw new TypeError('.on() needs a function');
            func.type = type;
            listeners.add(func);
            func.handle = {
                on() {
                    listeners.add(func);
                    return func.handle;
                },
                once: () => once(type, func),
                off() {
                    off(func);
                    return func.handle;
                }
            };
            return func.handle;
        }

        function once(type, func) {
            off(func);

            function funcwrapper() {
                func.apply(obj, arguments);
                off(funcwrapper);
            }
            return on(type, funcwrapper);
        }

        function off(func) {
            if (listeners.has(func)) listeners.delete(func);
        }

        function emit(type) {
            if (!stop && listeners.size > 0) {
                let args = [].slice.call(arguments, 1),
                    ctx = this;
                listeners.forEach(ln => {
                    if (ln.type == type && !stop) ln.apply(ctx, args);
                });
            }
        }

        function stopall(state) {
            stop = isBool(state) ? state : true;
        }

        function defineHandle(name, type) {
            if (!type) type = name;
            this[name] = (fn, useOnce) => (useOnce == true ? once : on)(type, fn);
        }

        obj.on = on;
        obj.once = once;
        obj.off = on;
        obj.emit = emit;
        obj.defineHandle = defineHandle;
        obj.stopall = stopall;

        return obj;
    }

    function observable(obj) {
        if (!obj) obj = {};
        obj = eventsys(obj);

        let listeners = {
            Get: new Set,
            Set: new Set,
        };
        defineprop(obj, 'isObservable', desc(true));
        ['$get', '$set'].forEach(prop => {
            let accessor = prop == '$get' ? 'Get' : 'Set';
            defineprop(obj, prop, desc((prop, func) => {
                if (isFunc(prop)) {
                    func = prop;
                    prop = '*';
                }
                if (!isFunc(func)) throw new Error('.'+prop+' no function');
                let listener = {
                    prop: isString(prop) ? prop : '*',
                    fn: func,
                }
                let options = {
                    on() {
                        listeners[accessor].add(listener);
                        return options
                    },
                    off() {
                        listeners[accessor].delete(listener);
                        return options
                    },
                };
                return options.on();
            }));
        });

        defineprop(obj, '$change', desc((prop, func) => {
            if (isFunc(prop)) {
                func = prop;
                prop = '*';
            }
            if (!isFunc(func)) throw new Error('.$change : no function');
            let listener = {
                prop: isString(prop) ? prop : '*',
                fn: func,
                multi: true,
            }
            let options = {
                on() {
                    listeners.Get.add(listener);
                    listeners.Set.add(listener);
                    return options
                },
                off() {
                    listeners.Get.delete(listener);
                    listeners.Set.delete(listener);
                    return options
                },
            };
            return options.on;
        }));
        defineprop(obj, 'get', desc(key => {
            if (key != 'get' && key != 'set') {
                let val;
                listeners.Get.forEach(ln => {
                    if (ln.prop === '*' || ln.prop === key) val = ln.multi ? ln.fn('get', key, obj) : ln.fn(key, obj);
                });
                return val != undef ? val : obj[key];
            } else return obj[key];
        }));
        defineprop(obj, 'set', desc((key, value) => {
            let val;
            listeners.Set.forEach(ln => {
                if (ln.prop === '*' || ln.prop === key) val = ln.multi ? ln.fn('set', key, value, obj, Object.hasOwnProperty(obj, key)) :
                    ln.fn(key, value, obj, Object.hasOwnProperty(obj, key));
            });
            val = val != undef ? val : value;
            if (isObj(val) && !val.isObservable) val = observable(val);
            obj.emit('$uberset:' + key, val);
            obj[key] = val;
        }));

        for (let key in obj)
            if (isObj(obj[key]) && !obj[key].isObservable) obj[key] = observable(obj[key]);
        if (typeof Proxy != "undefined") return new Proxy(obj, {
            get(target, key) {
                if (key != 'get' && key != 'set') {
                    let val;
                    listeners.Get.forEach(ln => {
                        if (ln.prop === '*' || ln.prop === key) val = ln.multi ? ln.fn('get', key, target) : ln.fn(key, target);
                    });
                    return val != undef ? val : Reflect.get(target, key);
                } else return Reflect.get(target, key);
            },
            set(target, key, value) {
                let val, onetime = false;
                listeners.Set.forEach(ln => {
                    if (ln.prop === '*' || ln.prop === key) {
                        if (onetime) {
                            value = val;
                            onetime = false;
                        } else onetime = true;
                        val = ln.multi ? ln.fn('set', key, value, target, !Reflect.has(target, key)) :
                            ln.fn(key, value, target, !Reflect.has(target, key));
                    }
                });
                val = val != undef ? val : value;
                if (isObj(val) && !val.isObservable) val = observable(val);
                target.emit('$uberset:' + key, val);
                return Reflect.set(target, key, val);
            }
        });

        console.warn('This Browser does not support Proxy, observables need to use the .set and .get accessors to work');
        return obj;
    }

    if (typeof exports !== 'undefined') {
        module.exports = {
            observable,
            eventsys,
        }
    } else {
        root.observable = observable;
        root.eventsys = eventsys;
    }
})(this);
