import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { submitReview } from '../../store/features/reviewsSlice';

const ReviewForm = ({ questionId }) => {
  const dispatch = useDispatch();
  const [status, setStatus] = useState('approved'); // 'approved' | 'rejected'
  const [comments, setComments] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(submitReview({ questionId, status, comments }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="approved">Approve</option>
          <option value="rejected">Reject</option>
        </select>
      </div>
      <div>
        <textarea
          placeholder="Comments (required for rejection)"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          required={status === 'rejected'}
        />
      </div>
      <button type="submit">Submit Review</button>
    </form>
  );
};

export default ReviewForm;
