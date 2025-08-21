import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Fetch questions for review
export const fetchReviewQueue = createAsyncThunk('reviews/fetchReviewQueue', async () => {
  const response = await api.get('/reviews/queue');
  return response.data;
});

// Submit a review
export const submitReview = createAsyncThunk('reviews/submitReview', async ({ questionId, ...reviewData }) => {
  const response = await api.post(`/reviews/question/${questionId}`, reviewData);
  return { questionId, review: response.data };
});

const initialState = {
  queue: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const reviewsSlice = createSlice({
  name: 'reviews',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch review queue
      .addCase(fetchReviewQueue.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchReviewQueue.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.queue = action.payload;
      })
      .addCase(fetchReviewQueue.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      // Submit review
      .addCase(submitReview.fulfilled, (state, action) => {
        state.queue = state.queue.filter((q) => q.id !== action.payload.questionId);
      });
  },
});

export default reviewsSlice.reducer;
