(function(root) {
  "use strict";
  var isFunc = function(o) {
      return typeof o === 'function';
    },
    isString = function(o) {
      return typeof o === 'string';
    },
    isBool = function(o) {
      return typeof o === 'boolean';
    },
    isObj = function(o) {
      return toString.call(o) === '[object Object]';
    },
    undef = undefined,
    concatObjects = Object.assign,
    defineprop = Object.defineProperty,
    desc = function(value, write, enumerable) {
      return {
        value: value,
        write: isBool(write) ? write : false,
        enumerable: isBool(enumerable) ? enumerable : false
      };
    };

  function listener() {
    var container = new Map(),
      actions = {
        delete: function(type, func) {
          if (actions.has(type, func)) {
            var handlers = container.get(type);
            if (!handlers.size) container.delete(type);
            if (handlers.has(func)) handlers.delete(func);
          }
        },
        set: function(type, func, once) {
          if (isFunc(func)) {
            if (!container.has(type)) container.set(type, new Set());
            if (once === true) func.__isOnce = true;
            container.get(type).add(func);
          }
        },
        get: function(type) {
          return container.get(type);
        },
        has: function(type, func) {
          return container.size > 0 && container.has(type) && container.get(type).has(func);
        },
        loop: function(type, fn) {
          if (container.size > 0 && container.has(type)) {
            (function() {
              var handlers = container.get(type);
              handlers.forEach(function(handler) {
                fn(handler);
                if (handler.__isOnce === true) handlers.delete(handler);
              });
            })();
          }
        },
        makeHandle: function(type, func) {
          if (!isFunc(func)) throw new TypeError('eventsys : listener needs a function');
          return {
            on: function() {
              Array.isArray(type) ? type.map(function(t) {
                actions.set(t, func);
              }) : actions.set(type, func);
              return this;
            },
            once: function() {
              Array.isArray(type) ? type.map(function(t) {
                actions.set(t, func, true);
              }) : actions.set(type, func, true);
              return this;
            },
            off: function() {
              Array.isArray(type) ? type.map(function(t) {
                actions.delete(t, func);
              }) : actions.delete(type, func);
              return this;
            }
          };
        }
      };
    return actions;
  }
  /**
   * Adds an Event System to Arbitrary Objects and Classes.
   * @method eventsys
   * @param {Object|Function|Class} obj - object to convert
   */
  function eventsys(obj) {
    if (!obj) obj = {};
    var listeners = listener(),
      stop = false;
    return concatObjects(obj, {
      on: function(type, func) {
        return listeners.makeHandle(type, func).on();
      },
      once: function(type, func) {
        return listeners.makeHandle(type, func).once();
      },
      off: function(type, func) {
        return listeners.makeHandle(type, func).off();
      },
      emit: function(type) {
        var _arguments = arguments;
        if (!stop && isString(type)) {
          (function() {
            var args = [].slice.call(_arguments, 1);
            listeners.loop(type, function(handle) {
              handle.apply(obj, args);
            });
          })();
        } else throw new TypeError('eventsys : you cannot emit that! ' + type);
      },
      stopall: function(state) {
        return stop = isBool(state) ? state : true;
      },
      defineHandle: function(name, type) {
        if (!type) type = name;
        obj[name] = function(fn, useOnce) {
          return obj[useOnce ? 'once' : 'on'](type, fn);
        };
      }
    });
  }
  /**
   * Creates observables.
   * @method observable
   * @param {Object|Function|Class} obj - object to convert
   */
  function observable(obj, noEventSys) {
    if (!obj) obj = {};
    if (!noEventSys) obj = eventsys(obj);
    var listeners = listener();
    defineprop(obj, 'isObservable', desc(true));
    ['$get', '$set'].map(function(prop) {
      var accessor = prop == '$get' ? 'Get' : 'Set';
      defineprop(obj, prop, desc(function(prop, func) {
        if (isFunc(prop)) {
          func = prop;
          prop = '*';
        }
        if (!isFunc(func)) throw new Error('.' + prop + ' no function');
        func.prop = isString(prop) ? prop : '*';
        return listeners.makeHandle(accessor, func).on();
      }));
    });
    defineprop(obj, 'get', desc(function(key) {
      if (key != 'get' && key != 'set') {
        var val = void 0;
        listeners.loop('Get', function(ln) {
          if (ln.prop === '*' || ln.prop === key) val = ln(key, obj);
        });
        return val != undef ? val : obj[key];
      } else return obj[key];
    }));
    defineprop(obj, 'set', desc(function(key, value) {
      var val = void 0;
      listeners.loop('Set', function(ln) {
        if (ln.prop === '*' || ln.prop === key) val = ln(key, value, obj, Object.hasOwnProperty(obj, key));
      });
      val = val != undef ? val : value;
      if (isObj(val) && !val.isObservable) val = observable(val);
      obj.emit('$uberset:' + key, val);
      obj[key] = val;
    }));
    for (var key in obj) {
      if (isObj(obj[key]) && !obj[key].isObservable) obj[key] = observable(obj[key]);
    }
    if (typeof Proxy != 'undefined') return new Proxy(obj, {
      get: function(target, key) {
        if (key != 'get' && key != 'set') {
          var val = void 0;
          listeners.loop('Get', function(ln) {
            if (ln.prop === '*' || ln.prop === key) val = ln(key, target);
          });
          return val != undef ? val : Reflect.get(target, key);
        } else return Reflect.get(target, key);
      },
      set: function(target, key, value) {
        var val = void 0,
          onetime = false;
        listeners.loop('Set', function(ln) {
          if (ln.prop === '*' || ln.prop === key) {
            if (onetime) {
              value = val;
              onetime = false;
            } else onetime = true;
            val = ln(key, value, target, !Reflect.has(target, key));
          }
        });
        val = val != undef ? val : value;
        if (isObj(val) && !val.isObservable) val = observable(val);
        target.emit('$uberset:' + key, val);
        return Reflect.set(target, key, val);
      }
    });
    console.warn('This JavaScript Environment does not support Proxy, observables need to use the .set and .get accessors to work');
    return obj;
  }
  if (typeof exports !== 'undefined') {
    module.exports = {
      observable: observable,
      eventsys: eventsys,
      listener: listener
    };
  } else {
    root.observable = observable;
    root.eventsys = eventsys;
    root.listener = listener;
  }
})(this);