import { useState } from 'react';
import { useChecklistStore } from '../store/checklistStore';

interface ChecklistActionsProps {
  checklistId: string;
  hideCompleted: boolean;
  setHideCompleted: (value: boolean) => void;
}

export const ChecklistActions = ({
  checklistId,
  hideCompleted,
  setHideCompleted,
}: ChecklistActionsProps) => {
  const { checklists, deleteAllCompleted, selectAll, deselectAll } = useChecklistStore();
  const checklist = checklists.find((c) => c.id === checklistId);
  const [showMenu, setShowMenu] = useState(false);

  if (!checklist) return null;

  const hasCompletedItems = checklist.items.some(item => item.completed);
  const hasItems = checklist.items.length > 0;

  return (
    <div className="mb-4 flex justify-end">
      {/* Three dots menu */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>

        {showMenu && (
          <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[180px]">
            <button
              onClick={() => {
                setHideCompleted(!hideCompleted);
                setShowMenu(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              {hideCompleted ? 'Show Completed' : 'Hide Completed'}
            </button>
            <hr className="my-1" />
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
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:text-gray-400 disabled:hover:bg-white"
            >
              Delete Completed
            </button>
          </div>
        )}
      </div>

      {/* Close menu on outside click */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};
