import { useState } from 'react';
import { useChecklistStore } from '../store/checklistStore';

export const ChecklistHeader = () => {
  const { checklist, updateChecklistTitle } = useChecklistStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(checklist?.title || '');

  if (!checklist) return null;

  const handleSave = () => {
    if (editTitle.trim()) {
      updateChecklistTitle(editTitle.trim());
    } else {
      setEditTitle(checklist.title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditTitle(checklist.title);
      setIsEditing(false);
    }
  };

  return (
    <div className="mb-6">
      {isEditing ? (
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="text-3xl font-bold text-gray-800 border-b-2 border-blue-500 focus:outline-none w-full"
          autoFocus
        />
      ) : (
        <h1
          onClick={() => setIsEditing(true)}
          className="text-3xl font-bold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors"
        >
          {checklist.title}
        </h1>
      )}
      <p className="text-sm text-gray-500 mt-2">
        {checklist.items.length} items • {checklist.items.filter(item => item.completed).length} completed
      </p>
    </div>
  );
};
