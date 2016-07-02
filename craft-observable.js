(function (root) {
"use strict";
    let isFunc = o => typeof o === 'function',
        isString = o => typeof o === 'string',
        isBool = o => typeof o === 'boolean',
        isObj = o => toString.call(o) === '[object Object]',
        defineprop = Object.defineProperty;

    function eventemitter(obj) {
        let options = {
            evtlisteners: new Set,
            stop: false,
            on(type, func) {
                if (!isFunc(func)) throw new TypeError('.on() needs a function');
                func.etype = type;
                options.evtlisteners.add(func);
                func.ehandle = {
                    on() {
                        func.etype = type;
                        options.evtlisteners.add(func);
                        return func.ehandle;
                    },
                    once() {
                      return options.off(func).once(type,func);
                    },
                    off() {
                      options.off(func);
                      return func.ehandle;
                    }
                };
                return func.ehandle
            },
            once(type, func) {
                function funcwrapper() {
                    func.apply(obj, arguments);
                    options.off(funcwrapper);
                }
                return options.on(type, funcwrapper);
            },
            off(func) {
                if (options.evtlisteners.has(func)) options.evtlisteners.delete(func);
                return options;
            },
            emit(type) {
                if (!options.stop && options.evtlisteners.size > 0) {
                    let args = [].slice.call(arguments,1);
                    options.evtlisteners.forEach(ln => {
                        if (ln.etype == type && !options.stop) ln.apply(obj, args);
                    });
                }
                return options;
            },
            stopall(stop) {
                options.stop = isBool(bool) ? stop : true;
            },
            defineHandle(name, type) {
                if (!type) type = name;
                this[name] = (fn, once) => options[once == true ? 'once' : 'on'](type, fn);
                return options;
            },
        };
        return Object.assign(obj,options);
    }

    function observable(obj) {
        if (obj == undefined) obj = {};
        defineprop(obj, 'listeners', {
            value: {
                Get: new Set,
                Set: new Set,
            },
            enumerable: false,
            writable: false,
        });
        defineprop(obj, 'isObservable', {
            value: true,
            enumerable: false,
            writable: false,
        });
        ['$get', '$set'].forEach(t => {
            let Type = 'Set';
            if (t == '$get') Type = 'Get';
            defineprop(obj, t, {
                value(prop, func) {
                    if (isFunc(prop)) {
                        func = prop;
                        prop = '*';
                    }
                    if (!isFunc(func)) throw new Error('no function');
                    let listener = {
                        prop: isString(prop) ? prop : '*',
                        fn: func,
                    }
                    let options = {
                        get on() {
                            obj.listeners[Type].add(listener);
                            return options
                        },
                        get off() {
                            obj.listeners[Type].delete(listener);
                            return options
                        },
                    };
                    return options.on;
                },
                enumerable: false,
                writable: false,
            });
        });

        defineprop(obj, '$change', {
            value(prop, func) {
                if (!isFunc(func)) throw new Error('no function');
                let listener = {
                    prop: isString(prop) ? prop : '*',
                    fn: func,
                    multi: true,
                }
                let options = {
                    get on() {
                        obj.listeners.Get.add(listener);
                        obj.listeners.Set.add(listener);
                        return options
                    },
                    get off() {
                        obj.listeners.Get.delete(listener);
                        obj.listeners.Set.delete(listener);
                        return options
                    },
                };
                return options.on;
            },
            enumerable: false,
            writable: false,
        });
        obj = eventemitter(obj);
        defineprop(obj, 'get', {
            value(key) {
                if (key != 'get' && key != 'set') {
                    let val;
                    obj.listeners.Get.forEach(ln => {
                        if (ln.prop === '*' || ln.prop === key) val = ln.multi ? ln.fn('get', key, obj) : ln.fn(key, obj);
                    });
                    return val != undefined ? val : obj[key];
                } else return obj[key];
            },
            enumerable: false,
        });
        defineprop(obj, 'set', {
            value(key, value) {
                let val;
                obj.listeners.Set.forEach(ln => {
                    if (ln.prop === '*' || ln.prop === key) val = ln.multi ? ln.fn('set', key, value, obj, Object.hasOwnProperty(obj, key)) :
                        ln.fn(key, value, obj, Object.hasOwnProperty(obj, key));
                });
                val = val != undef ? val : value;
                if (isObj(val) && !val.isObservable) val = observable(val);
                obj.emit('$uberset:' + key, val);
                obj[key] = val;
            },
            enumerable: false,
        });
        Object.keys(obj).forEach(key => {
          if(isObj(obj[key]) && !obj[key].isObservable) obj[key] = observable(obj[key]);
        });
        if (root.Proxy) return new Proxy(obj, {
            get(target, key) {
                if (key != 'get' && key != 'set') {
                    let val;
                    target.listeners.Get.forEach(ln => {
                        if (ln.prop === '*' || ln.prop === key) val = ln.multi ? ln.fn('get', key, target) : ln.fn(key, target);
                    });
                    return val != undefined ? val : Reflect.get(target, key);
                } else return Reflect.get(target, key);
            },
            set(target, key, value) {
                let val, onetime = false;
                target.listeners.Set.forEach(ln => {
                    if (ln.prop === '*' || ln.prop === key) {
                        if (onetime) {
                            value = val;
                            onetime = false;
                        } else onetime = true;
                        val = ln.multi ? ln.fn('set', key, value, target, !Reflect.has(target, key)) :
                            ln.fn(key, value, target, !Reflect.has(target, key));
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
        observable,
        eventemitter,
      }
    } else {
        root.observable = observable;
        root.eventemitter = eventemitter;
    }
})(this)
