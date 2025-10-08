// import libraries
import pg from 'pg';
import dotenv from 'dotenv';    
dotenv.config();

// create a new pool instance
const {Pool} = pg;

const pool =new Pool({
    host: process.env.DB_HOST,
    port:process.env.DB_PORT,
    database:process.env.DB_NAME,
    user:process.env.DB_USER,
    password:process.env.DB_PASSWORD,
    max:20,
    idleTimeoutMillis:30000,
    connectionTimeoutMillis:2000,    
});

pool.on('connect',()=>{
    console.log("Database connected successfully"); 
});

pool.on('error',(err)=>{
    console.error("Unexpected error on idle client",err);
    process.exit(-1);
})

// Initialize the database
export const initializeDatabase = async() =>{
    const client =await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS urls (
                id SERIAL PRIMARY KEY,
                short_code VARCHAR(10) UNIQUE NOT NULL,
                long_url TEXT NOT NULL,
                clicks INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                user_ip VARCHAR(45),
                metadata JSONB
            );

            CREATE INDEX IF NOT EXISTS idx_short_code ON urls(short_code);
            CREATE INDEX IF NOT EXISTS idx_created_at ON urls(created_at);
            `);
            console.log('Database tables initialized');
        } catch (err) {
            console.error('Error initializing database:', err);
            throw err;
        } finally {
            client.release();
        }
        };

export { pool };
