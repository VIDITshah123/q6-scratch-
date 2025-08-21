console.log('Execution started: init-db.js');
const fs = require('fs');
const path = require('path');
const Database = require('../src/utils/db');

const db = new Database();

// Database file path
const DB_PATH = path.resolve(process.env.DB_PATH || './db/question_bank.db');

// Read and execute the schema
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

// Split the schema into individual statements
const statements = schema
    .split(';')
    .map(statement => statement.trim())
    .filter(statement => statement.length > 0);

// Execute each statement
const executeStatements = async () => {
    for (const [index, statement] of statements.entries()) {
        try {
            await db.run(statement);
        } catch (err) {
            console.error(`Error executing statement ${index + 1}:`, err.message);
            console.error('Statement:', statement);
            process.exit(1);
        }
    }

    console.log('Database initialization completed successfully!');
    db.close();
};

// Start executing statements
console.log('Initializing database...');
if (fs.existsSync(DB_PATH)) {
    console.log('Database file already exists. It will be recreated.');
    fs.unlinkSync(DB_PATH);
}

executeStatements();

