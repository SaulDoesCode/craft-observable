# craft-observable
small proxy driven observable objects to fit any framework or library

### craft-observable uses
* Proxy (optional)
* Sets
* Array.from

### craft-observable code demo

```javascript
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
  
  farm.animals.$get((key, obj) => `the farm has ${obj[key] == undefined ? 'no ' + key : obj[key] + ' ' + key}`);
  
  console.log(farm.animals.sheep); // -> the farm has no sheep
  // if proxy is not available in your browser use the traditional get and set accessor methods
  console.log(farm.animals.get('sheep')); // -> the farm has no sheep
  
  console.log(farm.animals.sheep); // -> the farm has 2 cows
```
