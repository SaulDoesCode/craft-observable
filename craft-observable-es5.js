(function (root) {
'use strict';
    var isFunc = function isFunc(o) {
            return typeof o === 'function';
        },
        isString = function isString(o) {
            return typeof o === 'string';
        },
        isObj = function isObj(o) {
            return toString.call(o) === '[object Object]';
        },
        defineprop = Object.defineProperty;

    function eventemitter(obj) {
        var options = {
            evtlisteners: new Set(),
            stop: false,
            on: function on(type, func) {
                if (!isFunc(func)) throw new TypeError('.on(' + type + ',func) : func is not a function');
                func.etype = type;
                options.evtlisteners.add(func);
                return {
                    on: function on() {
                        func.etype = type;
                        options.evtlisteners.add(func);
                        return options;
                    },
                    off: function off() {
                        return options.off(func);
                    }
                };
            },
            once: function once(type, func) {
                function funcwrapper() {
                    func.apply(obj, arguments);
                    options.off(funcwrapper);
                }
                options.on(type, funcwrapper);
            },
            off: function off(func) {
                if (options.evtlisteners.has(func)) options.evtlisteners.delete(func);
                return options;
            },
            emit: function emit(type) {
                var _arguments = arguments;

                if (!options.stop) {
                    (function () {
                        var args = Array.from(_arguments).slice(1);
                        options.evtlisteners.forEach(function (ln) {
                            if (ln.etype == type && !options.stop) ln.apply(obj, args);
                        });
                    })();
                }
                return options;
            },
            stopall: function stopall(stop) {
                if (!is.Bool(stop)) stop = true;
                options.stop = stop;
            },
            defineHandle: function defineHandle(name, type) {
                if (!type) type = name;
                this[name] = function (fn, once) {
                    return options[once == true ? 'once' : 'on'](type, fn);
                };
                return options;
            }
        };
        Object.keys(options).forEach(function (key) {
            defineprop(obj, key, {
                value: options[key],
                enumerable: false,
                writable: false
            });
        });
        return obj;
    }

    function observable(obj) {
        if (obj == undefined) obj = {};
        defineprop(obj, 'listeners', {
            value: {
                Get: new Set(),
                Set: new Set()
            },
            enumerable: false,
            writable: false
        });
        defineprop(obj, 'isObservable', {
            value: true,
            enumerable: false,
            writable: false
        });
        ['$get', '$set'].forEach(function (t) {
            var Type = 'Set';
            if (t == '$get') Type = 'Get';
            defineprop(obj, t, {
                value: function value(prop, func) {
                    if (isFunc(prop)) {
                        func = prop;
                        prop = '*';
                    }
                    if (!isFunc(func)) throw new Error('no function');
                    var listener = {
                        prop: isString(prop) ? prop : '*',
                        fn: func
                    };
                    var options = {
                        get on() {
                            obj.listeners[Type].add(listener);
                            return options;
                        },
                        get off() {
                            obj.listeners[Type].delete(listener);
                            return options;
                        }
                    };
                    return options.on;
                },

                enumerable: false,
                writable: false
            });
        });

        defineprop(obj, '$change', {
            value: function value(prop, func) {
                if (!isFunc(func)) throw new Error('no function');
                var listener = {
                    prop: isString(prop) ? prop : '*',
                    fn: func,
                    multi: true
                };
                var options = {
                    get on() {
                        obj.listeners.Get.add(listener);
                        obj.listeners.Set.add(listener);
                        return options;
                    },
                    get off() {
                        obj.listeners.Get.delete(listener);
                        obj.listeners.Set.delete(listener);
                        return options;
                    }
                };
                return options.on;
            },

            enumerable: false,
            writable: false
        });
        defineprop(obj, 'get', {
            value: function value(key) {
                if (key != 'get' && key != 'set') {
                    var val = void 0;
                    obj.listeners.Get.forEach(function (ln) {
                        if (ln.prop === '*' || ln.prop === key) val = ln.multi ? ln.fn('get', key, obj) : ln.fn(key, obj);
                    });
                    return val != undefined ? val : obj[key];
                } else return obj[key];
            },

            enumerable: false
        });
        defineprop(obj, 'set', {
            value: function value(key, _value) {
                var val = void 0;
                obj.listeners.Set.forEach(function (ln) {
                    if (ln.prop === '*' || ln.prop === key) val = ln.multi ? ln.fn('set', key, _value, obj, Object.hasOwnProperty(obj, key)) : ln.fn(key, _value, obj, Object.hasOwnProperty(obj, key));
                });
                val = val != undef ? val : _value;
                if (isObj(val) && !val.isObservable) val = observable(val);
                target.emit('$uberset:' + key, val);
                obj[key] = val;
            },

            enumerable: false
        });
        obj = eventemitter(obj);
        Object.keys(obj).forEach(function (key) {
            if (is.Object(obj[key]) && !obj[key].isObservable) obj[key] = observable(obj[key]);
        });
        if (root.Proxy) return new Proxy(obj, {
            get: function get(target, key) {
                if (key != 'get' && key != 'set') {
                    var val = void 0;
                    target.listeners.Get.forEach(function (ln) {
                        if (ln.prop === '*' || ln.prop === key) val = ln.multi ? ln.fn('get', key, target) : ln.fn(key, target);
                    });
                    return val != undefined ? val : Reflect.get(target, key);
                } else return Reflect.get(target, key);
            },
            set: function set(target, key, value) {
                var val = void 0,
                    onetime = false;
                target.listeners.Set.forEach(function (ln) {
                    if (ln.prop === '*' || ln.prop === key) {
                        if (onetime) {
                            value = val;
                            onetime = false;
                        } else onetime = true;
                        val = ln.multi ? ln.fn('set', key, value, target, !Reflect.has(target, key)) : ln.fn(key, value, target, !Reflect.has(target, key));
                    }
                });
                val = val != undefined ? val : value;
                if (isObj(val) && !val.isObservable) val = observable(val);
                target.emit('$uberset:' + key, val);
                return Reflect.set(target, key, val);
            }
        });
        else {
            console.warn('This Browser does not support Proxy, observables need to use the .set and .get accessors to work');
            return obj;
        }
    }

    if (typeof exports !== 'undefined') {
        module.exports = {
            observable: observable,
            eventemitter: eventemitter
        };
    } else {
        root.observable = observable;
        root.eventemitter = eventemitter;
    }
})(this);
