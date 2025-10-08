import React, { useState } from "react";
import {useDispatch, useSelector} from 'react-redux';
import { createShortUrl } from '../redux/actions/urlActions';
const UrlForm = () => {
        
    const [longUrl, setLongUrl] = useState('');
    const [customCode, setCustomCode] = useState('');
    const [expiresIn, setExpiresIn] = useState('');
    const [showCustom, setShowCustom] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const dispatch =useDispatch();
    const {loading, error}=useSelector(state=>state.url);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSuccessMessage('');

        if (!longUrl) {
        return;
        }

        try {
        const expiresInSeconds = expiresIn ? parseInt(expiresIn) * 86400 : null;
        const result = await dispatch(
            createShortUrl(longUrl, customCode || null, expiresInSeconds)
        );
        
        setSuccessMessage(`Short URL created: ${result.shortUrl}`);
        setLongUrl('');
        setCustomCode('');
        setExpiresIn('');
        
        setTimeout(() => setSuccessMessage(''), 5000);
        } catch (err) {
        // Error is handled by Redux
        }
    };






    return (
        <div className="url-form">
        <h2>Create Short URL</h2>
        
        <form onSubmit={handleSubmit}>
            <div className="form-group">
            <label htmlFor="longUrl">Enter your long URL</label>
            <input
                type="url"
                id="longUrl"
                value={longUrl}
                onChange={(e) => setLongUrl(e.target.value)}
                placeholder="https://example.com/very/long/url"
                required
            />
            </div>

            <div className="form-options">
            <button
                type="button"
                className="toggle-btn"
                onClick={() => setShowCustom(!showCustom)}
            >
                {showCustom ? '− Hide' : '+ Show'} Advanced Options
            </button>
            </div>

            {showCustom && (
            <div className="advanced-options">
                <div className="form-group">
                <label htmlFor="customCode">Custom short code (optional)</label>
                <input
                    type="text"
                    id="customCode"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value)}
                    placeholder="my-custom-code"
                    pattern="[a-zA-Z0-9-_]{4,10}"
                    title="4-10 characters: letters, numbers, hyphens, underscores"
                />
                </div>

                <div className="form-group">
                <label htmlFor="expiresIn">Expires in (days)</label>
                <input
                    type="number"
                    id="expiresIn"
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(e.target.value)}
                    placeholder="7"
                    min="1"
                    max="365"
                />
                </div>
            </div>
            )}

            <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Creating...' : 'Shorten URL'}
            </button>
        </form>

        {error && (
            <div className="error-message">
            {error}
            </div>
        )}

        {successMessage && (
            <div className="success-message">
            {successMessage}
            </div>
        )}
        </div>
    );
    };

export default UrlForm;