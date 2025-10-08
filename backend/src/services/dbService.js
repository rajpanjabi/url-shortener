import {pool} from '../config/database.js';

class DatabaseService {
    /**
     * Create a new short URl mapping in the database
     * @param {string} shortCode - The generated short code
     * @param {string} longUrl - The original long URL
     * @param {string|null} userIp - Optional user IP address
     * @param {Date|null} expiresAt - Optional expiration date
     * @returns {row|error} - The inserted row or error
     */
    async createUrl(shortCode, longUrl, userIp = null, expiresAt = null) {
        const query=`
            INSERT INTO urls (short_code, long_url, user_ip, expires_at)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        try{
            const values = [shortCode, longUrl, userIp, expiresAt];
            const result= await pool.query(query, values);
            return result.rows[0];
        } catch(error){
           if (error.code === '23505') { // Unique violation
                throw new Error('Short code already exists');
            }
            throw error;
        }
    }
    
    /**
     * Retrieve a long URL from the database using the short code
     * @param {string} shortCode - The short code
     * @returns {row|null} - The retrieved row or null if not found
     */
    async getUrlbyShortCode(shortCode) {
        const query = `
            SELECT * FROM urls
            WHERE short_code = $1;
        `;
        try {
            const result = await pool.query(query, [shortCode]);
            return result.rows[0] || null;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get all URLs (with pagination)
     * @param {number} limit - Number of records to fetch
     * @param {number} offset - Number of records to skip
     * @returns {array} - Array of URL records
     */
    async getAllUrls(limit = 10, offset = 0) {
        const query = `
            SELECT * FROM urls
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2;
        `;
        try {
            const result = await pool.query(query, [limit, offset]);
            return result.rows;
        } catch (error) {
            console.error('Database get all URLs error:', error);
            throw error;
        }
    }
    /**
     * Increment click counter for a given shortCode
     * @param {string} shortCode - The short code
     * @returns {clicks||0} - True if successful, false otherwise
     */

    async incrementClicks(shortCode) {
        const query = `
            UPDATE urls
            SET clicks = clicks + 1
            WHERE short_code = $1
            RETURNING clicks;
        `;
        try {
            const result = await pool.query(query, [shortCode]);
            return result.rows[0]?.clicks || 0;
        } catch (error) {
            console.error('Database increment clicks error:', error);
            throw error;
        }   
    }

    /**
     * Delete a URL mapping from the database
     * @param {string} shortCode - The short code
     * @returns {row|null} - Deleted row if deleted, null otherwise
     */
    async deleteUrl(shortCode) {
        const query = `
            DELETE FROM urls
            WHERE short_code = $1
            RETURNING *`;
        try {
            const result = await pool.query(query, [shortCode]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Database delete URL error:', error);
            throw error;
        }       
    }
    /**
     * Get analytics for a given shortCode
     * @param {string} shortCode - The short code
     * @returns {object|null} - Analytics data or null if not found
     */
    async getAnalytics(shortCode) {
        const query = `
            SELECT short_code, long_url, clicks, created_at, expires_at 
            FROM urls
            WHERE short_code = $1;
        `;
        try{
            const result = await pool.query(query, [shortCode]);
            return result.rows[0] || null;      
        }
        catch(error){
            console.error('Database get analytics error:', error);
            throw error;
        }
    }
    
    /**
     * Clean up expired URLs from the database
     * @returns {rows} - Array of deleted rows
     */
    async cleanupExpiredUrls() {
        const query = `
            DELETE FROM urls
            WHERE expires_at IS NOT NULL AND expires_at < NOW()
            RETURNING short_code;
        `;
        try {
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            console.error('Database cleanup expired URLs error:', error);
            throw error;
        }
    }
    
    /**
     * Get total url count
     * @returns {number} - Total number of URLs
     */
    async getTotalUrlCount() {
        const query = `
            SELECT COUNT(*) AS total FROM urls;
        `;
        try {
            const result = await pool.query(query);
            return parseInt(result.rows[0].total, 10);
            
        } catch (error) {
            console.error('Database get total URL count error:', error);
            throw error;
        }
    }

}

export default new DatabaseService();