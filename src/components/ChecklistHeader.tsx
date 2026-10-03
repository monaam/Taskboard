import { useState } from 'react';
import { useChecklistStore } from '../store/checklistStore';
import { ChecklistColor, CHECKLIST_COLORS } from '../types';

interface ChecklistHeaderProps {
  checklistId: string;
  hideCompleted: boolean;
  setHideCompleted: (value: boolean) => void;
  listViewDragHandle?: any;
  listViewMode?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const COLOR_OPTIONS: { color: ChecklistColor; dot: string }[] = [
  { color: 'default', dot: 'bg-white border border-gray-300' },
  { color: 'red', dot: 'bg-red-400' },
  { color: 'orange', dot: 'bg-orange-400' },
  { color: 'yellow', dot: 'bg-yellow-400' },
  { color: 'green', dot: 'bg-green-400' },
  { color: 'teal', dot: 'bg-teal-400' },
  { color: 'blue', dot: 'bg-blue-400' },
  { color: 'purple', dot: 'bg-purple-400' },
  { color: 'pink', dot: 'bg-pink-400' },
  { color: 'brown', dot: 'bg-amber-600' },
  { color: 'gray', dot: 'bg-gray-400' },
];

export const ChecklistHeader = ({
  checklistId,
  hideCompleted,
  setHideCompleted,
  listViewDragHandle,
  listViewMode = false,
  isFirst = false,
  isLast = false,
  onMoveUp,
  onMoveDown,
  isCollapsed = false,
  onToggleCollapse
}: ChecklistHeaderProps) => {
  const { checklists, updateChecklistTitle, updateChecklistColor, deleteChecklist, deleteAllCompleted, selectAll, deselectAll, shareChecklist, removeMember, leaveChecklist } = useChecklistStore();
  const checklist = checklists.find((c) => c.id === checklistId);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(checklist?.title || '');
  const [showMenu, setShowMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareName, setShareName] = useState('');
  const [shareError, setShareError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const hasCompletedItems = checklist?.items.some(item => item.status === 'done') || false;
  const hasItems = (checklist?.items.length || 0) > 0;

  if (!checklist) return null;

  const colorStyles = CHECKLIST_COLORS[checklist.color || 'default'];
  // A member may edit the items but not the list: no renaming, recolouring or
  // deleting. The server enforces all three; this only stops offering them.
  const isOwner = checklist.isOwner;

  const submitShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (shareName.trim() === '' || isSharing) return;
    setIsSharing(true);
    const message = await shareChecklist(checklistId, shareName.trim());
    setShareError(message);
    if (!message) setShareName('');
    setIsSharing(false);
  };

  const handleSave = () => {
    if (!isOwner) {
      setIsEditing(false);
      return;
    }
    if (editTitle.trim()) {
      updateChecklistTitle(checklistId, editTitle.trim());
    } else {
      setEditTitle(checklist.title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditTitle(checklist.title);
      setIsEditing(false);
    }
  };

  return (
    <div className="mb-6">
      {/* Drag Handle */}
      <div
        {...(listViewDragHandle || {})}
        className={`checklist-header flex justify-center py-2 -mx-6 -mt-6 mb-4 ${colorStyles.header} rounded-t-xl cursor-grab active:cursor-grabbing select-none hover:opacity-80 transition-opacity`}
      >
        <svg className="w-6 h-4 text-gray-500" viewBox="0 0 24 12" fill="currentColor">
          <circle cx="4" cy="3" r="1.5" />
          <circle cx="12" cy="3" r="1.5" />
          <circle cx="20" cy="3" r="1.5" />
          <circle cx="4" cy="9" r="1.5" />
          <circle cx="12" cy="9" r="1.5" />
          <circle cx="20" cy="9" r="1.5" />
        </svg>
      </div>

      <div className="flex items-center justify-between mb-2">
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="flex-1 text-2xl font-bold text-gray-800 border-b-2 border-blue-500 focus:outline-none bg-transparent"
            autoFocus
          />
        ) : (
          <div
            className="flex items-center gap-2 flex-1 cursor-pointer"
            onClick={() => (listViewMode ? onToggleCollapse?.() : isOwner && setIsEditing(true))}
            onDoubleClick={() => listViewMode && isOwner && setIsEditing(true)}
          >
            {listViewMode && (
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            <h1 className={`text-2xl font-bold text-gray-800 transition-colors ${isOwner ? 'hover:text-blue-600' : ''}`}>
              {checklist.title}
            </h1>
            {/* What stops a shared list from looking like your own -- and
                explains why renaming and deleting are missing from its menu. */}
            {!isOwner && (
              <span
                title={`Shared with you by ${checklist.owner.username}`}
                className="shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600"
              >
                from {checklist.owner.username}
              </span>
            )}
            {isOwner && checklist.members.length > 0 && (
              <span
                title={`Shared with ${checklist.members.map((m) => m.username).join(', ')}`}
                className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700"
              >
                shared · {checklist.members.length}
              </span>
            )}
          </div>
        )}

        {/* Up/Down buttons for list view */}
        {listViewMode && (
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp?.();
              }}
              disabled={isFirst}
              className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-30 disabled:hover:text-gray-600 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              title="Move up"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown?.();
              }}
              disabled={isLast}
              className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-30 disabled:hover:text-gray-600 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              title="Move down"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        )}

        {/* Three dots menu - hidden when collapsed in list view */}
        {(!listViewMode || !isCollapsed) && (
          <div className="relative ml-2">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => {
                  setShowMenu(false);
                  setShowColorPicker(false);
                  setShowShare(false);
                }}
              />
              <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[180px]">
                {/* Color picker toggle */}
                {isOwner && (
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg flex items-center justify-between"
                >
                  <span>Color</span>
                  <div className={`w-4 h-4 rounded-full ${COLOR_OPTIONS.find(c => c.color === checklist.color)?.dot || COLOR_OPTIONS[0].dot}`} />
                </button>
                )}

                {/* Color picker palette */}
                {isOwner && showColorPicker && (
                  <div className="px-3 py-2 border-t border-gray-100">
                    <div className="flex flex-wrap gap-2">
                      {COLOR_OPTIONS.map(({ color, dot }) => (
                        <button
                          key={color}
                          onClick={() => {
                            updateChecklistColor(checklistId, color);
                            setShowColorPicker(false);
                          }}
                          className={`w-6 h-6 rounded-full ${dot} hover:scale-110 transition-transform ${
                            checklist.color === color ? 'ring-2 ring-offset-1 ring-blue-500' : ''
                          }`}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    setHideCompleted(!hideCompleted);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  {hideCompleted ? 'Show Completed' : 'Hide Completed'}
                </button>
                <button
                  onClick={() => {
                    selectAll(checklistId);
                    setShowMenu(false);
                  }}
                  disabled={!hasItems}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400 disabled:hover:bg-white"
                >
                  Select All
                </button>
                <button
                  onClick={() => {
                    deselectAll(checklistId);
                    setShowMenu(false);
                  }}
                  disabled={!hasCompletedItems}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400 disabled:hover:bg-white"
                >
                  Deselect All
                </button>
                <hr className="my-1" />
                <button
                  onClick={() => {
                    if (confirm('Delete all completed items?')) {
                      deleteAllCompleted(checklistId);
                    }
                    setShowMenu(false);
                  }}
                  disabled={!hasCompletedItems}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400 disabled:hover:bg-white"
                >
                  Delete Completed
                </button>
                {/* Sharing. Expands in place, the same way the colour picker
                    does, so the menu stays one surface. */}
                {isOwner && (
                  <>
                    <hr className="my-1" />
                    <button
                      onClick={() => setShowShare(!showShare)}
                      className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <span>Share</span>
                      <span className="text-xs text-gray-400">
                        {checklist.members.length > 0 ? checklist.members.length : ''}
                      </span>
                    </button>

                    {showShare && (
                      <div className="border-t border-gray-100 px-3 py-2">
                        <form onSubmit={submitShare} className="flex gap-1.5">
                          <input
                            value={shareName}
                            onChange={(e) => {
                              setShareName(e.target.value);
                              setShareError(null);
                            }}
                            placeholder="username"
                            aria-label="Share with username"
                            className="min-w-0 flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-800 outline-none focus:border-blue-400"
                          />
                          <button
                            type="submit"
                            disabled={shareName.trim() === '' || isSharing}
                            className="shrink-0 rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
                          >
                            Add
                          </button>
                        </form>

                        {shareError && (
                          <p className="mt-1.5 text-[11px] leading-snug text-red-600">{shareError}</p>
                        )}

                        <p className="mt-1.5 text-[11px] leading-snug text-gray-400">
                          Members can add, edit and tick items. Only you can rename, recolour or
                          delete this list.
                        </p>

                        {checklist.members.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {checklist.members.map((m) => (
                              <li key={m.id} className="flex items-center justify-between gap-2">
                                <span className="min-w-0 truncate text-xs text-gray-700">
                                  {m.username}
                                </span>
                                <button
                                  onClick={() => removeMember(checklistId, m.id)}
                                  className="shrink-0 rounded px-1.5 py-0.5 text-[11px] text-red-600 hover:bg-red-50"
                                >
                                  Remove
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </>
                )}

                <hr className="my-1" />

                {/* Deleting the list is the owner's. A member leaves instead --
                    without this they would be stuck with it for good. */}
                {isOwner ? (
                  <button
                    onClick={() => {
                      if (confirm('Delete this checklist?')) {
                        deleteChecklist(checklistId);
                      }
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                  >
                    Delete Checklist
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (confirm(`Leave "${checklist.title}"? You can be added back by ${checklist.owner.username}.`)) {
                        leaveChecklist(checklistId);
                      }
                      setShowMenu(false);
                    }}
                    className="w-full rounded-b-lg px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    Leave list
                  </button>
                )}
              </div>
            </>
          )}
          </div>
        )}
      </div>
      {/* Item count - hidden when collapsed in list view */}
      {(!listViewMode || !isCollapsed) && (
        <p className="text-sm text-gray-500">
          {checklist.items.length} items • {checklist.items.filter(item => item.status === 'done').length} completed
        </p>
      )}
    </div>
  );
};
