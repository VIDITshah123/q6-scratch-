# Question Bank Management System - Product Requirements Document (PRD)

## 1. Introduction
A web application for managing and collaborating on multiple-choice questions (MCQs) with role-based access control.

## 2. User Roles

### 2.1 Admin
- Can view all companies
- Can add new companies
- Can remove companies
- Can edit existing companies


### 2.2 Company
- View all questions
- Manage employees:
  - Add new employees
  - Remove employees
  - Edit employees
  - View employees
  - Assign/change employee roles (question_writer/Reviewer)

### 2.3 Employee Roles

#### question_writer
- Add new questions
- Edit own questions
- Delete own questions
- View all questions (own and others')
- Upvote/downvote others questions
- Categorize questions with categories and subcategories
- Questions can have single or multiple correct answers
- Limited to one vote (up/down) per question
- question_writer should see the questions that are invalidated and reasons for those 
- question_writer should see the score for each question

#### Reviewer
- View all questions
- Upvote/downvote questions
- If a reviewer finds a question inappropriate, they can mark it as invalid and provide a reason for the invalidation


## 3. Question Management

### 3.1 Question Structure
- Type: Multiple Choice Questions (MCQs) only
- Options per question:
  - Minimum: 2 options
  - Maximum: 6 options
  - Can have single or multiple correct answers

### 3.2 Question Scoring
- Each question starts with: 10 points
- Voting impact:
  - One upvote: Adds 1 point to the question's total score
  - One downvote: Subtracts 1 point from the question's total score
- The score is calculated as: Initial points (10) + (Number of upvotes) - (Number of downvotes)

## 4. Features

### 4.1 Dashboard
- Display questions sorted by score (highest to lowest)
- Hover functionality to show:
  - Question creation timestamp
  - Name of the employee who created the question
### 4.2 Question Management
- Add new questions
- Edit existing questions (for question_writers, only their own)
- Delete questions (for question_writers, only their own)
- Categorization with categories and subcategories

### 4.3 Voting System
- One vote (up/down) per user per question
- Real-time point updates

## 5. Technical Requirements

### 5.1 Security
- Role-based access control
- Secure authentication
- Data validation

### 5.2 Performance
- Efficient question loading and searching
- Real-time updates for votes
- Responsive design for various screen sizes

## 6. Future Enhancements
- Advanced search and filtering
- Question tagging system
- Performance analytics
- Bulk question upload
- Question duplication detection

## 7. Database Design

### 7.1 Tables
- Users
- Companies
- Questions
- Categories
- Subcategories
- Votes
- Question history

### 7.2 Relationships
- One-to-many: Companies to Users
- One-to-many: Users to Questions
- Many-to-many: Questions to Categories
- Many-to-many: Questions to Subcategories
- One-to-many: Questions to Votes
- One-to-many: Questions to Question history

## 8. UI/UX Design

### 8.1 Dashboard
- Clean and modern interface
- Easy navigation
- Responsive design for various screen sizes

### 8.2 Question Management
- Intuitive interface for adding, editing, and deleting questions
- Easy categorization with categories and subcategories
- Clear instructions for question structure

### 8.3 Voting System
- Simple and intuitive voting interface
- Clear instructions for voting
- Real-time updates for voting  

### 8.4 Question Management
- Intuitive interface for adding, editing, and deleting questions
- Easy categorization with categories and subcategories
- Clear instructions for question structure

### 8.5 Voting System
- Simple and intuitive voting interface
- Clear instructions for voting
- Real-time updates for voting  

### 8.6 Question Management
- Intuitive interface for adding, editing, and deleting questions
- Easy categorization with categories and subcategories
- Clear instructions for question structure

## 9. Technology Stack

### Backend
- Node.js - JavaScript runtime environment
- Express.js - Web application framework
- SQLite - Database (via sqlite3 package)
- JSON Web Tokens (JWT) - For authentication
- Express Validator - Request validation middleware
- Helmet - Security middleware
- Multer - File upload handling
- BcryptJS - Password hashing
- UUID - For generating unique identifiers
- Nodemon - Development server with auto-restart
- Jest & Supertest - Testing framework and HTTP assertions

### Frontend
- React - Frontend JavaScript library
- React Router - Client-side routing
- Material-UI (MUI) - UI component library
- Axios - HTTP client
- Formik & Yup - Form handling and validation
- Redux/Context API - State management
- Chart.js & React-ChartJS-2 - Data visualization
- React Dropzone - File upload handling
- Date-fns - Date manipulation
- React Toastify & Notistack - Notifications
- React Icons - Icon library
- React Bootstrap - Additional UI components

### Database
- SQLite - Database (via sqlite3 package)