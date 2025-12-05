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
    <div className="mb-4 flex flex-wrap gap-2 items-center">
      {/* Toggle buttons */}
      <button
        onClick={() => setHideCompleted(!hideCompleted)}
        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
          hideCompleted
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        {hideCompleted ? 'Show Completed' : 'Hide Completed'}
      </button>

      {/* More actions menu */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          More Actions
        </button>

        {showMenu && (
          <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[180px]">
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
