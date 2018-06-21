;
(function(root) {
  'use strict';
  var isFunc = function(o) {
      return o instanceof Function;
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
    assign = Object.assign,
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
            if (handlers.has(func)) handlers.delete(func);
            if (!handlers.size) container.delete(type);
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
          container.has(type) && container.get(type).forEach(function(handler, handlers) {
            fn(handler);
            if (handler.__isOnce === true) handlers.delete(handler);
          });
        },
        makeHandle: function(type, func) {
          if (!isFunc(func)) throw new TypeError('eventsys : listener needs a function');
          var H = {
            on: function() {
              if (Array.isArray(type)) {
                var _iteratorNormalCompletion = true,
                  _didIteratorError = false,
                  _iteratorError = undefined;
                try {
                  for (var _iterator = type[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var t = _step.value;
                    actions.set(t, func);
                  }
                } catch (err) {
                  _didIteratorError = true;
                  _iteratorError = err;
                } finally {
                  try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                      _iterator.return();
                    }
                  } finally {
                    if (_didIteratorError) {
                      throw _iteratorError;
                    }
                  }
                }
              } else {
                actions.set(type, func);
              }
              return H;
            },
            once: function() {
              if (Array.isArray(type)) {
                var _iteratorNormalCompletion2 = true,
                  _didIteratorError2 = false,
                  _iteratorError2 = undefined;
                try {
                  for (var _iterator2 = type[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var t = _step2.value;
                    actions.set(t, func, true);
                  }
                } catch (err) {
                  _didIteratorError2 = true;
                  _iteratorError2 = err;
                } finally {
                  try {
                    if (!_iteratorNormalCompletion2 && _iterator2.return) {
                      _iterator2.return();
                    }
                  } finally {
                    if (_didIteratorError2) {
                      throw _iteratorError2;
                    }
                  }
                }
              } else {
                actions.set(type, func, true);
              }
              return H;
            },
            off: function() {
              if (Array.isArray(type)) {
                var _iteratorNormalCompletion3 = true,
                  _didIteratorError3 = false,
                  _iteratorError3 = undefined;
                try {
                  for (var _iterator3 = type[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                    var t = _step3.value;
                    actions.delete(t, func);
                  }
                } catch (err) {
                  _didIteratorError3 = true;
                  _iteratorError3 = err;
                } finally {
                  try {
                    if (!_iteratorNormalCompletion3 && _iterator3.return) {
                      _iterator3.return();
                    }
                  } finally {
                    if (_didIteratorError3) {
                      throw _iteratorError3;
                    }
                  }
                }
              } else {
                actions.delete(type, func);
              }
              return H;
            }
          };
          return H;
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
    return assign(obj, {
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
        if (!stop && isString(type)) {
          var args = [].slice.call(arguments, 1);
          listeners.loop(type, function(handle) {
            handle.apply(obj, args);
          });
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
  observable.observable = observable;
  observable.eventsys = eventsys;
  observable.listener = listener;
  typeof module !== 'undefined' ? module.exports = observable : root.define instanceof Function && root.define.amd ? root.define(['craft-observable'], function() {
    return observable;
  }) : root.observable = observable;
})(typeof global !== 'undefined' ? global : window);