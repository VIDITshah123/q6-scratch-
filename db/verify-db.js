const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// Database file path
const DB_PATH = path.resolve(process.env.DB_PATH || './db/question_bank.db');

console.log(`Attempting to connect to database at: ${DB_PATH}`);

// Create a new database connection
const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
        console.error('Error code:', err.code);
        process.exit(1);
    }
    console.log('Successfully connected to the SQLite database.');

    // List all tables
    db.all(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';",
        (err, tables) => {
            if (err) {
                console.error('Error listing tables:', err.message);
                db.close();
                return;
            }

            console.log('\n=== Database Tables ===');
            if (tables.length === 0) {
                console.log('No tables found in the database.');
            } else {
                tables.forEach((table, index) => {
                    console.log(`${index + 1}. ${table.name}`);
                });
            }
            
            // Close the database connection
            db.close();
        }
    );
});

// Handle errors
db.on('error', (err) => {
    console.error('Database error:', err);
    process.exit(1);
});
