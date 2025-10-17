import redisService from '../services/redisService.js';
import dbService from '../services/dbService.js';
import {generateShortCode} from '../services/shortCodeGenerator.js'
import validator from 'validator';

class urlController {

    /**
     * Create a shortened URL
     */
    async createShortUrl(req, res) {
        try{
        const { longUrl, customCode, expiresIn } = req.body;
        
        // Validate the long URL
        if (!longUrl || !validator.isURL(longUrl)){
            return res.status(400).json({ sucess:false ,error: 'Invalid URL provided' });
        }
        console.log("Long URL:", longUrl);
         // Generate or use custom short code
        let shortCode = customCode || generateShortCode();
        console.log("Generated short code:", shortCode);
        // Validate custom code if provided
        if (customCode){
            
            if (customCode.length > 10 || customCode.length < 4){
                
                return res.status(400).json({ success: false, error: 'Custom code must be between 4 and 10 characters' });
            }
        console.log("Custom code:", customCode);
        // Check if custom code already exists
        const existing = await dbService.getUrlbyShortCode(customCode);
        if (existing) {
            return res.status(409).json({ success: false, error: 'Custom code already in use' });
        }
    }
        console.log("Custom code is available");
        // Calculate expiration time

        let expiresAt=null;
        if(expiresIn){
            expiresAt = new Date(Date.now() + expiresIn * 1000);
        }

        // Get user IP address
        const userIp = req.ip || req.connection.remoteAddress;

        console.log("User IP:", userIp);
        // Store in database
        console.log("Storing URL mapping in database...");
        const urlRecord = await dbService.createUrl(shortCode, longUrl, userIp, expiresAt);
        console.log("URL mapping stored:", urlRecord);
        // Cache in Redis
        console.log("Caching URL in Redis...");
        await redisService.cacheUrl(shortCode, longUrl);
        await redisService.cacheMetadata(shortCode, {
        id: urlRecord.id,
        createdAt: urlRecord.created_at,
        expiresAt: urlRecord.expires_at
        });
        console.log("URL cached in Redis");
        // Build short URL
        const shortUrl = `${process.env.BASE_URL}/${shortCode}`;
        console.log("Short URL created:", shortUrl);
        res.status(201).json({
            success: true,
            data: {
            id: urlRecord.id,
            shortCode,
            shortUrl,
            longUrl,
            clicks: 0,
            createdAt: urlRecord.created_at,
            expiresAt: urlRecord.expires_at
            }
        });
        } catch (error) {
            console.error('Create short URL error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create short URL'
            });
            }
    }


    /**
     * Redirect to original URL
     */
    
    async redirectUrl(req, res) {
        try {
        const { shortCode } = req.params;

        // Try cache first
        let longUrl = await redisService.getUrl(shortCode);

        if (!longUrl) {
            // If not in cache, get from database
            const urlRecord = await dbService.getUrlbyShortCode(shortCode);
            
            if (!urlRecord) {
            return res.status(404).json({
                success: false,
                error: 'Short URL not found'
            });
            }

            // Check if expired
            if (urlRecord.expires_at && new Date(urlRecord.expires_at) < new Date()) {
            await dbService.deleteUrl(shortCode);
            await redisService.deleteUrl(shortCode);
            return res.status(410).json({
                success: false,
                error: 'Short URL has expired'
            });
            }

            longUrl = urlRecord.long_url;
            
            // Cache it for next time
            await redisService.cacheUrl(shortCode, longUrl);
        }

        // Increment clicks (async, don't wait)
        Promise.all([
            redisService.incrementClicks(shortCode),
            dbService.incrementClicks(shortCode)
        ]).catch(err => console.error('Failed to increment clicks:', err));

        // Redirect
        res.redirect(longUrl);
        } catch (error) {
        console.error('Redirect error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to redirect'
        });
        }
    }

    /**
     * Get all URLs
     */
    async getAllUrls(req, res) {
        try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        const urls = await dbService.getAllUrls(limit, offset);
        const total = await dbService.getTotalUrlCount();

        res.json({
            success: true,
            data: {
            urls: urls.map(url => ({
                id: url.id,
                shortCode: url.short_code,
                shortUrl: `${process.env.BASE_URL}/${url.short_code}`,
                longUrl: url.long_url,
                clicks: url.clicks,
                createdAt: url.created_at,
                expiresAt: url.expires_at
            })),
            total,
            limit,
            offset
            }
        });
        } catch (error) {
        console.error('Get all URLs error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch URLs'
        });
        }
    }

    /**
     * Get analytics for a short URL
     */
    async getAnalytics(req, res) {
        try {
        const { shortCode } = req.params;

        const analytics = await dbService.getAnalytics(shortCode);
        
        if (!analytics) {
            return res.status(404).json({
            success: false,
            error: 'Short URL not found'
            });
        }

        res.json({
            success: true,
            data: {
            shortCode: analytics.short_code,
            longUrl: analytics.long_url,
            clicks: analytics.clicks,
            createdAt: analytics.created_at,
            expiresAt: analytics.expires_at
            }
        });
        } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch analytics'
        });
        }
    }

    /**
     * Delete a short URL
     */
    async deleteUrl(req, res) {
        try {
        const { shortCode } = req.params;

        const deleted = await dbService.deleteUrl(shortCode);
        
        if (!deleted) {
            return res.status(404).json({
            success: false,
            error: 'Short URL not found'
            });
        }

        // Remove from cache
        await redisService.deleteUrl(shortCode);

        res.json({
            success: true,
            message: 'Short URL deleted successfully'
        });
        } catch (error) {
        console.error('Delete URL error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete URL'
        });
        }
    }
}
    

export default new urlController();





