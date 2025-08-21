import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div>
      <h1>Welcome to the Question Bank</h1>
      <nav>
        <Link to="/login">Login</Link> | {" "}
        <Link to="/register">Register</Link>
      </nav>
    </div>
  );
};

export default HomePage;
