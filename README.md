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

## API
> TODO
