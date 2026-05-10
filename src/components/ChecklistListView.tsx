import { useState } from 'react';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  pointerWithin,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useChecklistStore } from '../store/checklistStore';
import { Checklist } from './Checklist';
import { Checklist as ChecklistType, ChecklistItem as ChecklistItemType } from '../types';

interface SortableChecklistWrapperProps {
  checklist: ChecklistType;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const SortableChecklistWrapper = ({
  checklist,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown
}: SortableChecklistWrapperProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: checklist.id,
    data: { type: 'checklist' }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-4">
      <Checklist
        checklist={checklist}
        listViewMode={true}
        dragHandleProps={{ ...attributes, ...listeners }}
        isFirst={isFirst}
        isLast={isLast}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />
    </div>
  );
};

export const ChecklistListView = () => {
  const { checklists, reorderChecklists, reorderItems, moveItemBetweenChecklists } = useChecklistStore();
  const [activeItem, setActiveItem] = useState<{ item: ChecklistItemType; checklistId: string } | null>(null);
  const [overChecklistId, setOverChecklistId] = useState<string | null>(null);

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
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const activeId = String(event.active.id);

    // Check if dragging an item (format: checklistId::itemId)
    if (activeId.includes('::')) {
      const [checklistId, itemId] = activeId.split('::');
      const checklist = checklists.find((c) => c.id === checklistId);
      const item = checklist?.items.find((i) => i.id === itemId);

      if (item && checklist) {
        setActiveItem({ item, checklistId });
      }
    }
    // Otherwise it's a checklist being dragged (no special handling needed for now)
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) {
      setOverChecklistId(null);
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    // Only track for item dragging (not checklist dragging)
    if (activeId.includes('::')) {
      // Check if over a droppable area
      if (overId.startsWith('droppable-')) {
        setOverChecklistId(overId.replace('droppable-', ''));
      } else if (overId.includes('::')) {
        // Over a sortable item - extract checklist ID
        const [checklistId] = overId.split('::');
        setOverChecklistId(checklistId);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = String(active.id);

    // Handle item dragging
    if (activeId.includes('::')) {
      const currentOverChecklistId = overChecklistId;
      setActiveItem(null);
      setOverChecklistId(null);

      if (!active) return;

      const [activeChecklistId, activeItemId] = activeId.split('::');

      // If we have a tracked checklist and it's different from source, move there
      if (currentOverChecklistId && currentOverChecklistId !== activeChecklistId) {
        const targetChecklist = checklists.find((c) => c.id === currentOverChecklistId);
        if (targetChecklist) {
          // Determine target index
          let targetIndex = targetChecklist.items.length;

          if (over) {
            const overId = String(over.id);
            if (overId.includes('::')) {
              const [, overItemId] = overId.split('::');
              const overIndex = targetChecklist.items.findIndex((i) => i.id === overItemId);
              if (overIndex !== -1) {
                targetIndex = overIndex;
              }
            }
          }

          moveItemBetweenChecklists(activeChecklistId, currentOverChecklistId, activeItemId, targetIndex);
        }
      } else if (over) {
        // Reorder within same checklist
        const overId = String(over.id);
        if (overId.includes('::') && overId !== activeId) {
          const [overChecklistId, overItemId] = overId.split('::');
          if (overChecklistId === activeChecklistId) {
            const checklist = checklists.find((c) => c.id === activeChecklistId);
            if (checklist) {
              const oldIndex = checklist.items.findIndex((i) => i.id === activeItemId);
              const newIndex = checklist.items.findIndex((i) => i.id === overItemId);
              if (oldIndex !== -1 && newIndex !== -1) {
                reorderItems(activeChecklistId, oldIndex, newIndex);
              }
            }
          }
        }
      }
    } else {
      // Handle checklist reordering
      if (!over || active.id === over.id) {
        return;
      }

      const oldIndex = checklists.findIndex((c) => c.id === active.id);
      const newIndex = checklists.findIndex((c) => c.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        reorderChecklists(oldIndex, newIndex);
      }
    }
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      reorderChecklists(index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < checklists.length - 1) {
      reorderChecklists(index, index + 1);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full h-full overflow-y-auto px-4 py-6">
        <SortableContext
          items={checklists.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {checklists.map((checklist, index) => (
            <SortableChecklistWrapper
              key={checklist.id}
              checklist={checklist}
              isFirst={index === 0}
              isLast={index === checklists.length - 1}
              onMoveUp={() => handleMoveUp(index)}
              onMoveDown={() => handleMoveDown(index)}
            />
          ))}
        </SortableContext>
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
  );
};
