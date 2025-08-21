import React from 'react';
import { Link } from 'react-router-dom';
import QuestionList from '../components/questions/QuestionList';

const QuestionsPage = () => {
  return (
    <div>
      <h2>Question Management</h2>
      <Link to="/dashboard/questions/add">Add New Question</Link>
      <QuestionList />
    </div>
  );
};

export default QuestionsPage;
