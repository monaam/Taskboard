import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { useChecklistStore } from '../store/checklistStore';
import { ChecklistHeader } from './ChecklistHeader';
import { ChecklistItem } from './ChecklistItem';
import { CHECKLIST_COLORS } from '../types';

interface ChecklistProps {
  checklistId?: string;
  checklist?: import('../types').Checklist;
  zoom?: number;
  pan?: { x: number; y: number };
  listViewMode?: boolean;
  dragHandleProps?: any;
  isFirst?: boolean;
  isLast?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export const Checklist = ({
  checklistId,
  checklist: checklistProp,
  zoom = 1,
  pan = { x: 0, y: 0 },
  listViewMode = false,
  dragHandleProps,
  isFirst = false,
  isLast = false,
  onMoveUp,
  onMoveDown
}: ChecklistProps) => {
  const { checklists, updateChecklistPosition } = useChecklistStore();

  // Make this checklist a droppable area for cross-list dragging
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `droppable-${checklistId || checklistProp?.id}`,
  });
  const checklist = checklistProp || checklists.find((c) => c.id === checklistId);

  const [hideCompleted, setHideCompleted] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
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

  // Handle mouse move at window level for smooth dragging
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!checklist) return;
    // Account for zoom and pan when calculating position
    const newX = (e.clientX - pan.x) / zoom - dragStartRef.current.x;
    const newY = (e.clientY - pan.y) / zoom - dragStartRef.current.y;
    updateChecklistPosition(checklist.id, newX, newY);
  }, [checklist, updateChecklistPosition, zoom, pan]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add/remove window event listeners when dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Drag checklist card on canvas (mouse)
  const handleCardMouseDown = (e: React.MouseEvent) => {
    // Don't drag in list view mode
    if (listViewMode) return;
    // Only drag if clicking on the header
    if ((e.target as HTMLElement).closest('.checklist-header')) {
      e.preventDefault(); // Prevent text selection
      // Store offset from checklist origin (not from mouse)
      dragStartRef.current = {
        x: (e.clientX - pan.x) / zoom - (checklist?.x || 0),
        y: (e.clientY - pan.y) / zoom - (checklist?.y || 0),
      };
      setIsDragging(true);
    }
  };

  // Touch handlers for mobile checklist dragging
  const handleCardTouchStart = (e: React.TouchEvent) => {
    // Don't drag in list view mode
    if (listViewMode) return;
    if ((e.target as HTMLElement).closest('.checklist-header')) {
      const touch = e.touches[0];
      dragStartRef.current = {
        x: (touch.clientX - pan.x) / zoom - (checklist?.x || 0),
        y: (touch.clientY - pan.y) / zoom - (checklist?.y || 0),
      };
      setIsDragging(true);
    }
  };

  const handleCardTouchMove = useCallback((e: TouchEvent) => {
    if (!checklist || !isDragging) return;
    const touch = e.touches[0];
    const newX = (touch.clientX - pan.x) / zoom - dragStartRef.current.x;
    const newY = (touch.clientY - pan.y) / zoom - dragStartRef.current.y;
    updateChecklistPosition(checklist.id, newX, newY);
  }, [checklist, isDragging, updateChecklistPosition, zoom, pan]);

  const handleCardTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add touch event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('touchmove', handleCardTouchMove, { passive: false });
      window.addEventListener('touchend', handleCardTouchEnd);
      return () => {
        window.removeEventListener('touchmove', handleCardTouchMove);
        window.removeEventListener('touchend', handleCardTouchEnd);
      };
    }
  }, [isDragging, handleCardTouchMove, handleCardTouchEnd]);

  if (!checklist) return null;

  const colorStyles = CHECKLIST_COLORS[checklist.color || 'default'];

  return (
    <div
      ref={cardRef}
      onMouseDown={handleCardMouseDown}
      onTouchStart={handleCardTouchStart}
      className={`${listViewMode ? 'w-full' : 'w-[calc(100vw-2rem)] max-w-96'} rounded-xl shadow-xl border border-gray-200 ${colorStyles.bg}`}
      style={{
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      <div className="p-6">
        <ChecklistHeader
          checklistId={checklist.id}
          hideCompleted={hideCompleted}
          setHideCompleted={setHideCompleted}
          listViewDragHandle={listViewMode ? dragHandleProps : undefined}
          listViewMode={listViewMode}
          isFirst={isFirst}
          isLast={isLast}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
        />

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
                items={incompleteItems.map((item) => `${checklist.id}::${item.id}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {incompleteItems.map((item) => (
                    <ChecklistItem
                      key={item.id}
                      item={item}
                      checklistId={checklist.id}
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
                    checklistId={checklist.id}
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
