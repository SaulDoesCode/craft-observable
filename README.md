# craft-observable

small proxy driven observable objects to fit any framework or library

## craft-observable uses

- Proxy (optional)
- ES6 syntax (optional)
- Set
- Array.from
- Object.assign

## observables have the following properties

- .isObservable - true if it is an observable
- .set, .get - old school non proxy accessors
- .$set, .$get - listeners for access events
- .on , .once , .off , .emit, .stopall - event system
- .defineHandle - define event methods instead of using .on('xyz',function) all the time

### observables code demo

basic instanciator `observable(=[obj|function])`

```javascript
  // node.js style requiring works but will be global if not available
  const { observable, eventsys } = require('craft-observable');

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
  // if proxy is not available in your browser || javascript environment use the traditional get and set accessor methods
  console.log(farm.animals.get('sheep')); // -> the farm has no sheep

  console.log(farm.animals.cows); // -> the farm has 2 cows
```

### event system

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
  // or
  uiChange.once();
```

### separate use of event system

```javascript
  let messager = eventsys({});

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

## crazy meta objects

implement cool features by chaging the behavior of objects
here is an example of what is possible, note this is probably a bad example
but still it demonstrates the potential of observables to create new behaviour in objects
```javascript
  const fs = require('fs');
  const {observable} = require('craft-observable');
  const metaobject = observable({
    logloc : './log.txt'
  });


  metaobject.$set('log',(key,val,obj) => {
    fs.appendFile(obj.logloc, val, err => {
        if (err) throw err;
        console.log(val);
    });
  });

  metaobject.$get('log',(key,obj) => fs.readFileSync(obj.logloc,'utf8'));

  const getfile = observable();

  getfile.$get((key,obj) => {
    const path = __dirname+'/'+key;
    const stats = fs.statSync(path);
    if(stats.isFile()) return fs.readFileSync(path,'utf8');
  });

  const server = require('http').createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.end(getfile['index.html']);
    metaobject.log = `${Date.now()} : request made \n`;
  });

  server.listen(3000, '127.0.0.1', () => {
    console.log(`Server running at http://127.0.0.1:3000/`);
  });
```

## Notes

This little doodle is subject to change but we'll try and keep it working as much as posible with no breaking changes. if you are experiencing issues or want to improve a feature do fork, raise issues tell us about bugs and so forth.

Thank you very much enjoy the observables
