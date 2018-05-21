import 'babel-polyfill';
import React from 'react';
import ReactDOM from 'react-dom';
import { createStore, Rsm } from '../../src/rsm';
import Counter from './Counter';

const store = createStore({});

ReactDOM.render(
  <Rsm store={store}>
    <Counter />
  </Rsm>,
  document.getElementById('root')
);
