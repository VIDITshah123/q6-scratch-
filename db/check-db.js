const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// Database file path
const DB_PATH = path.resolve(process.env.DB_PATH || './db/question_bank.db');

// Create a new database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
        process.exit(1);
    }
    console.log('Connected to the SQLite database.');
});

// Check if tables exist
const checkTables = () => {
    return new Promise((resolve, reject) => {
        db.all(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';",
            (err, tables) => {
                if (err) {
                    console.error('Error checking tables:', err.message);
                    return reject(err);
                }
                console.log('\n=== Database Tables ===');
                tables.forEach((table, index) => {
                    console.log(`${index + 1}. ${table.name}`);
                });
                resolve(tables);
            }
        );
    });
};

// Check table structure
const checkTableStructure = async (tableName) => {
    return new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
            if (err) {
                console.error(`Error checking structure of ${tableName}:`, err.message);
                return reject(err);
            }
            console.log(`\n=== ${tableName.toUpperCase()} Structure ===`);
            console.table(columns);
            resolve(columns);
        });
    });
};

// Main function
const main = async () => {
    try {
        const tables = await checkTables();
        
        // Check structure of each table
        for (const table of tables) {
            await checkTableStructure(table.name);
        }
        
        console.log('\nDatabase check completed successfully!');
    } catch (error) {
        console.error('Database check failed:', error);
    } finally {
        // Close the database connection
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
                process.exit(1);
            }
            console.log('Database connection closed.');
        });
    }
};

// Run the check
main();
