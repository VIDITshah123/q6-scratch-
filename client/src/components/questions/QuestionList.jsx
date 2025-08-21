import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchQuestions } from '../../store/features/questionsSlice';

const QuestionList = () => {
  const dispatch = useDispatch();
  const { items: questions, status, error } = useSelector((state) => state.questions);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchQuestions());
    }
  }, [status, dispatch]);

  if (status === 'loading') {
    return <div>Loading questions...</div>;
  }

  if (status === 'failed') {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h3>All Questions</h3>
      <ul>
        {questions.map((question) => (
          <li key={question.id}>{question.content}</li>
        ))}
      </ul>
    </div>
  );
};

export default QuestionList;
