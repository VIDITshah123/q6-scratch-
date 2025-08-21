import React from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import QuestionForm from '../components/questions/QuestionForm';
import { createQuestion } from '../store/features/questionsSlice';

const AddQuestionPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = (questionData) => {
    dispatch(createQuestion(questionData)).then(() => {
      navigate('/dashboard/questions');
    });
  };

  return (
    <div>
      <h2>Add New Question</h2>
      <QuestionForm onSubmit={handleSubmit} />
    </div>
  );
};

export default AddQuestionPage;
