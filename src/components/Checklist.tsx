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
  checklistId: string;
  zoom: number;
  pan: { x: number; y: number };
}

export const Checklist = ({ checklistId, zoom, pan }: ChecklistProps) => {
  const { checklists, updateChecklistPosition } = useChecklistStore();

  // Make this checklist a droppable area for cross-list dragging
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `droppable-${checklistId}`,
  });
  const checklist = checklists.find((c) => c.id === checklistId);

  const [hideCompleted, setHideCompleted] = useState(false);
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
    updateChecklistPosition(checklistId, newX, newY);
  }, [checklistId, checklist, updateChecklistPosition, zoom, pan]);

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

  // Drag checklist card on canvas
  const handleCardMouseDown = (e: React.MouseEvent) => {
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

  if (!checklist) return null;

  const colorStyles = CHECKLIST_COLORS[checklist.color || 'default'];

  return (
    <div
      ref={cardRef}
      onMouseDown={handleCardMouseDown}
      className={`w-96 rounded-xl shadow-xl border border-gray-200 ${colorStyles.bg}`}
      style={{
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      <div className="p-6">
        <ChecklistHeader
          checklistId={checklistId}
          hideCompleted={hideCompleted}
          setHideCompleted={setHideCompleted}
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
