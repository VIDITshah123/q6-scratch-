import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCategories, deleteCategory } from '../../store/features/categoriesSlice';

const CategoryList = () => {
  const dispatch = useDispatch();
  const { items: categories, status, error } = useSelector((state) => state.categories);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchCategories());
    }
  }, [status, dispatch]);

  const handleDelete = (id) => {
    dispatch(deleteCategory(id));
  };

  if (status === 'loading') {
    return <div>Loading categories...</div>;
  }

  if (status === 'failed') {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h3>All Categories</h3>
      <ul>
        {categories.map((category) => (
          <li key={category.id}>
            {category.name}
            {/* Add edit button/link here */}
            <button onClick={() => handleDelete(category.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CategoryList;
