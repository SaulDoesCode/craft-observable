(function (root) {
    "use strict";
    var isFunc = function (o) {
            return typeof o === 'function';
        },
        isString = function (o) {
            return typeof o === 'string';
        },
        isBool = function (o) {
            return typeof o === 'boolean';
        },
        isObj = function (o) {
            return toString.call(o) === '[object Object]';
        },
        undef = undefined,
        defineprop = Object.defineProperty,
        desc = function (value, write, enumerable) {
            return {
                value: value,
                write: isBool(write) ? write : false,
                enumerable: isBool(enumerable) ? enumerable : false
            };
        };

    function eventsys(obj) {
        if (!obj) obj = {};
        var listeners = new Set(),
            stop = false;

        function on(type, func) {
            if (!isFunc(func)) throw new TypeError('.on() needs a function');
            func.type = type;
            listeners.add(func);
            func.handle = {
                on: function () {
                    listeners.add(func);
                    return func.handle;
                },
                once: function () {
                    return once(type, func);
                },
                off: function () {
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
            var _arguments = arguments,
                _this = this;
            if (!stop && listeners.size > 0) {
                (function () {
                    var args = [].slice.call(_arguments, 1),
                        ctx = _this;
                    listeners.forEach(function (ln) {
                        if (ln.type == type && !stop) ln.apply(ctx, args);
                    });
                })();
            }
        }

        function stopall(state) {
            stop = isBool(state) ? state : true;
        }

        function defineHandle(name, type) {
            if (!type) type = name;
            this[name] = function (fn, useOnce) {
                return (useOnce == true ? once : on)(type, fn);
            };
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
        var listeners = {
            Get: new Set(),
            Set: new Set()
        };
        defineprop(obj, 'isObservable', desc(true));
        ['$get', '$set'].forEach(function (prop) {
            var accessor = prop == '$get' ? 'Get' : 'Set';
            defineprop(obj, prop, desc(function (prop, func) {
                if (isFunc(prop)) {
                    func = prop;
                    prop = '*';
                }
                if (!isFunc(func)) throw new Error('.' + prop + ' no function');
                var listener = {
                        prop: isString(prop) ? prop : '*',
                        fn: func
                    },
                    options = {
                        on: function () {
                            listeners[accessor].add(listener);
                            return options;
                        },
                        off: function () {
                            listeners[accessor].delete(listener);
                            return options;
                        }
                    };
                return options.on();
            }));
        });
        defineprop(obj, '$change', desc(function (prop, func) {
            if (isFunc(prop)) {
                func = prop;
                prop = '*';
            }
            if (!isFunc(func)) throw new Error('.$change : no function');
            var listener = {
                    prop: isString(prop) ? prop : '*',
                    fn: func,
                    multi: true
                },
                options = {
                    on: function () {
                        listeners.Get.add(listener);
                        listeners.Set.add(listener);
                        return options;
                    },
                    off: function () {
                        listeners.Get.delete(listener);
                        listeners.Set.delete(listener);
                        return options;
                    }
                };
            return options.on;
        }));
        defineprop(obj, 'get', desc(function (key) {
            if (key != 'get' && key != 'set') {
                var val = void 0;
                listeners.Get.forEach(function (ln) {
                    if (ln.prop === '*' || ln.prop === key) val = ln.multi ? ln.fn('get', key, obj) : ln.fn(key, obj);
                });
                return val != undef ? val : obj[key];
            } else return obj[key];
        }));
        defineprop(obj, 'set', desc(function (key, value) {
            var val = void 0;
            listeners.Set.forEach(function (ln) {
                if (ln.prop === '*' || ln.prop === key) val = ln.multi ? ln.fn('set', key, value, obj, Object.hasOwnProperty(obj, key)) : ln.fn(key, value, obj, Object.hasOwnProperty(obj, key));
            });
            val = val != undef ? val : value;
            if (isObj(val) && !val.isObservable) val = observable(val);
            obj.emit('$uberset:' + key, val);
            obj[key] = val;
        }));
        for (var key in obj) {
            if (isObj(obj[key]) && !obj[key].isObservable) obj[key] = observable(obj[key]);
        }
        if (typeof Proxy != "undefined") return new Proxy(obj, {
            get: function (target, key) {
                if (key != 'get' && key != 'set') {
                    var val = void 0;
                    listeners.Get.forEach(function (ln) {
                        if (ln.prop === '*' || ln.prop === key) val = ln.multi ? ln.fn('get', key, target) : ln.fn(key, target);
                    });
                    return val != undef ? val : Reflect.get(target, key);
                } else return Reflect.get(target, key);
            },
            set: function (target, key, value) {
                var val = void 0,
                    onetime = false;
                listeners.Set.forEach(function (ln) {
                    if (ln.prop === '*' || ln.prop === key) {
                        if (onetime) {
                            value = val;
                            onetime = false;
                        } else onetime = true;
                        val = ln.multi ? ln.fn('set', key, value, target, !Reflect.has(target, key)) : ln.fn(key, value, target, !Reflect.has(target, key));
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
            observable: observable,
            eventsys: eventsys
        };
    } else {
        root.observable = observable;
        root.eventsys = eventsys;
    }
})(this);
