import { useState } from 'react';
import { useChecklistStore } from '../store/checklistStore';

interface ChecklistHeaderProps {
  checklistId: string;
}

export const ChecklistHeader = ({ checklistId }: ChecklistHeaderProps) => {
  const { checklists, updateChecklistTitle, deleteChecklist } = useChecklistStore();
  const checklist = checklists.find((c) => c.id === checklistId);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(checklist?.title || '');

  if (!checklist) return null;

  const handleSave = () => {
    if (editTitle.trim()) {
      updateChecklistTitle(checklistId, editTitle.trim());
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
    <div className="checklist-header mb-6 cursor-grab active:cursor-grabbing">
      <div className="flex items-center justify-between mb-2">
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="flex-1 text-2xl font-bold text-gray-800 border-b-2 border-blue-500 focus:outline-none"
            autoFocus
          />
        ) : (
          <h1
            onClick={() => setIsEditing(true)}
            className="flex-1 text-2xl font-bold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors"
          >
            {checklist.title}
          </h1>
        )}
        <button
          onClick={() => {
            if (confirm('Delete this checklist?')) {
              deleteChecklist(checklistId);
            }
          }}
          className="ml-2 p-1 text-gray-400 hover:text-red-600 transition-colors"
          title="Delete checklist"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <p className="text-sm text-gray-500">
        {checklist.items.length} items • {checklist.items.filter(item => item.completed).length} completed
      </p>
    </div>
  );
};
