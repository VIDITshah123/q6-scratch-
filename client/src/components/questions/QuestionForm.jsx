import React, { useState } from 'react';

const QuestionForm = ({ onSubmit, initialData = {} }) => {
  const [content, setContent] = useState(initialData.content || '');
  const [options, setOptions] = useState(initialData.options || ['']);
  // Add other fields as needed (correct_answers, score, etc.)

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    setOptions([...options, '']);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ content, options });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Question Content</label>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} required />
      </div>
      <div>
        <label>Options</label>
        {options.map((option, index) => (
          <input
            key={index}
            type="text"
            value={option}
            onChange={(e) => handleOptionChange(index, e.target.value)}
            required
          />
        ))}
        <button type="button" onClick={addOption}>Add Option</button>
      </div>
      <button type="submit">Save Question</button>
    </form>
  );
};

export default QuestionForm;
