import { useState, useRef, useEffect } from 'react';
import {
  DndContext,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { useChecklistStore } from '../store/checklistStore';
import { useTextNoteStore } from '../store/textNoteStore';
import { Checklist } from './Checklist';
import { TextNote } from './TextNote';
import { ChecklistItem as ChecklistItemType } from '../types';

export const Canvas = () => {
  const { checklists, createChecklist, reorderItems, moveItemBetweenChecklists } = useChecklistStore();
  const { textNotes, createTextNote } = useTextNoteStore();
  const [activeItem, setActiveItem] = useState<{ item: ChecklistItemType; checklistId: string } | null>(null);
  const [overChecklistId, setOverChecklistId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(() => {
    const saved = localStorage.getItem('taskManager_zoom');
    return saved ? parseFloat(saved) : 1;
  });
  const [pan, setPan] = useState(() => {
    const saved = localStorage.getItem('taskManager_pan');
    return saved ? JSON.parse(saved) : { x: 0, y: 0 };
  });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; canvasX: number; canvasY: number } | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const lastTouchDistance = useRef<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Persist zoom to localStorage
  useEffect(() => {
    localStorage.setItem('taskManager_zoom', zoom.toString());
  }, [zoom]);

  // Persist pan to localStorage
  useEffect(() => {
    localStorage.setItem('taskManager_pan', JSON.stringify(pan));
  }, [pan]);

  // DnD sensors for item dragging (including touch support)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
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

  // Touch handlers for mobile pan and pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    const isCanvasArea = target.classList.contains('canvas-background') ||
                         target.classList.contains('canvas-grid') ||
                         target.classList.contains('canvas-content');

    if (isCanvasArea) {
      if (e.touches.length === 1) {
        // Single touch - pan
        setIsPanning(true);
        setPanStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
      } else if (e.touches.length === 2) {
        // Two touches - prepare for pinch zoom
        const distance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        lastTouchDistance.current = distance;
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isPanning) {
      // Single touch pan
      setPan({
        x: e.touches[0].clientX - panStart.x,
        y: e.touches[0].clientY - panStart.y,
      });
    } else if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      // Pinch to zoom
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = (distance - lastTouchDistance.current) * 0.005;
      setZoom((prev) => Math.min(Math.max(0.3, prev + delta), 3));
      lastTouchDistance.current = distance;
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
    lastTouchDistance.current = null;
  };

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

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // Only show context menu on canvas background
    const target = e.target as HTMLElement;
    const isCanvasArea = target.classList.contains('canvas-background') ||
                         target.classList.contains('canvas-grid') ||
                         target.classList.contains('canvas-content');

    if (isCanvasArea) {
      // Calculate canvas position accounting for pan and zoom
      const canvasX = (e.clientX - pan.x) / zoom;
      const canvasY = (e.clientY - pan.y) / zoom;
      setContextMenu({ x: e.clientX, y: e.clientY, canvasX, canvasY });
    }
  };

  const handleCreateChecklist = () => {
    if (contextMenu) {
      createChecklist('New Checklist', contextMenu.canvasX, contextMenu.canvasY);
      setContextMenu(null);
    }
  };

  const handleCreateTextNote = () => {
    if (contextMenu) {
      createTextNote('Text', contextMenu.canvasX, contextMenu.canvasY);
      setContextMenu(null);
    }
  };

  // Mobile menu handlers - create at center of viewport
  const handleMobileCreateChecklist = () => {
    const canvasX = (-pan.x + window.innerWidth / 2) / zoom - 150; // Center horizontally
    const canvasY = (-pan.y + window.innerHeight / 2) / zoom - 100; // Center vertically
    createChecklist('New Checklist', canvasX, canvasY);
    setShowMobileMenu(false);
  };

  const handleMobileCreateTextNote = () => {
    const canvasX = (-pan.x + window.innerWidth / 2) / zoom;
    const canvasY = (-pan.y + window.innerHeight / 2) / zoom;
    createTextNote('Text', canvasX, canvasY);
    setShowMobileMenu(false);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-200 touch-none" onContextMenu={handleContextMenu}>
      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[160px] py-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={handleCreateChecklist}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              New Checklist
            </button>
            <button
              onClick={handleCreateTextNote}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              New Text
            </button>
          </div>
        </>
      )}

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="canvas-background w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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

            {/* Render all text notes */}
            {textNotes.map((note) => (
              <div
                key={note.id}
                style={{
                  position: 'absolute',
                  left: `${note.x}px`,
                  top: `${note.y}px`,
                }}
              >
                <TextNote noteId={note.id} zoom={zoom} pan={pan} />
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

      {/* Mobile Floating Action Button */}
      {isMobile && (
        <>
          {showMobileMenu && (
            <div
              className="fixed inset-0 z-40 bg-black/20"
              onClick={() => setShowMobileMenu(false)}
            />
          )}
          <div className="fixed bottom-6 right-6 z-50">
            {showMobileMenu && (
              <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden mb-2">
                <button
                  onClick={handleMobileCreateChecklist}
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 w-full"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  New Checklist
                </button>
                <button
                  onClick={handleMobileCreateTextNote}
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 w-full border-t border-gray-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  New Text
                </button>
              </div>
            )}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className={`w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center transition-transform ${
                showMobileMenu ? 'rotate-45' : ''
              }`}
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
