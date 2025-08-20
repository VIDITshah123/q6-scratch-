const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// Database file path
const DB_PATH = path.resolve(process.env.DB_PATH || './db/question_bank.db');

class Database {
    constructor() {
        this.db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error connecting to database:', err.message);
                process.exit(1);
            }
            console.log('Connected to SQLite database');
        });

        // Enable foreign key constraints
        this.db.get("PRAGMA foreign_keys = ON");
    }

    /**
     * Execute a SQL query with parameters
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise} - Promise that resolves with the query results
     */
    query(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('Database query error:', err);
                    return reject(err);
                }
                resolve(rows);
            });
        });
    }

    /**
     * Execute a SQL command (INSERT, UPDATE, DELETE)
     * @param {string} sql - SQL command
     * @param {Array} params - Command parameters
     * @returns {Promise} - Promise that resolves with the last inserted ID or changes count
     */
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    console.error('Database command error:', err);
                    return reject(err);
                }
                resolve({ id: this.lastID, changes: this.changes });
            });
        });
    }

    /**
     * Get a single row from the database
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise} - Promise that resolves with the first row or null
     */
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    console.error('Database get error:', err);
                    return reject(err);
                }
                resolve(row || null);
            });
        });
    }

    /**
     * Begin a transaction
     * @returns {Promise} - Promise that resolves when the transaction begins
     */
    beginTransaction() {
        return new Promise((resolve, reject) => {
            this.db.run('BEGIN TRANSACTION', (err) => {
                if (err) return reject(err);
                resolve();
            });
        });
    }

    /**
     * Commit a transaction
     * @returns {Promise} - Promise that resolves when the transaction is committed
     */
    commit() {
        return new Promise((resolve, reject) => {
            this.db.run('COMMIT', (err) => {
                if (err) return reject(err);
                resolve();
            });
        });
    }

    /**
     * Rollback a transaction
     * @returns {Promise} - Promise that resolves when the transaction is rolled back
     */
    rollback() {
        return new Promise((resolve, reject) => {
            this.db.run('ROLLBACK', (err) => {
                if (err) return reject(err);
                resolve();
            });
        });
    }

    /**
     * Close the database connection
     * @returns {Promise} - Promise that resolves when the connection is closed
     */
    close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) return reject(err);
                console.log('Database connection closed');
                resolve();
            });
        });
    }
}

// Create a single instance of the database
const db = new Database();

// Handle process termination to close the database connection
process.on('SIGINT', () => {
    db.close()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('Error closing database:', err);
            process.exit(1);
        });
});

module.exports = db;
