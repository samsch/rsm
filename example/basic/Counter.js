import React from 'react';
import { makeStateComponent } from '../../src/rsm';

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

export default Counter;
