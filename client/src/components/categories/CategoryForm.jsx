import React, { useState, useEffect } from 'react';

const CategoryForm = ({ onSubmit, initialData = {} }) => {
  const [name, setName] = useState('');

  useEffect(() => {
    if (initialData.name) {
      setName(initialData.name);
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ name });
    setName('');
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Category Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <button type="submit">Save Category</button>
    </form>
  );
};

export default CategoryForm;
