;(function (root) {
  'use strict'
  const isFunc = o => o instanceof Function
  const isString = o => typeof o === 'string'
  const isBool = o => typeof o === 'boolean'
  const isObj = o => toString.call(o) === '[object Object]'
  const undef = undefined
  const {assign, defineProperty: defineprop} = Object

  const desc = (value, write, enumerable) => ({
    value,
    write: isBool(write) ? write : false,
    enumerable: isBool(enumerable) ? enumerable : false
  })

  function listener () {
    const container = new Map()
    const actions = {
      delete (type, func) {
        if (actions.has(type, func)) {
          const handlers = container.get(type)
          if (handlers.has(func)) handlers.delete(func)
          if (!handlers.size) container.delete(type)
        }
      },

      set (type, func, once) {
        if (isFunc(func)) {
          if (!container.has(type)) container.set(type, new Set())
          if (once === true) func.__isOnce = true
          container.get(type).add(func)
        }
      },

      get: type => container.get(type),

      has: (type, func) => container.size > 0 && container.has(type) && container.get(type).has(func),

      loop (type, fn) {
        container.has(type) &&
        container.get(type).forEach((handler, handlers) => {
          fn(handler)
          if (handler.__isOnce === true) handlers.delete(handler)
        })
      },

      makeHandle(type, func) {
        if (!isFunc(func)) throw new TypeError('eventsys : listener needs a function')
        const H = {
          on () {
            if (Array.isArray(type)) {
              for (const t of type) actions.set(t, func)
            } else {
              actions.set(type, func)
            }
            return H
          },
          once () {
            if (Array.isArray(type)) {
              for (const t of type) actions.set(t, func, true)
            } else {
              actions.set(type, func, true)
            }
            return H
          },
          off () {
            if (Array.isArray(type)) {
              for (const t of type) actions.delete(t, func)
            } else {
              actions.delete(type, func)
            }
            return H
          }
        }
        return H
      }
    }
    return actions
  }

  /**
   * Adds an Event System to Arbitrary Objects and Classes.
   * @method eventsys
   * @param {Object|Function|Class} obj - object to convert
   */
  function eventsys (obj) {
    if (!obj) obj = {}
    const listeners = listener()
    let stop = false
    return assign(obj, {
      on: (type, func) => listeners.makeHandle(type, func).on(),
      once: (type, func) => listeners.makeHandle(type, func).once(),
      off: (type, func) => listeners.makeHandle(type, func).off(),
      emit(type) {
        if (!stop && isString(type)) {
          const args = [].slice.call(arguments, 1)
          listeners.loop(type, handle => handle.apply(obj, args))
        } else throw new TypeError('eventsys : you cannot emit that! ' + type)
      },
      stopall: state => stop = isBool(state) ? state : true,
      defineHandle(name, type) {
        if (!type) type = name
        obj[name] = (fn, useOnce) => obj[useOnce ? 'once' : 'on'](type, fn)
      }
    })
  }
  /**
   * Creates observables.
   * @method observable
   * @param {Object|Function|Class} obj - object to convert
   */
  function observable (obj, noEventSys) {
    if (!obj) obj = {}
    if (!noEventSys) obj = eventsys(obj)
    const listeners = listener()
    defineprop(obj, 'isObservable', desc(true))
    ;['$get', '$set'].map(prop => {
      const accessor = prop == '$get' ? 'Get' : 'Set'
      defineprop(obj, prop, desc((prop, func) => {
        if (isFunc(prop)) {
          func = prop
          prop = '*'
        }
        if (!isFunc(func)) throw new Error('.' + prop + ' no function')
        func.prop = isString(prop) ? prop : '*'
        return listeners.makeHandle(accessor, func).on()
      }))
    })
    defineprop(obj, 'get', desc(key => {
      if (key != 'get' && key != 'set') {
        let val
        listeners.loop('Get', ln => {
          if (ln.prop === '*' || ln.prop === key) val = ln(key, obj)
        })
        return val != undef ? val : obj[key]
      } else return obj[key]
    }))
    defineprop(obj, 'set', desc((key, value) => {
      let val
      listeners.loop('Set', ln => {
        if (ln.prop === '*' || ln.prop === key) val = ln(key, value, obj, Object.hasOwnProperty(obj, key))
      })
      val = val != undef ? val : value
      if (isObj(val) && !val.isObservable) val = observable(val)
      obj.emit('$uberset:' + key, val)
      obj[key] = val
    }))
    for (let key in obj)
      if (isObj(obj[key]) && !obj[key].isObservable) obj[key] = observable(obj[key])
    if (typeof Proxy != 'undefined') return new Proxy(obj, {
        get(target, key) {
          if (key != 'get' && key != 'set') {
            let val
            listeners.loop('Get', ln => {
              if (ln.prop === '*' || ln.prop === key) val = ln(key, target)
            })
            return val != undef ? val : Reflect.get(target, key)
          } else return Reflect.get(target, key)
        },
        set(target, key, value) {
          let val, onetime = false
          listeners.loop('Set', ln => {
            if (ln.prop === '*' || ln.prop === key) {
              if (onetime) {
                value = val
                onetime = false
              } else onetime = true
              val = ln(key, value, target, !Reflect.has(target, key))
            }
          })
          val = val != undef ? val : value
          if (isObj(val) && !val.isObservable) val = observable(val)
          target.emit('$uberset:' + key, val)
          return Reflect.set(target, key, val)
        }
      })

    console.warn('This JavaScript Environment does not support Proxy, observables need to use the .set and .get accessors to work')
    return obj
  }

  observable.observable = observable
  observable.eventsys = eventsys
  observable.listener = listener

  typeof module !== 'undefined'
    ? module.exports = observable
    : root.define instanceof Function && root.define.amd
      ? root.define(['craft-observable'], () => observable)
      : root.observable = observable
})(typeof global !== 'undefined' ? global : window)
