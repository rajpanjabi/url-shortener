// frontend/src/redux/actions/urlActions.js
import api from '../../services/api';

// Action Types
export const CREATE_URL_REQUEST = 'CREATE_URL_REQUEST';
export const CREATE_URL_SUCCESS = 'CREATE_URL_SUCCESS';
export const CREATE_URL_FAILURE = 'CREATE_URL_FAILURE';

export const FETCH_URLS_REQUEST = 'FETCH_URLS_REQUEST';
export const FETCH_URLS_SUCCESS = 'FETCH_URLS_SUCCESS';
export const FETCH_URLS_FAILURE = 'FETCH_URLS_FAILURE';

export const DELETE_URL_REQUEST = 'DELETE_URL_REQUEST';
export const DELETE_URL_SUCCESS = 'DELETE_URL_SUCCESS';
export const DELETE_URL_FAILURE = 'DELETE_URL_FAILURE';

export const FETCH_ANALYTICS_REQUEST = 'FETCH_ANALYTICS_REQUEST';
export const FETCH_ANALYTICS_SUCCESS = 'FETCH_ANALYTICS_SUCCESS';
export const FETCH_ANALYTICS_FAILURE = 'FETCH_ANALYTICS_FAILURE';

export const CLEAR_ERROR = 'CLEAR_ERROR';

// Action Creators

/**
 * Create a new short URL
 */
export const createShortUrl = (longUrl, customCode = null, expiresIn = null) => {
  return async (dispatch) => {
    dispatch({ type: CREATE_URL_REQUEST });
    
    try {
      const response = await api.createShortUrl(longUrl, customCode, expiresIn);
      dispatch({
        type: CREATE_URL_SUCCESS,
        payload: response.data
      });
      return response.data;
    } catch (error) {
      dispatch({
        type: CREATE_URL_FAILURE,
        payload: error.message
      });
      throw error;
    }
  };
};

/**
 * Fetch all URLs
 */
export const fetchUrls = (limit = 50, offset = 0) => {
  return async (dispatch) => {
    dispatch({ type: FETCH_URLS_REQUEST });
    
    try {
      const response = await api.getAllUrls(limit, offset);
      dispatch({
        type: FETCH_URLS_SUCCESS,
        payload: response.data
      });
    } catch (error) {
      dispatch({
        type: FETCH_URLS_FAILURE,
        payload: error.message
      });
    }
  };
};

/**
 * Delete a URL
 */
export const deleteUrl = (shortCode) => {
  return async (dispatch) => {
    dispatch({ type: DELETE_URL_REQUEST });
    
    try {
      await api.deleteUrl(shortCode);
      dispatch({
        type: DELETE_URL_SUCCESS,
        payload: shortCode
      });
    } catch (error) {
      dispatch({
        type: DELETE_URL_FAILURE,
        payload: error.message
      });
      throw error;
    }
  };
};

/**
 * Fetch analytics for a URL
 */
export const fetchAnalytics = (shortCode) => {
  return async (dispatch) => {
    dispatch({ type: FETCH_ANALYTICS_REQUEST });
    
    try {
      const response = await api.getAnalytics(shortCode);
      dispatch({
        type: FETCH_ANALYTICS_SUCCESS,
        payload: response.data
      });
      return response.data;
    } catch (error) {
      dispatch({
        type: FETCH_ANALYTICS_FAILURE,
        payload: error.message
      });
      throw error;
    }
  };
};

/**
 * Clear error
 */
export const clearError = () => ({
  type: CLEAR_ERROR
});