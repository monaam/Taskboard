import { useState, useMemo, useRef } from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { useChecklistStore } from '../store/checklistStore';
import { ChecklistHeader } from './ChecklistHeader';
import { ChecklistActions } from './ChecklistActions';
import { ChecklistItem } from './ChecklistItem';

interface ChecklistProps {
  checklistId: string;
}

export const Checklist = ({ checklistId }: ChecklistProps) => {
  const { checklists, addItem, updateChecklistPosition } = useChecklistStore();

  // Make this checklist a droppable area for cross-list dragging
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `droppable-${checklistId}`,
  });
  const checklist = checklists.find((c) => c.id === checklistId);

  const [newItemText, setNewItemText] = useState('');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const { incompleteItems, completedItems } = useMemo(() => {
    if (!checklist) return { incompleteItems: [], completedItems: [] };

    const incomplete = checklist.items.filter((item) => !item.completed);
    const completed = checklist.items.filter((item) => item.completed);

    return {
      incompleteItems: incomplete,
      completedItems: hideCompleted ? [] : completed,
    };
  }, [checklist, hideCompleted]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemText.trim() && checklist) {
      addItem(checklistId, newItemText.trim());
      setNewItemText('');
    }
  };

  // Drag checklist card on canvas
  const handleCardMouseDown = (e: React.MouseEvent) => {
    // Only drag if clicking on the header
    if ((e.target as HTMLElement).closest('.checklist-header')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - (checklist?.x || 0),
        y: e.clientY - (checklist?.y || 0),
      });
    }
  };

  const handleCardMouseMove = (e: React.MouseEvent) => {
    if (isDragging && checklist) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      updateChecklistPosition(checklistId, newX, newY);
    }
  };

  const handleCardMouseUp = () => {
    setIsDragging(false);
  };

  if (!checklist) return null;

  return (
    <div
      ref={cardRef}
      onMouseDown={handleCardMouseDown}
      onMouseMove={handleCardMouseMove}
      onMouseUp={handleCardMouseUp}
      onMouseLeave={handleCardMouseUp}
      className="w-96 bg-white rounded-xl shadow-xl border border-gray-200"
      style={{
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      <div className="p-6">
        <ChecklistHeader checklistId={checklistId} />

        <ChecklistActions
          checklistId={checklistId}
          hideCompleted={hideCompleted}
          setHideCompleted={setHideCompleted}
        />

        {/* Add new item form */}
        <form onSubmit={handleAddItem} className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="Add a new item..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Add
            </button>
          </div>
        </form>

        {/* Items list - Always droppable */}
        <div ref={setDroppableRef} className="min-h-[60px]">
          {incompleteItems.length === 0 && completedItems.length === 0 ? (
            <p className="text-center text-gray-400 py-8">
              {hideCompleted && checklist.items.length > 0
                ? 'All items completed! 🎉'
                : 'No items yet. Add one above!'}
            </p>
          ) : (
            <>
              {/* Incomplete Items - Draggable */}
              <SortableContext
                items={incompleteItems.map((item) => `${checklistId}::${item.id}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {incompleteItems.map((item) => (
                    <ChecklistItem
                      key={item.id}
                      item={item}
                      checklistId={checklistId}
                      disabled={false}
                    />
                  ))}
                </div>
              </SortableContext>

              {/* Separator */}
              {completedItems.length > 0 && (
                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px bg-gray-300"></div>
                  <span className="text-sm text-gray-500 font-medium">
                    Completed ({completedItems.length})
                  </span>
                  <div className="flex-1 h-px bg-gray-300"></div>
                </div>
              )}

              {/* Completed Items - Not Draggable */}
              <div className="space-y-2">
                {completedItems.map((item) => (
                  <ChecklistItem
                    key={item.id}
                    item={item}
                    checklistId={checklistId}
                    disabled={true}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
