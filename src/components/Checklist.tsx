import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { useChecklistStore } from '../store/checklistStore';
import { ChecklistHeader } from './ChecklistHeader';
import { ChecklistItem } from './ChecklistItem';
import { QuickAddInput } from './QuickAddInput';
import { QuickAddParse, resolveChecklist } from '../utils/quickAdd';
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
  const { checklists, updateChecklistPosition, addItem } = useChecklistStore();

  // Make this checklist a droppable area for cross-list dragging
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `droppable-${checklistId || checklistProp?.id}`,
  });
  const checklist = checklistProp || checklists.find((c) => c.id === checklistId);

  const [hideCompleted, setHideCompleted] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(listViewMode); // Start collapsed in list view
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // In-progress rows float to the top of the open group; everything else keeps
  // the manual order. A display sort only — the stored order is untouched, so an
  // item drops back to exactly where it was when it stops being in progress.
  //
  // One pass with three buckets rather than three filters, and pushing in array
  // order makes the partition stable: relative order inside each bucket is the
  // board's order, verbatim.
  const { incompleteItems, completedItems } = useMemo(() => {
    if (!checklist) return { incompleteItems: [], completedItems: [] };

    const inProgress: typeof checklist.items = [];
    const todo: typeof checklist.items = [];
    const done: typeof checklist.items = [];
    for (const item of checklist.items) {
      if (item.status === 'done') done.push(item);
      else if (item.status === 'in_progress') inProgress.push(item);
      else todo.push(item);
    }

    return {
      incompleteItems: [...inProgress, ...todo],
      completedItems: hideCompleted ? [] : done,
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

  // A #list token still wins here: the chip shows where the task is going, so
  // honouring it is not a surprise, and typing it is faster than moving the
  // row afterwards.
  const handleQuickAdd = async (parse: QuickAddParse) => {
    const target = resolveChecklist(checklists, parse.listQuery) ?? checklist;
    await addItem(target.id, parse.text, parse.fields);
  };

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
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />

        {/* Items list - Always droppable, hidden when collapsed in list view */}
        {(!listViewMode || !isCollapsed) && (
          <>
          <div ref={setDroppableRef} className="min-h-[60px]">
          {incompleteItems.length === 0 && completedItems.length === 0 ? (
            <p className="text-center text-gray-400 py-8">
              {hideCompleted && checklist.items.length > 0
                ? 'All items completed! 🎉'
                : 'No items yet — add one below.'}
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

          {/* The fast path, always available — including on an empty list, which
              before this had no way to take a first item at all: the inline
              Enter-to-insert flow needs an existing row to hang off. */}
          <div className="mt-3 border-t border-gray-200/70 pt-3">
            {/* No showHint here: the legend needs the quick add bar's 42rem to
                stay on one line, and wrapped across five lines inside a 384px
                card it reads as clutter. The chips still teach the syntax the
                moment a token is typed. */}
            <QuickAddInput onAdd={handleQuickAdd} placeholder="Add a task…" />
          </div>
          </>
        )}
      </div>
    </div>
  );
};
