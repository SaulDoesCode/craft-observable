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
    if(value.includes(' ')) {
    
      value = value.split(' ');
      
      return {
        firstname : value[0],
        lastname : value[1],
      }
    }
  });
  
  farm.farmer = 'Bob Brown';
  
  console.log(farm.farmer); // -> { firstname : "Bob" , lastname : "Brown" }
  
  farm.animals = {};
  
  farm.animals.$get('*', (key,val,obj) => {
    if(obj[key] == undefined) return `The farm has no ${key}`
  });
  
  console.log(farm.sheep); // -> the farm has no sheep
```
