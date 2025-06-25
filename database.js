// database.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    // Use 'db' (service name) when running in Docker, 'localhost' when running locally
    host: process.env.DB_HOST || 'localhost',
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.DB_PORT || 3306,
    // Add connection timeout and retry logic for Docker
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000,
};

let conn = null;

const connectMySQL = async () => {
    if (conn) return conn;
    
    // Retry connection logic for Docker startup timing
    const maxRetries = 5;
    let retries = 0;
    
    while (retries < maxRetries) {
        try {
            conn = await mysql.createConnection(dbConfig);
            console.log(`MySQL Connected to ${dbConfig.host}:${dbConfig.port}...`);
            return conn;
        } catch (error) {
            retries++;
            console.error(`Error connecting to MySQL (attempt ${retries}/${maxRetries}):`, error.message);
            
            if (retries === maxRetries) {
                throw error;
            }
            
            // Wait 5 seconds before retrying
            console.log('Retrying in 5 seconds...');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
};

module.exports = { connectMySQL };