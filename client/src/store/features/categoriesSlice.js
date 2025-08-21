import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async thunks for CRUD operations
export const fetchCategories = createAsyncThunk('categories/fetchCategories', async () => {
  const response = await api.get('/categories');
  return response.data;
});

export const createCategory = createAsyncThunk('categories/createCategory', async (categoryData) => {
  const response = await api.post('/categories', categoryData);
  return response.data;
});

export const updateCategory = createAsyncThunk('categories/updateCategory', async ({ id, ...categoryData }) => {
  const response = await api.put(`/categories/${id}`, categoryData);
  return response.data;
});

export const deleteCategory = createAsyncThunk('categories/deleteCategory', async (id) => {
  await api.delete(`/categories/${id}`);
  return id;
});

const initialState = {
  items: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch categories
      .addCase(fetchCategories.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      // Create category
      .addCase(createCategory.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      // Update category
      .addCase(updateCategory.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      // Delete category
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
      });
  },
});

export default categoriesSlice.reducer;
