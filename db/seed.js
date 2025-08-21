const bcrypt = require('bcryptjs');
const Database = require('../src/utils/db');
const db = new Database();

const seedDatabase = async () => {
  try {
    console.log('Starting to seed the database...');

    // 1. Create a company
    const { id: companyId } = await db.run(
      'INSERT INTO companies (name) VALUES (?)',
      ['TechCorp']
    );
    console.log(`Created company 'TechCorp' with ID: ${companyId}`);

    // 2. Create users with different roles
    const users = [
      {
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin',
        company_id: null, // Super admin is not tied to a company
      },
      {
        name: 'Company Admin',
        email: 'companyadmin@example.com',
        password: 'password123',
        role: 'company_admin',
        company_id: companyId,
      },
      {
        name: 'Question Writer',
        email: 'writer@example.com',
        password: 'password123',
        role: 'question_writer',
        company_id: companyId,
      },
      {
        name: 'Reviewer User',
        email: 'reviewer@example.com',
        password: 'password123',
        role: 'reviewer',
        company_id: companyId,
      },
    ];

    for (const user of users) {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(user.password, salt);
      
      await db.run(
        'INSERT INTO users (name, email, password_hash, role, company_id) VALUES (?, ?, ?, ?, ?)',
        [user.name, user.email, password_hash, user.role, user.company_id]
      );
      console.log(`Created user: ${user.name} (${user.email})`);
    }

    console.log('\nDatabase seeding completed successfully!');
    console.log('You can log in with the following credentials:');
    console.log('Email: [user]@example.com (e.g., admin@example.com)');
    console.log('Password: password123');

  } catch (error) {
    console.error('Error seeding the database:', error);
  } finally {
    db.close();
  }
};

seedDatabase();
