import { useState, useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChecklistItem as ChecklistItemType } from '../types';
import { useChecklistStore } from '../store/checklistStore';

interface ChecklistItemProps {
  item: ChecklistItemType;
  checklistId: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export const ChecklistItem = ({ item, checklistId, disabled = false, autoFocus = false }: ChecklistItemProps) => {
  const [isEditing, setIsEditing] = useState(item.text === '' || autoFocus);
  const [editText, setEditText] = useState(item.text);
  const inputRef = useRef<HTMLInputElement>(null);

  const { toggleItemComplete, updateItemText, deleteItem, insertItemAfter } = useChecklistStore();

  // Use composite ID format for cross-checklist dragging (use :: as separator to avoid UUID dash conflicts)
  const compositeId = `${checklistId}::${item.id}`;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: compositeId, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editText.trim()) {
      updateItemText(checklistId, item.id, editText.trim());
      setIsEditing(false);
    } else if (item.text === '') {
      // If it's a new empty item and user didn't type anything, delete it
      deleteItem(checklistId, item.id);
    } else {
      setEditText(item.text);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Save current item first
      if (editText.trim()) {
        updateItemText(checklistId, item.id, editText.trim());
      }
      setIsEditing(false);
      // Create new item below
      insertItemAfter(checklistId, item.id);
    } else if (e.key === 'Escape') {
      setEditText(item.text);
      setIsEditing(false);
    } else if (e.key === 'Backspace' && editText === '' && item.text === '') {
      // Delete empty item on backspace
      e.preventDefault();
      deleteItem(checklistId, item.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 py-2"
    >
      {/* Drag handle */}
      {!disabled && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.5" />
            <circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" />
            <circle cx="15" cy="18" r="1.5" />
          </svg>
        </div>
      )}

      {/* Checkbox */}
      <input
        type="checkbox"
        checked={item.completed}
        onChange={() => toggleItemComplete(checklistId, item.id)}
        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-0 cursor-pointer"
      />

      {/* Text */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder="New item..."
          className="flex-1 bg-transparent outline-none border-none focus:ring-0"
        />
      ) : (
        <span
          onClick={() => setIsEditing(true)}
          className={`flex-1 cursor-text ${
            item.completed
              ? 'line-through text-gray-400'
              : item.text === '' ? 'text-gray-400' : 'text-gray-800'
          }`}
        >
          {item.text || 'New item...'}
        </span>
      )}

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          deleteItem(checklistId, item.id);
        }}
        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};
