import { useState } from 'react';
import { useChecklistStore } from '../store/checklistStore';
import { ChecklistColor, CHECKLIST_COLORS } from '../types';

interface ChecklistHeaderProps {
  checklistId: string;
  hideCompleted: boolean;
  setHideCompleted: (value: boolean) => void;
}

const COLOR_OPTIONS: { color: ChecklistColor; dot: string }[] = [
  { color: 'default', dot: 'bg-white border border-gray-300' },
  { color: 'red', dot: 'bg-red-400' },
  { color: 'orange', dot: 'bg-orange-400' },
  { color: 'yellow', dot: 'bg-yellow-400' },
  { color: 'green', dot: 'bg-green-400' },
  { color: 'teal', dot: 'bg-teal-400' },
  { color: 'blue', dot: 'bg-blue-400' },
  { color: 'purple', dot: 'bg-purple-400' },
  { color: 'pink', dot: 'bg-pink-400' },
  { color: 'brown', dot: 'bg-amber-600' },
  { color: 'gray', dot: 'bg-gray-400' },
];

export const ChecklistHeader = ({ checklistId, hideCompleted, setHideCompleted }: ChecklistHeaderProps) => {
  const { checklists, updateChecklistTitle, updateChecklistColor, deleteChecklist, deleteAllCompleted, selectAll, deselectAll } = useChecklistStore();
  const checklist = checklists.find((c) => c.id === checklistId);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(checklist?.title || '');
  const [showMenu, setShowMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const hasCompletedItems = checklist?.items.some(item => item.completed) || false;
  const hasItems = (checklist?.items.length || 0) > 0;

  if (!checklist) return null;

  const colorStyles = CHECKLIST_COLORS[checklist.color || 'default'];

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
    <div className="mb-6">
      {/* Drag Handle */}
      <div className={`checklist-header flex justify-center py-2 -mx-6 -mt-6 mb-4 ${colorStyles.header} rounded-t-xl cursor-grab active:cursor-grabbing select-none hover:opacity-80 transition-opacity`}>
        <svg className="w-6 h-4 text-gray-500" viewBox="0 0 24 12" fill="currentColor">
          <circle cx="4" cy="3" r="1.5" />
          <circle cx="12" cy="3" r="1.5" />
          <circle cx="20" cy="3" r="1.5" />
          <circle cx="4" cy="9" r="1.5" />
          <circle cx="12" cy="9" r="1.5" />
          <circle cx="20" cy="9" r="1.5" />
        </svg>
      </div>

      <div className="flex items-center justify-between mb-2">
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="flex-1 text-2xl font-bold text-gray-800 border-b-2 border-blue-500 focus:outline-none bg-transparent"
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
        {/* Three dots menu */}
        <div className="relative ml-2">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => {
                  setShowMenu(false);
                  setShowColorPicker(false);
                }}
              />
              <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[180px]">
                {/* Color picker toggle */}
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg flex items-center justify-between"
                >
                  <span>Color</span>
                  <div className={`w-4 h-4 rounded-full ${COLOR_OPTIONS.find(c => c.color === checklist.color)?.dot || COLOR_OPTIONS[0].dot}`} />
                </button>

                {/* Color picker palette */}
                {showColorPicker && (
                  <div className="px-3 py-2 border-t border-gray-100">
                    <div className="flex flex-wrap gap-2">
                      {COLOR_OPTIONS.map(({ color, dot }) => (
                        <button
                          key={color}
                          onClick={() => {
                            updateChecklistColor(checklistId, color);
                            setShowColorPicker(false);
                          }}
                          className={`w-6 h-6 rounded-full ${dot} hover:scale-110 transition-transform ${
                            checklist.color === color ? 'ring-2 ring-offset-1 ring-blue-500' : ''
                          }`}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    setHideCompleted(!hideCompleted);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  {hideCompleted ? 'Show Completed' : 'Hide Completed'}
                </button>
                <button
                  onClick={() => {
                    selectAll(checklistId);
                    setShowMenu(false);
                  }}
                  disabled={!hasItems}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400 disabled:hover:bg-white"
                >
                  Select All
                </button>
                <button
                  onClick={() => {
                    deselectAll(checklistId);
                    setShowMenu(false);
                  }}
                  disabled={!hasCompletedItems}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400 disabled:hover:bg-white"
                >
                  Deselect All
                </button>
                <hr className="my-1" />
                <button
                  onClick={() => {
                    if (confirm('Delete all completed items?')) {
                      deleteAllCompleted(checklistId);
                    }
                    setShowMenu(false);
                  }}
                  disabled={!hasCompletedItems}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400 disabled:hover:bg-white"
                >
                  Delete Completed
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this checklist?')) {
                      deleteChecklist(checklistId);
                    }
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                >
                  Delete Checklist
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-500">
        {checklist.items.length} items • {checklist.items.filter(item => item.completed).length} completed
      </p>
    </div>
  );
};
