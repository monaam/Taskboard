import { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useChecklistStore } from '../store/checklistStore';
import { ChecklistHeader } from './ChecklistHeader';
import { ChecklistActions } from './ChecklistActions';
import { ChecklistItem } from './ChecklistItem';

export const Checklist = () => {
  const { checklist, addItem, reorderItems } = useChecklistStore();
  const [newItemText, setNewItemText] = useState('');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [moveCompletedToBottom, setMoveCompletedToBottom] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { incompleteItems, completedItems } = useMemo(() => {
    if (!checklist) return { incompleteItems: [], completedItems: [] };

    const incomplete = checklist.items.filter(item => !item.completed);
    const completed = checklist.items.filter(item => item.completed);

    return {
      incompleteItems: incomplete,
      completedItems: hideCompleted ? [] : completed,
    };
  }, [checklist, hideCompleted]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemText.trim()) {
      addItem(newItemText.trim());
      setNewItemText('');
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      // Only reorder within incomplete items
      const oldIndex = checklist!.items.findIndex((item) => item.id === active.id);
      const newIndex = checklist!.items.findIndex((item) => item.id === over.id);

      // Check if both items are incomplete
      const activeItem = checklist!.items[oldIndex];
      const overItem = checklist!.items[newIndex];

      if (oldIndex !== -1 && newIndex !== -1 && !activeItem.completed && !overItem.completed) {
        reorderItems(oldIndex, newIndex);
      }
    }
  };

  if (!checklist) return null;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <ChecklistHeader />

      <ChecklistActions
        hideCompleted={hideCompleted}
        setHideCompleted={setHideCompleted}
        moveCompletedToBottom={moveCompletedToBottom}
        setMoveCompletedToBottom={setMoveCompletedToBottom}
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

      {/* Items list */}
      {incompleteItems.length === 0 && completedItems.length === 0 ? (
        <p className="text-center text-gray-400 py-8">
          {hideCompleted && checklist.items.length > 0
            ? 'All items completed! 🎉'
            : 'No items yet. Add one above!'}
        </p>
      ) : (
        <>
          {/* Incomplete Items - Draggable */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={incompleteItems.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {incompleteItems.map((item) => (
                  <ChecklistItem key={item.id} item={item} disabled={false} />
                ))}
              </div>
            </SortableContext>
          </DndContext>

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
              <ChecklistItem key={item.id} item={item} disabled={true} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
