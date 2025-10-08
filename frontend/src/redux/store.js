// frontend/src/redux/store.js

import urlReducer from './reducers/urlReducer';
import { configureStore } from '@reduxjs/toolkit';

// import thunk from 'redux-thunk';
// import { createStore, combineReducers, applyMiddleware } from 'redux';


const store = configureStore({
  reducer: {
    url: urlReducer
  }
  // Redux Toolkit includes redux-thunk by default!
  // No need to add it manually
});

export default store;