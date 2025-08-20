const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Database file path
const DB_PATH = path.resolve('./db/question_bank.db');

console.log(`Creating database at: ${DB_PATH}`);

// Ensure the db directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Remove existing database file if it exists
if (fs.existsSync(DB_PATH)) {
    console.log('Removing existing database file...');
    fs.unlinkSync(DB_PATH);
}

// Create a new database file
fs.writeFileSync(DB_PATH, '');
console.log('Created new database file.');

// Connect to the database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error creating database:', err.message);
        process.exit(1);
    }
    console.log('Connected to the SQLite database.');
    
    // Enable foreign key constraints
    db.run('PRAGMA foreign_keys = ON;');
    
    // Create tables
    createTables();
});

// Function to create all tables
function createTables() {
    const schema = `
    -- Companies table
    CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Users table
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'company_admin', 'question_writer', 'reviewer')),
        company_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );

    -- Categories table
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Subcategories table
    CREATE TABLE IF NOT EXISTS subcategories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
        UNIQUE(category_id, name)
    );

    -- Questions table
    CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        options JSON NOT NULL,
        correct_answers JSON NOT NULL,
        score INTEGER DEFAULT 10,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'pending_review')),
        created_by INTEGER NOT NULL,
        company_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (company_id) REFERENCES companies(id)
    );

    -- Votes table
    CREATE TABLE IF NOT EXISTS votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        vote_type TEXT NOT NULL CHECK(vote_type IN ('up', 'down')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(question_id, user_id)
    );

    -- Question categories mapping table
    CREATE TABLE IF NOT EXISTS question_categories (
        question_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        subcategory_id INTEGER,
        PRIMARY KEY (question_id, category_id, subcategory_id),
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
        FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE CASCADE
    );

    -- Question history/audit log
    CREATE TABLE IF NOT EXISTS question_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id INTEGER NOT NULL,
        changed_by INTEGER NOT NULL,
        change_type TEXT NOT NULL CHECK(change_type IN ('created', 'updated', 'deleted', 'status_changed')),
        change_details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
        FOREIGN KEY (changed_by) REFERENCES users(id)
    );
    `;

    // Split the schema into statements and execute them
    const statements = schema
        .split(';')
        .map(statement => statement.trim())
        .filter(statement => statement.length > 0);

    let completed = 0;
    const total = statements.length;

    statements.forEach((statement, index) => {
        db.run(statement, (err) => {
            if (err) {
                console.error(`Error executing statement ${index + 1}:`, err.message);
                console.error('Statement:', statement);
                process.exit(1);
            }
            
            completed++;
            console.log(`[${completed}/${total}] Table created successfully`);
            
            if (completed === total) {
                console.log('\nAll tables created successfully!');
                
                // Create indexes
                const indexes = [
                    'CREATE INDEX IF NOT EXISTS idx_questions_company ON questions(company_id)',
                    'CREATE INDEX IF NOT EXISTS idx_questions_created_by ON questions(created_by)',
                    'CREATE INDEX IF NOT EXISTS idx_votes_question ON votes(question_id)',
                    'CREATE INDEX IF NOT EXISTS idx_question_categories ON question_categories(question_id)'
                ];
                
                let indexesCreated = 0;
                indexes.forEach((sql, idx) => {
                    db.run(sql, (err) => {
                        if (err) {
                            console.error(`Error creating index ${idx + 1}:`, err.message);
                            return;
                        }
                        indexesCreated++;
                        console.log(`[${indexesCreated}/${indexes.length}] Index created`);
                        
                        if (indexesCreated === indexes.length) {
                            console.log('\nAll indexes created successfully!');
                            
                            // Create triggers
                            const triggers = [
                                `CREATE TRIGGER IF NOT EXISTS update_companies_timestamp
                                 AFTER UPDATE ON companies
                                 BEGIN
                                     UPDATE companies SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                                 END;`,
                                
                                `CREATE TRIGGER IF NOT EXISTS update_users_timestamp
                                 AFTER UPDATE ON users
                                 BEGIN
                                     UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                                 END;`,
                                
                                `CREATE TRIGGER IF NOT EXISTS update_questions_timestamp
                                 AFTER UPDATE ON questions
                                 BEGIN
                                     UPDATE questions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                                 END;`
                            ];
                            
                            let triggersCreated = 0;
                            triggers.forEach((triggerSql, tIdx) => {
                                db.run(triggerSql, (err) => {
                                    if (err) {
                                        console.error(`Error creating trigger ${tIdx + 1}:`, err.message);
                                        return;
                                    }
                                    triggersCreated++;
                                    console.log(`[${triggersCreated}/${triggers.length}] Trigger created`);
                                    
                                    if (triggersCreated === triggers.length) {
                                        console.log('\nAll triggers created successfully!');
                                        console.log('\n=== Database setup completed successfully! ===');
                                        console.log(`Database file: ${DB_PATH}`);
                                        
                                        // Verify tables
                                        db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", (err, tables) => {
                                            if (err) {
                                                console.error('Error verifying tables:', err.message);
                                                db.close();
                                                return;
                                            }
                                            
                                            console.log('\n=== Database Tables ===');
                                            tables.forEach((table, i) => {
                                                console.log(`${i + 1}. ${table.name}`);
                                            });
                                            
                                            db.close();
                                        });
                                    }
                                });
                            });
                        }
                    });
                });
            }
        });
    });
}

// Handle errors
db.on('error', (err) => {
    console.error('Database error:', err);
    process.exit(1);
});
