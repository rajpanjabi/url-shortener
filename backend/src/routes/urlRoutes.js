
// backend/src/routes/urlRoutes.js
import express from 'express';
const router = express.Router();
import urlController from '../controllers/urlController.js'; 


/**
 * @route   POST /api/urls
 * @desc    Create a new short URL
 * @body    { longUrl, customCode?, expiresIn? }
 */
router.post('/urls', urlController.createShortUrl);

/**
 * @route   GET /api/urls
 * @desc    Get all URLs with pagination
 * @query   limit, offset
 */
router.get('/urls', urlController.getAllUrls);

/**
 * @route   GET /api/urls/:shortCode/analytics
 * @desc    Get analytics for a short URL
 */
router.get('/urls/:shortCode/analytics', urlController.getAnalytics);

/**
 * @route   DELETE /api/urls/:shortCode
 * @desc    Delete a short URL
 */
router.delete('/urls/:shortCode', urlController.deleteUrl);

/**
 * @route   GET /:shortCode
 * @desc    Redirect to original URL
 */
router.get('/:shortCode', urlController.redirectUrl);

export default router;