// frontend/src/components/Analytics.jsx
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAnalytics } from '../redux/actions/urlActions';

const Analytics = () => {
  const [shortCode, setShortCode] = useState('');
  const dispatch = useDispatch();
  const { analytics, analyticsLoading, error } = useSelector(state => state.url);

  const handleFetch = async (e) => {
    e.preventDefault();
    if (shortCode) {
      try {
        await dispatch(fetchAnalytics(shortCode));
      } catch (err) {
        // Error handled by Redux
      }
    }
  };

  return (
    <div className="analytics">
      <h2>URL Analytics</h2>
      
      <form onSubmit={handleFetch} className="analytics-form">
        <input
          type="text"
          value={shortCode}
          onChange={(e) => setShortCode(e.target.value)}
          placeholder="Enter short code"
          required
        />
        <button type="submit" disabled={analyticsLoading}>
          {analyticsLoading ? 'Loading...' : 'Get Analytics'}
        </button>
      </form>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {analytics && (
        <div className="analytics-result">
          <h3>Analytics for: {analytics.shortCode}</h3>
          
          <div className="analytics-grid">
            <div className="analytics-card">
              <div className="analytics-label">Total Clicks</div>
              <div className="analytics-value">{analytics.clicks}</div>
            </div>

            <div className="analytics-card">
              <div className="analytics-label">Created</div>
              <div className="analytics-value">
                {new Date(analytics.createdAt).toLocaleDateString()}
              </div>
            </div>

            {analytics.expiresAt && (
              <div className="analytics-card">
                <div className="analytics-label">Expires</div>
                <div className="analytics-value">
                  {new Date(analytics.expiresAt).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>

          <div className="analytics-url">
            <strong>Original URL:</strong>
            <a href={analytics.longUrl} target="_blank" rel="noopener noreferrer">
              {analytics.longUrl}
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;