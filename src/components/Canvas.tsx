import { useState, useRef, useEffect } from 'react';
import {
  DndContext,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { useChecklistStore } from '../store/checklistStore';
import { Checklist } from './Checklist';
import { ChecklistItem as ChecklistItemType } from '../types';

export const Canvas = () => {
  const { checklists, reorderItems, moveItemBetweenChecklists } = useChecklistStore();
  const [activeItem, setActiveItem] = useState<{ item: ChecklistItemType; checklistId: string } | null>(null);
  const [overChecklistId, setOverChecklistId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // DnD sensors for item dragging
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Handle wheel event for zooming (must use useEffect to set passive: false)
  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;

    const handleWheel = (e: WheelEvent) => {
      // Zoom with Ctrl/Cmd + Scroll
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.001;
        setZoom((prev) => Math.min(Math.max(0.1, prev + delta), 3));
      }
    };

    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, []);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const activeId = String(event.active.id);
    const [checklistId, itemId] = activeId.split('::');

    const checklist = checklists.find((c) => c.id === checklistId);
    const item = checklist?.items.find((i) => i.id === itemId);

    if (item && checklist) {
      setActiveItem({ item, checklistId });
    }
  };

  // Handle drag over - track which checklist we're hovering over
  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;

    if (!over) {
      setOverChecklistId(null);
      return;
    }

    const overId = String(over.id);

    // Check if over a droppable area
    if (overId.startsWith('droppable-')) {
      setOverChecklistId(overId.replace('droppable-', ''));
    } else if (overId.includes('::')) {
      // Over a sortable item - extract checklist ID
      const [checklistId] = overId.split('::');
      setOverChecklistId(checklistId);
    }
  };

  // Handle drag end for items
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    const currentOverChecklistId = overChecklistId;
    setActiveItem(null);
    setOverChecklistId(null);

    console.log('DragEnd - active:', active.id, 'over:', over?.id, 'overChecklistId:', currentOverChecklistId);

    if (!active) return;

    const activeId = String(active.id);
    const [activeChecklistId, activeItemId] = activeId.split('::');

    // If we have a tracked checklist and it's different from source, move there
    if (currentOverChecklistId && currentOverChecklistId !== activeChecklistId) {
      const targetChecklist = checklists.find((c) => c.id === currentOverChecklistId);
      if (targetChecklist) {
        // If over a specific item, get its index
        let insertIndex = targetChecklist.items.filter(i => !i.completed).length;

        if (over) {
          const overId = String(over.id);
          if (!overId.startsWith('droppable-') && overId.includes('::')) {
            const [, overItemId] = overId.split('::');
            const overItemIndex = targetChecklist.items.findIndex((i) => i.id === overItemId);
            if (overItemIndex !== -1 && !targetChecklist.items[overItemIndex].completed) {
              insertIndex = overItemIndex;
            }
          }
        }

        console.log('Moving item to checklist:', currentOverChecklistId, 'at index:', insertIndex);
        moveItemBetweenChecklists(activeChecklistId, currentOverChecklistId, activeItemId, insertIndex);
        return;
      }
    }

    // Same checklist reordering
    if (over && active.id !== over.id) {
      const overId = String(over.id);

      if (!overId.startsWith('droppable-') && overId.includes('::')) {
        const [targetChecklistId, overItemId] = overId.split('::');

        if (activeChecklistId === targetChecklistId) {
          const sourceChecklist = checklists.find((c) => c.id === activeChecklistId);
          if (sourceChecklist) {
            const oldIndex = sourceChecklist.items.findIndex((i) => i.id === activeItemId);
            const newIndex = sourceChecklist.items.findIndex((i) => i.id === overItemId);

            if (oldIndex !== -1 && newIndex !== -1) {
              const activeItem = sourceChecklist.items[oldIndex];
              const overItem = sourceChecklist.items[newIndex];

              if (!activeItem.completed && !overItem.completed) {
                reorderItems(activeChecklistId, oldIndex, newIndex);
              }
            }
          }
        }
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking on the canvas background or grid, not on checklists
    const target = e.target as HTMLElement;
    const isCanvasArea = target.classList.contains('canvas-background') ||
                         target.classList.contains('canvas-grid') ||
                         target.classList.contains('canvas-content');

    if (isCanvasArea) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const zoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 3));
  };

  const zoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0.1));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-200">
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 bg-white rounded-lg shadow-lg p-2">
        <button
          onClick={zoomIn}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Zoom In (Ctrl + Scroll)"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
          </svg>
        </button>
        <button
          onClick={zoomOut}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Zoom Out (Ctrl + Scroll)"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
          </svg>
        </button>
        <button
          onClick={resetView}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Reset View"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <div className="text-center text-xs text-gray-600 py-1">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="canvas-background w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: isPanning ? 'grabbing' : 'grab',
        }}
      >
        {/* Canvas Content */}
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div
            className="canvas-content"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              width: '4000px',
              height: '3000px',
              position: 'relative',
            }}
          >
            {/* Plain background */}
            <div className="canvas-grid absolute inset-0 bg-gray-200" />

            {/* Render all checklists */}
            {checklists.map((checklist) => (
              <div
                key={checklist.id}
                style={{
                  position: 'absolute',
                  left: `${checklist.x}px`,
                  top: `${checklist.y}px`,
                }}
              >
                <Checklist checklistId={checklist.id} zoom={zoom} pan={pan} />
              </div>
            ))}
          </div>

          {/* Drag Overlay - shows the item being dragged */}
          <DragOverlay>
            {activeItem ? (
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-blue-500 shadow-xl opacity-90">
                <span className="text-gray-800">{activeItem.item.text}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
};
