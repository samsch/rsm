# RSM

A modern state management library designed for React.

## Why

RSM (React State Manager) is a modern library designed using the lessons learned from Flux and Redux, integrating the functionality of Sagas, and using Kefir observables.

## Main features over competing solutions

- Low boilerplate
- Built-in side effect and async handling
- Scalable, reusable functionality modeling
- Lens-based state tree slicing

## What the basics look like

> If you clone the repo, this example can be run with `npm run example-1`.

```jsx
// index.js
import 'babel-polyfill'; // Not needed for modern browsers
import React from 'react';
import ReactDOM from 'react-dom';
import { createStore, Rsm } from '@samsch/rsm';
import Counter from './Counter';

const store = createStore({});

ReactDOM.render(
  <Rsm store={store}>
    <Counter />
  </Rsm>,
  document.getElementById('root')
);
```
```jsx
// Counter.js
import React from 'react';
import { makeStateComponent } from './rsm';

const actions = {
  increment: () => state => ({ count: state.count + 1 }),
  decrement: () => state => ({ count: state.count - 1 }),
};

const initialState = { count: 0 };

const State = makeStateComponent({ actions });

const Counter = () => (
  <State initialState={initialState} lens={['defaultCounter']}>
    {(state, actions) => (
      <div>
        <div>
          Count: {state.count}
        </div>
        <div>
          <button type="button" onClick={actions.increment}>+1</button>
          {' '}
          <button type="button" onClick={actions.decrement}>-1</button>
        </div>
      </div>
    )}
  </State>
);
```

## Features

### Action timing
RSM always updates asynchronously. All actions fired together sychronous will be applied (in order) in the next tick, and produce only a single state update. (You can verify this by turning on debug mode with createStore and firing two actions in a row.)

### Sagas
RSM includes integrated saga support, which default to operating at a local scale. It also exposes observable streams of actions which can be used for global behaviors or implementing global sagas.

### React Integration
RSM is integrated in React by default. Future versions will split out a local state slice abstraction separately from the React integration.

### Size
RSM is fairly small, only around 15kb of library code, and 61.4kb including it's dependencies (kefir.js and a couple Ramda functions). In comparison, redux, react-redux, and redux-saga together come to about 46.6kb.

> These numbers come from a test using Webpack V4, where each set of libraries is imported into a single file and exported to be built as a library, with React set as an external dependency. If you already use sub-dependencies (such as kefir for RSM), then part of this build size won't really apply additionally when importing.

# API

## createStore
To create the actual RSM store, call this function with your base initial state. In many cases, you can just use an empty object.

```js
import { createStore } from '@samsch/rsm';

const store = createStore({});
```

createStore also takes a second argument which when `true`, enables debug logging of actions and new state.
```js
const store = createStore({}, true);
```

## store
The store object returned by `createStore(...)` has four properties:
- `dispatch`
- `actionStream`
- `property`
- `subscribe`

### dispatch(action: Function, ref: Function|any, args: any)
Dispatch is how you apply action to the store. It's called with an update function which takes the current state and returns a new state (immutably).

The `action` argument should generally be a function like `state => ({ ...state, <new items> })`.

> `dispatch()` takes two more arguments, which are not used by the current implementation, but are included in the `actionStream` values. `ref` should be a reference to the original action function (or another identifier), and `args` should be the arguments passed to the original action function. If you include these values, you can create global (saga or saga-like) functionality based on the passed values and observing the `actionStream`.

If using dispatch directly, usually you will create reusable action functions of the form `arg => state => newState`. Such as:
```js
const someAction = newValue => state => ({ ...state, value: newValue });
```
This would then be called and passed to dispatch like `store.dispatch(someAction('a value'))`.

### actionStream
`actionStream` is a Kefir stream of actions, which are pushed sequencially and synchronously after a store update. If you need to implement global behavior based on actions (rather than new state), this is the correct API.

As a Kefir stream, you observe with `actionStream.observe({ value: observerFunc })`, where `observerFunc` is a function which is passed the actions as objects shaped like `{ action, ref, args }`, which are the exact argument of the same names which dispatch was called with. All other Kefir methods are available as well (scan, map, etc).

### property
`property` is the actual state store itself, in the form of a Kefir Property. If you need to syncronously get the value of the state, you can pass a function and then unsubscribe immediatly.
```js
const useState = state => console.log('Current state', state);
property.observe({
  value: useState,
}).unsubscribe();
// useState will be called during the execution of observe.
```

### subscribe(listener: Function)
`subscribe()` is the primary interface for reacting to state updates. `subscribe` takes a single argument, a listener function which also takes a single argument and will be called with the new state on any update. `subscribe()` returns an unsubscribe function to stop listening.

> Note that `subscribe` is nearly identical to Redux's subscribe method, but while Redux doesn't pass any arguments to it's listeners, RSM does pass the current state.

## Rsm <React.Component({ children, store, initialState })>
RSM uses React context to make the store available throughout a React tree. To use this, you need to put the Rsm component above any consumers, and usually at the top of your React tree, like this
```jsx
import { createStore, Rsm } from '@samsch/rsm';

const store = createStore({});

ReactDOM.render(
  <Rsm store={store}>
    <App />
  </Rsm>,
  document.getElementById('root')
);
```

The `Rsm` component uses three different props: `children`, `store`, and `initialState`. The `children` passed to `Rsm` will simply be rendered plainly. If you pass a `store` prop, `Rsm` will use that as the store (and ignore an `initialState` prop). Alternatively, you can not pass a `store` prop and `Rsm` will call `createStore(props.initialState)` internally, using the `initialState` prop as the first argument.

## makeStateComponent({ lens, initialState, actions })
The `makeStateComponent()` export creates a `State` React component. You can pass `initialState`, `actions`, and `lens` properties to `makeStateComponent` as defaults, and you can override these with props on the `State` component. All of these properties are optional.

## State <React.Component({ children, lens, initialState, actions, saga })>
The `State` component is the main interface you will use to interact with RSM. It operates on a slice of the state, and injects the state and given actions into the React tree. All `State` props are optional.

> Props passed to `State` are a strong override of the values passed to `makeStateComponent`. So even if you pass an undefined prop to `State`, that will override a value from `makeStateComponent`.

### children
The `State` component expects a children [render prop](https://reactjs.org/docs/render-props.html).
```jsx
<State>
  {(state, actions) => (
    <div>...</div>
  )}
</State>
```
This component will update (and call the render prop) on any state update which changes the state slice defined by the `lens`, or when given new props.

### lens
The `State` component works on a slice of the full store state, defined by the `lens`. The `lens` is an array of property names and indexes which maps to some part of your state tree. So if you want to work with just `d` from a state of
```js
{
  a: [
    {
      c: {
        d: {},
      },
    },
    {},
  ],
  b: [],
}
```
Then you should pass a lens of `['a', 0, 'c', 'd']`. Using this lens, only the object referenced by `state.a[0].c.d` will be passed to the `State` children and `actions`.

> The value of lens is passed directly to [`R.lensPath()` from Ramda](https://ramdajs.com/docs/#lensPath), which is then used for getting from and dispatching against the full state tree.

### initialState
The initialState value is applied if the property specified by `lens` is undefined. This is done by internally dispatching an `initializationAction` with the value and `lens` applied.

> You can identify `initializationAction`s using the ref value in actionsStream, and the `initializationAction` export.

### actions
`actions` is an object of functions with a signature like `(args) => state => newState`. This object is transformed by `State` and passed to the `children` render prop with the actions bound using `lens` and `store.dispatch`. In the view created by the render prop, you can then call these actions from the `actions` object passed as the second argument.

> These actions are safe to be passed around, as they do not used `this` context. So, feel free to do `const myAction = actions.myAction;`, or `onClick={actions.myAction}`. For event handlers, even though you don't need to, it's often nice to wrap with an arrow function anyway to deal with the (synthetic) event object, like `onChange={e => actions.myAction(e.target.value)}`.

### saga: Generator
The `State` component takes one more optional prop, to enable Saga functionality. A saga is a generator function, which is passed an object of "effects", which it can call and yield to enable asynchronous functionality.

Saga are explained in a larger section below.

## [export] AllState <React.Component>
`AllState` is a shortcut of `makeStateComponent({ initialState: undefined })`. It's a `State` with no actions and which passes and updates for the entire state tree. Primarily useful for debugging, it's not recommended to have many of these in your React tree, since all of them will update for any action.

## [export] initializationAction
`initializationAction` is a reference to the action dispatched when any State component uses a given initialState. In an actionStream observer, you can compared the `ref` arg to this to catch any `State` initializations.

# State Example
```js
const actions = {
  increment: () => state => ({ count: state.count + 1 }),
  decrement: () => state => ({ count: state.count - 1 }),
};

const State = makeStateComponent({ lens: ['counter'], actions, initialState: { count: 0 } });

// ... in a React tree
<State>
  {(state, actions) => (
    <div>
      <div>
        Count: {state.count}
      </div>
      <div>
        <button type="button" onClick={actions.increment}>+1</button>
        {' '}
        <button type="button" onClick={actions.decrement}>-1</button>
      </div>
    </div>
  )}
</State>
```
> This is a slightly shorter version of the code found in `example/basic/Counter.js` in the RSM repo.

So given the lens `['counter']` and an initial store state of `{}`, when this component mounts, an `initializationAction` action will be fired which causes a state update and gives a full state tree of `{ counter: { count: 0 } }`. (Note that the counter property did not need to exist already.)

For each click of the buttons, the value of `count` will be modified, per the given function.

# Sagas
Sagas are where you implement asynchronous behavior. A Saga looks like this
```js
const mySaga = function * (effects) {
  // ...
};
```
Sagas are passed an effects object containing these functions
- **call**: get the resolution of a Promise
- **callAction**: dispatch an action
- **run**: start another Saga
- **take**: wait for a specific action
- **takeEvery**: return immediatly, but run another saga each time a specific action occurs

A super simple Saga which simply waits for an action twice before calling another action might be
```js
const actions = {
  everyOther: amount => state => state,
  update: amount => state => ({ ...state, count: state.count + amount }),
};
const saga = function * ({ take, callAction }) {
  while (true) {
    const action1 = yield take(actions.everyOther);
    const action2 = yield take(actions.everyOther);
    const amount = action1.args[0] + action2.args[0];
    yield callAction(actions.update, [amount]);
  }
}
// And then somewhere:
<State actions={actions} saga={saga} >...</State>
```
This saga will wait for the `everyOther` action to be called twice, then will call `update()`.

### Loops

We can use an infinite loop like `while (true) {}` in a Saga because it only runs until the next yield. So while in normal JavaScript a loop like that would block forever, here it just means that this generator doesn't eventually end on its own.

### How actions are used

A very important thing to note is how actions are used in Sagas.

#### Taking actions

When you `take` an action, you just pass the actual reference to the action you want to take (future versions will let you take more than one type at a time). The yield expression evaluates to an object like `{ action, ref, args }` (same as the values in actionStream), and while the `action` and `ref` properties aren't generally useful, you might want the `args` array, which is any arguments which the action was called with.

An action which shouldn't do anything by itself (like our `everyOther` action above) can be set to simply return the previous state. You can still use arguments given to it in a Saga.

#### Calling actions

When you want to call an action, you yield `callAction` with the direct reference and an array of arguments. This action will be run with the `lens` from the `State` component which was passed the Saga (or it's parent, in more complex examples).


Now for a more complex example

## Fetch data

One of the first async tasks you usually need to perform in an app is an ajax request to the server when a certain action is called. With Sagas, that looks like this
```jsx
const actions = {
  sendRequest: () => state => state,
  loading: () => state => ({ loading: true }), // error and data properties are removed here
  received: data => state => ({ data, loading: false }),
  error: error => state => ({ error, loading: false }),
};
const initialState = {
  loading: false,
};

const sendRequestSaga = function * ({ call, callAction }) {
  yield callAction(actions.loadingAction);
  try {
    const data = yield call(
      fetch('/api/path', fetchConfig).then(res => res.json()
    );
    yield callAction(actions.received, data);
  } catch (error) {
    yield callAction(actions.error, translateError(error));
    // translateError is some function to turn the error we get into something
    // useful to display to the user. Out of scope for this example.
  }
};

const setupSaga = function * ({ takeEvery }) {
  yield takeEvery(actions.sendRequest, sendRequestSaga);
};

const State = makeStateComponent({ actions, initialState, lens: ['dataState'] });

// ... in the React tree
<State saga={saga}>
  {(state, actions) => {
    if (state.loading) {
      return <Loading />;
    }
    if (state.error) {
      return <Error error={state.error} />;
    }
    if (state.data) {
      return (
        <div>
          <DisplayData data={state.data} />
          <button type="button" onClick={actions.sendRequest}>Request Data</button>
        </div>
      );
    }
    return <button type="button" onClick={actions.sendRequest}>Request Data</button>;
  }}
</State>
```

This is a fairly full-feature data fetching model. On initialization, it will simply display a button to start a load (if you wanted to load without that event, you could do so in the `setupSaga`). When the button is clicked, and event is dispatched and the `takeEvery` in `setupSaga` starts `sendRequestSaga`, which calls a loading action to set a loading state. Then it yields a promise with `call`, which waits for the promise to resolve (or reject, in which case it would throw at that yield in the generator) and returns the data. `sendRequestSaga` then call another action with the data, or calls an error action for the rejection.

The component simply renders the appropriate UI based on the current state.


## Run Saga

If you look back at the first Saga example (where we call one action for every two calls of another), you can see that you can't easily add any other functionality there, since any other `take`, `call` (etc) effects would conflict with the current functionality. To deal with that, we expand on the `setupSaga` pattern used in the Fetch example, but instead of `takeEvery`, we can just use `run`.

```js
const actions = {
  everyOther: amount => state => state,
  everyThird: amount => state => state,
  update: amount => state => ({ ...state, count: state.count + amount }),
};
const makeEveryNthSaga = (onActionRef, times) => function * ({ take, callAction }) {
  while (true) {
    let amount = 0;
    for (let c = 0; c < times; c++) {
      const action = yield take(onActionRef);
      amount += action.args[0];
    }
    yield callAction(actions.update, [amount]);
  }
}
const setupSaga = function * ({ run }) {
  yield run(makeEveryNthSaga(actions.everyOther, 2));
  yield run(makeEveryNthSaga(actions.everyThird, 3));
};

// <State saga={setupSaga}>
```

Now we only initiate the functionality in our `setupSaga`, and the loops (and functionality) are isolated into their own Sagas. Also look at how we use a generic factory to create the specific Sagas we want.

## Ending Sagas

Finally, all things must eventually end. You might guess that a Saga passed to a State component will end when the State component is unmounted, and that's correct. Additionally, any child Sagas (started with `run` or `takeEvery`) will also be ended when their parent ends. However, you can also manually stop a child Saga using the response of the `run` and `takeEvery` effects.

```js
const someSaga = function * (effects) {
  // ...
}

const controlSaga = function * ({ takeEvery }) {
  while (true) {
    yield take(actions.startWatching);
    const someSagaRunning = yield takeEvery(actions.runSomeSaga, someSaga);
    yield take(actions.stopWatching);
    someSagaRunning.stopChild();
  }
}
```

When you start a child saga, you get an object back with a `stopChild` method which you can call to stop that child (and any of it's children.

## List of Saga effects

### [yield] call(promise: Promise)
Awaits a given promise and the yield expression returns the resolved value, or the yield expression throws for a rejection.

### [yield] callAction(action: Action, args: Array)
Dispatches an action. The action can be previously defined as part of an actions object, or simply be an anonymous function like `() => state => ({ ...state, item })`. The optional arguments will be passed to the function internally. The action will be run with the lens from the `State` component.

### [yield] run(saga: Generator)
Starts a child Saga. Returns an object with a `stopChild` method to end the child Saga. The child Saga will be started with the same context (mounted `State` component) that the parent exist under.

### [yield] take(action: Function|reference)
Awaits the specific action being dispatched. This returns the same action object as actionStream values: `{ action, ref, args }`.

### [yield] takeEvery(action: Function|reference, saga: Generator)
Returns immediatly with an object which has a `stopChild` method. This starts a process where every time the given action is dispatched, the given Saga is started.
