import React from 'react';
import { useDispatch } from 'react-redux';
import CategoryList from '../components/categories/CategoryList';
import CategoryForm from '../components/categories/CategoryForm';
import { createCategory } from '../store/features/categoriesSlice';

const CategoriesPage = () => {
  const dispatch = useDispatch();

  const handleSubmit = (categoryData) => {
    dispatch(createCategory(categoryData));
  };

  return (
    <div>
      <h2>Category Management</h2>
      <CategoryForm onSubmit={handleSubmit} />
      <CategoryList />
    </div>
  );
};

export default CategoriesPage;
