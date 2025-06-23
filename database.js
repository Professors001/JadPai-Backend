// database.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: 'localhost',
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: 3306
};

let conn = null;

const connectMySQL = async () => {
    if (conn) return conn;
    try {
        conn = await mysql.createConnection(dbConfig);
        console.log('MySQL Connected...');
        return conn;
    } catch (error) {
        console.error('Error connecting to MySQL:', error.message);
        throw error;
    }
};

module.exports = { connectMySQL };