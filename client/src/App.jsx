import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardLayout from './components/layout/DashboardLayout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import QuestionsPage from './pages/QuestionsPage.jsx';
import AddQuestionPage from './pages/AddQuestionPage.jsx';
import CategoriesPage from './pages/CategoriesPage.jsx';
import ReviewPage from './pages/ReviewPage.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="questions" element={<QuestionsPage />} />
            <Route path="questions/add" element={<AddQuestionPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="review" element={<ReviewPage />} />
            {/* Add other nested dashboard routes here */}
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
