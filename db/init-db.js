const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Database file path
const DB_PATH = path.resolve(process.env.DB_PATH || './db/question_bank.db');

// Ensure the db directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Create a new database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
        process.exit(1);
    }
    console.log('Connected to the SQLite database.');
    // Enable foreign key constraints
    db.run('PRAGMA foreign_keys = ON;');
});

// Read and execute the schema
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

// Split the schema into individual statements
const statements = schema
    .split(';')
    .map(statement => statement.trim())
    .filter(statement => statement.length > 0);

// Execute each statement
const executeStatements = (index = 0) => {
    if (index >= statements.length) {
        console.log('Database initialization completed successfully!');
        db.close();
        return;
    }

    const statement = statements[index];
    db.run(statement, (err) => {
        if (err) {
            console.error(`Error executing statement ${index + 1}:`, err.message);
            console.error('Statement:', statement);
            process.exit(1);
        }
        executeStatements(index + 1);
    });
};

// Start executing statements
console.log('Initializing database...');
if (fs.existsSync(DB_PATH)) {
    console.log('Database file already exists. It will be recreated.');
    fs.unlinkSync(DB_PATH);
}

executeStatements();

// Handle errors
db.on('error', (err) => {
    console.error('Database error:', err);
    process.exit(1);
});
