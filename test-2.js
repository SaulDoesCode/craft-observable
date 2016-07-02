const test = require('ava');
const {
    eventsys,
    observable
} = require('./craft-observable.js');

test('eventsys', t => {
    t.plan(1);
    let notifier = eventsys();

    notifier.on('test', n => {
        t.is(n, 'it works!');
    });

    notifier.emit('test', 'it works!');

});

test('observable:isObservable', t => {
    t.true(observable().isObservable, 'observable.isObservable is not true');
});

test('observable:get', t => {
    t.plan(3);

    let gettest = observable();

    gettest.$get('fruit', () => "there aren't any fruit");

    t.truthy(gettest.fruit, 'proxy based getters are broken');

    t.truthy(gettest.get('fruit'), 'observable.get(key) not working');

    gettest.fruit = 'Pineapple';

    t.not(gettest.fruit, 'Pineapple', 'getter return values are not sticking!, also pineapples :P');

});

test('observable:set', t => {
    t.plan(4);

    let settest = observable();

    settest.$set('name', (key, value, obj) => {
        t.is(key, 'name');
        return 'My name is ' + value;
    });

    settest.name = 'Bob';

    t.is(settest.name, 'My name is Bob', 'His name is not Bob, proxy based setters broken');

    settest.set('name', 'Bernie');

    t.is(settest.get('name'), 'My name is Bernie', 'His name is not Bob, .set(key,val) setters broken');

});


test('observable:nested', t => {
    t.plan(3);

    let base = observable({
        nest1: {
            nest2: {}
        }
    });

    t.true(base.nest1.isObservable)

    t.true(base.nest1.nest2.isObservable)

    base.nest1.nest2.nest3 = {};

    t.true(base.nest1.nest2.nest3.isObservable)

});
