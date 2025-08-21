import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchReviewQueue } from '../../store/features/reviewsSlice';
import ReviewForm from './ReviewForm';

const ReviewQueue = () => {
  const dispatch = useDispatch();
  const { queue, status, error } = useSelector((state) => state.reviews);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchReviewQueue());
    }
  }, [status, dispatch]);

  if (status === 'loading') {
    return <div>Loading review queue...</div>;
  }

  if (status === 'failed') {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h3>Questions for Review</h3>
      {queue.length === 0 ? (
        <p>No questions to review.</p>
      ) : (
        <ul>
          {queue.map((question) => (
            <li key={question.id}>
              <p>{question.content}</p>
              <ReviewForm questionId={question.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ReviewQueue;
