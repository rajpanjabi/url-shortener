// frontend/src/redux/reducers/urlReducer.js
import {
  CREATE_URL_REQUEST,
  CREATE_URL_SUCCESS,
  CREATE_URL_FAILURE,
  FETCH_URLS_REQUEST,
  FETCH_URLS_SUCCESS,
  FETCH_URLS_FAILURE,
  DELETE_URL_REQUEST,
  DELETE_URL_SUCCESS,
  DELETE_URL_FAILURE,
  FETCH_ANALYTICS_REQUEST,
  FETCH_ANALYTICS_SUCCESS,
  FETCH_ANALYTICS_FAILURE,
  CLEAR_ERROR
} from '../actions/urlActions';

const initialState = {
  urls: [],
  total: 0,
  loading: false,
  error: null,
  analytics: null,
  analyticsLoading: false
};

const urlReducer = (state = initialState, action) => {
  switch (action.type) {
    case CREATE_URL_REQUEST:
      return {
        ...state,
        loading: true,
        error: null
      };

    case CREATE_URL_SUCCESS:
      return {
        ...state,
        loading: false,
        urls: [action.payload, ...state.urls],
        total: state.total + 1
      };

    case CREATE_URL_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload
      };

    case FETCH_URLS_REQUEST:
      return {
        ...state,
        loading: true,
        error: null
      };

    case FETCH_URLS_SUCCESS:
      return {
        ...state,
        loading: false,
        urls: action.payload.urls,
        total: action.payload.total
      };

    case FETCH_URLS_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload
      };

    case DELETE_URL_REQUEST:
      return {
        ...state,
        loading: true,
        error: null
      };

    case DELETE_URL_SUCCESS:
      return {
        ...state,
        loading: false,
        urls: state.urls.filter(url => url.shortCode !== action.payload),
        total: state.total - 1
      };

    case DELETE_URL_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload
      };

    case FETCH_ANALYTICS_REQUEST:
      return {
        ...state,
        analyticsLoading: true,
        error: null
      };

    case FETCH_ANALYTICS_SUCCESS:
      return {
        ...state,
        analyticsLoading: false,
        analytics: action.payload
      };

    case FETCH_ANALYTICS_FAILURE:
      return {
        ...state,
        analyticsLoading: false,
        error: action.payload
      };

    case CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    default:
      return state;
  }
};

export default urlReducer;