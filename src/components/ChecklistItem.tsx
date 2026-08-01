import { useState, useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChecklistItem as ChecklistItemType } from '../types';
import { useChecklistStore } from '../store/checklistStore';
import { useItemDetailStore } from '../store/uiStore';
import { ItemBadges } from './ItemBadges';

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
  const openItemDetail = useItemDetailStore((s) => s.openItemDetail);

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

  // Row is items-start, not items-center: with badges a row can be two lines
  // tall, and centering drifts the checkbox below the text it labels.
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-start gap-2 py-2"
    >
      {/* Drag handle - always visible on mobile (touch devices) */}
      {!disabled && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity touch-none"
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
        className="w-5 h-5 mt-0.5 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-0 cursor-pointer"
      />

      {/* Text + badges. min-w-0 here and break-words on the span keep long
          unbroken text from blowing out the 384px card. The input and span use
          w-full rather than flex-1: inside a flex-col, flex-1 grows them along
          the vertical axis and inflates the row height. */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            placeholder="New item..."
            className="w-full bg-transparent outline-none border-none focus:ring-0"
          />
        ) : (
          <span
            onClick={() => setIsEditing(true)}
            className={`w-full cursor-text break-words ${
              item.completed
                ? 'line-through text-gray-400'
                : item.text === '' ? 'text-gray-400' : 'text-gray-800'
            }`}
          >
            {item.text || 'New item...'}
          </span>
        )}

        <ItemBadges item={item} />
      </div>

      {/* Details trigger. Hidden while the item is still blank: that is the same
          predicate handleSave uses to decide to delete the row, and it also
          covers the window before the POST swaps in the server id. */}
      {item.text !== '' && (
        <button
          type="button"
          aria-label="Item details"
          // Keeps focus in the text input, so onBlur -> handleSave -> deleteItem
          // can't fire and delete the row out from under the panel.
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            if (isEditing && editText.trim() && editText.trim() !== item.text) {
              updateItemText(checklistId, item.id, editText.trim());
            }
            openItemDetail(item.id);
          }}
          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-2 text-gray-400 hover:text-blue-500 transition-opacity shrink-0"
        >
          {/* adjustments/sliders: reads as "properties", which is what the panel
              is. Distinct from the document-text glyph on the notes badge. */}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
          </svg>
        </button>
      )}

      {/* Delete button - always visible on mobile */}
      <button
        type="button"
        aria-label="Delete item"
        onClick={(e) => {
          e.stopPropagation();
          deleteItem(checklistId, item.id);
        }}
        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 transition-opacity shrink-0"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};
