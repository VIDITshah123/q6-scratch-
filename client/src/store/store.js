import { configureStore } from '@reduxjs/toolkit';
import authReducer from './features/authSlice';
import questionsReducer from './features/questionsSlice';
import categoriesReducer from './features/categoriesSlice';
import reviewsReducer from './features/reviewsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    questions: questionsReducer,
    categories: categoriesReducer,
    reviews: reviewsReducer,
  },
});
