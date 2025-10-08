// Redis helper class that talks to Redis server

import { redisClient } from '../config/redis.js';
const CACHE_TTL = parseInt(process.env.REDIS_TTL) || 86400;

class RedisService {
    /**
     * Cache a shortCode --> longUrl mapping in Redis
     * @param {string} shortCode - The short code
     * @param {string} longUrl - The original long URL
     */

    async cacheUrl(shortCode, longUrl){
        try {
            await redisClient.setEx(`url:${shortCode}`, CACHE_TTL, longUrl);
            return true;
        } catch (error) {
            console.error('Error caching URL in Redis:', error);
            return false;
            
        }
    }

    /**
     * Retrieve a long URL from Redis cache using the short code
     * @param {string} shortCode - The short code
     * @returns {string|null} - The original long URL or null if not found
     */
    async getUrl(shortCode){
        try{
            return await redisClient.get(`url:${shortCode}`);
            
        }catch(error){
            console.error('Error retrieving URL from Redis:', error);
            return null;
        }
    }

    /**
     * Increment click counter for a given shortCode 
     * @param {string} shortCode - The short code
     * @returns {boolean} - True if successful, false otherwise
     */

    async incrementClicks(shortCode){
        try{
            await redisClient.incr(`clicks:${shortCode}`);
            return true;
        }catch(error){
            console.error('Error incrementing click count in Redis:', error);
            return false;
        }
    }
    /**
     * Get click count for a given shortCode
     * @param {string} shortCode - The short code
     * @returns {number|null} - The click count or null if not found
     */         
    async getClickCount(shortCode){ 
        try{
            const count = await redisClient.get(`clicks:${shortCode}`);
            return count ? parseInt(count) : 0;
        }catch(error){
            console.error('Error retrieving click count from Redis:', error);
            return null;
        }   

    }
    
    /**
     * Delete cached URL and click count for a given shortCode
     * @param {string} shortCode - The short code
     * @returns {boolean} - True if successful, false otherwise
     */
    async deleteUrl(shortCode){ 
        try{
            await redisClient.del(`url:${shortCode}`);
            await redisClient.del(`clicks:${shortCode}`);
            return true;
        }catch(error){
            console.error('Error deleting URL from Redis:', error);
            return false;
        }   
    }   

    /**
     * Cache additional metadata for a given shortCode
     * @param {string} shortCode - The short code
     * @param {object} metadata - The metadata object to cache
     * @returns {boolean} - True if successful, false otherwise
     */
    async cacheMetadata(shortCode, metadata){
        try{
            await redisClient.setEx(`meta:${shortCode}`, CACHE_TTL, JSON.stringify(metadata));
            return true;
        }catch(error){
            console.error('Error caching metadata in Redis:', error);
            return false;
        }   
    }

    /**
     * Retrieve cached metadata for a given shortCode
     * @param {string} shortCode - The short code
     * @returns {object|null} - The metadata object or null if not found
     */
    async getMetadata(shortCode){
        try{
            const data = await redisClient.get(`meta:${shortCode}`);
            return data ? JSON.parse(data) : null;
        }catch(error){
            console.error('Error retrieving metadata from Redis:', error);
            return null;
        }   
    }
     

}
export default new RedisService();