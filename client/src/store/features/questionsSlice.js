import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchQuestions = createAsyncThunk('questions/fetchQuestions', async () => {
  const response = await api.get('/questions');
  return response.data;
});

export const createQuestion = createAsyncThunk('questions/createQuestion', async (questionData) => {
  const response = await api.post('/questions', questionData);
  return response.data;
});

const initialState = {
  items: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const questionsSlice = createSlice({
  name: 'questions',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchQuestions.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchQuestions.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchQuestions.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(createQuestion.fulfilled, (state, action) => {
        state.items.push(action.payload);
      });
  },
});

export default questionsSlice.reducer;
