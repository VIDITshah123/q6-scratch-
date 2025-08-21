import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/features/authSlice';

const DashboardLayout = () => {
  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <div>
      <header>
        <nav>
          <Link to="/dashboard">Dashboard</Link> | {" "}
          <Link to="/dashboard/questions">Questions</Link> |{" "}
          <Link to="/dashboard/categories">Categories</Link> |{" "}
          <Link to="/dashboard/review">Review</Link> |{" "}
          {/* Add other dashboard links here */}
        </nav>
        <button onClick={handleLogout}>Logout</button>
      </header>
      <main>
        <Outlet /> {/* This will render the nested route components */}
      </main>
    </div>
  );
};

export default DashboardLayout;
