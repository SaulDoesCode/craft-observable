## craft-observable
small proxy driven observable objects to fit any framework or library

#### craft-observable uses
* Proxy (optional)
* ES6 syntax (optional)
* Set
* Array.from
* Object.assign

#### observables code demo
basic instanciator ``observable(=[obj|function])``

```javascript
  // node.js style requiring works but will be global if not available
  const { observable, eventemitter } = require('craft-observable');

  let farm = observable();

  // listen for set events
  farm.$set('farmer', (key, value, observable, isnew) => {
      console.log('a new farmer is set');
      if (value.includes(' ')) {
          value = value.split(' ');
          return {
              firstname: value[0],
              lastname: value[1],
          }
      }
  });

  farm.farmer = 'Bob Brown';

  console.log(farm.farmer); // -> { firstname : "Bob" , lastname : "Brown" }

  farm.animals = {
    cows: 2
  };

  farm.animals.$get((key, obj) => {
      return `the farm has ${obj[key] == undefined ? 'no ' + key : obj[key] + ' ' + key}`;
  });

  console.log(farm.animals.sheep); // -> the farm has no sheep
  // if proxy is not available in your browser use the traditional get and set accessor methods
  console.log(farm.animals.get('sheep')); // -> the farm has no sheep

  console.log(farm.animals.cows); // -> the farm has 2 cows
```
#### event system
the observables also include a build in event system to help make them as useful as possible
```javascript
  let notifier = observable();

  notifier.on('ui-change',(html,...otherargs) => {
    let article = document.createElement('article');
    article.innerHTML = html;
    document.querySelector('div.articles').appendChild(article);
  });

  // some seriously async code
  fetch('/doodle.html')
  .then(checkerrors)
  .then(response => response.text())
  .then(text => {
    notifier.emit('ui-change',text);
  });

  // to access methods on the listener assign it as a variable
  let uiChange = notifier.on('ui-change',(html,...otherargs) => {
    let article = document.createElement('article');
    article.innerHTML = html;
    document.querySelector('div.articles').appendChild(article);
  });
  // lets say you want to stop recieving ui-change events
  uiChange.off();
  // but now you want to enable them again
  uiChange.on();
```
#### separate use of event system

```javascript
  let messager = eventemitter({});

  // .on, .once listeners have same interface
  messager.on('msg', event => {
    console.log('new message',event);
  });

  // .emit takes a string event identifier
  // any arguments that follow will be sent to listeners
  // there are no type biases any argument will do
  messager.emit('msg',{
    body : 'new piece of information'
  });

  messager.emit('msg','new piece of info','code 3' /*...*/);
  // this halts any events being emited
  // .stopall([true|false])
  messager.stopall(); // stopped
  // the bool is optional to turn event emitting on again
  // just call .stopall again with false
  messager.stopall(false); // working again
```

### observables have the following properties
* .isObservable - true if it is an observable
* .set, .get - old school non proxy accessors
* .$set, .$get, .$change - listeners for access events
* .on , .once , .off , .emit, .stopall - event system
* .listeners - all the accessor listeners
* .evtlisteners - event listeners
* .defineHandle - define event methods instead of using .on('xyz',function) all the time

### Notes
This little doodle is subject to change but we'll try and keep it working as much as posible
with no breaking changes. if you are experiencing issues or want to improve a feature do fork,
raise issues tell us about bugs and so forth.

Thank you very much enjoy the observables
