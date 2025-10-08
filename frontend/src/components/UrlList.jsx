import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUrls, deleteUrl } from '../redux/actions/urlActions';

const UrlList = () => {

    const [copiedCode, setCopiedCode] = useState(null);
    const dispatch = useDispatch();
    const { urls, loading, total } = useSelector(state => state.url);

    useEffect(() => {
        dispatch(fetchUrls());
    }, [dispatch]);

    const handleCopy = (shortUrl, shortCode) => {
    navigator.clipboard.writeText(shortUrl);
    setCopiedCode(shortCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDelete = async (shortCode) => {
    if (window.confirm('Are you sure you want to delete this URL?')) {
      try {
        await dispatch(deleteUrl(shortCode));
      } catch (err) {
        alert('Failed to delete URL');
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="loading">Loading URLs...</div>;
  }

  if (urls.length === 0) {
    return (
      <div className="empty-state">
        <p>No URLs yet. Create your first short URL above!</p>
      </div>
    );
  }

    return (
    <div className="url-list">
      <h2>Your URLs ({total})</h2>
      
      <div className="url-grid">
        {urls.map((url) => (
          <div key={url.id} className="url-card">
            <div className="url-header">
              <div className="short-url-section">
                <span className="short-label">Short URL:</span>
                <a 
                  href={url.shortUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="short-url"
                >
                  {url.shortUrl}
                </a>
                <button
                  className="copy-btn"
                  onClick={() => handleCopy(url.shortUrl, url.shortCode)}
                  title="Copy to clipboard"
                >
                  {copiedCode === url.shortCode ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
            </div>

            <div className="url-body">
              <div className="long-url-section">
                <span className="long-label">Original:</span>
                <a 
                  href={url.longUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="long-url"
                  title={url.longUrl}
                >
                  {url.longUrl.length > 60 
                    ? url.longUrl.substring(0, 60) + '...' 
                    : url.longUrl}
                </a>
              </div>

              <div className="url-stats">
                <span className="stat">
                  👁️ {url.clicks} clicks
                </span>
                <span className="stat">
                  📅 {formatDate(url.createdAt)}
                </span>
                {url.expiresAt && (
                  <span className="stat expires">
                    ⏰ Expires: {formatDate(url.expiresAt)}
                  </span>
                )}
              </div>
            </div>

            <div className="url-footer">
              <button
                className="delete-btn"
                onClick={() => handleDelete(url.shortCode)}
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UrlList;
