import { useState, useRef, useEffect, useCallback } from 'react';
import { useTextNoteStore } from '../store/textNoteStore';
import { ChecklistColor, CHECKLIST_COLORS } from '../types';

interface TextNoteProps {
  noteId: string;
  zoom: number;
  pan: { x: number; y: number };
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

export const TextNote = ({ noteId, zoom, pan }: TextNoteProps) => {
  const { textNotes, updateTextNoteText, updateTextNotePosition, updateTextNoteFontSize, updateTextNoteColor, deleteTextNote } = useTextNoteStore();
  const note = textNotes.find((n) => n.id === noteId);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(note?.text || '');
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ fontSize: 24, y: 0 });
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Handle mouse move for dragging
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!note) return;
    const newX = (e.clientX - pan.x) / zoom - dragStartRef.current.x;
    const newY = (e.clientY - pan.y) / zoom - dragStartRef.current.y;
    updateTextNotePosition(noteId, newX, newY);
  }, [noteId, note, updateTextNotePosition, zoom, pan]);

  // Handle mouse move for resizing
  const handleResizeMove = useCallback((e: MouseEvent) => {
    const deltaY = (e.clientY - resizeStartRef.current.y) / zoom;
    const newFontSize = resizeStartRef.current.fontSize + deltaY * 0.5;
    updateTextNoteFontSize(noteId, newFontSize);
  }, [noteId, updateTextNoteFontSize, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
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

  // Add/remove window event listeners when resizing
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleResizeMove, handleMouseUp]);

  const handleDragStart = (e: React.MouseEvent) => {
    if (isEditing) return;
    e.preventDefault();
    dragStartRef.current = {
      x: (e.clientX - pan.x) / zoom - (note?.x || 0),
      y: (e.clientY - pan.y) / zoom - (note?.y || 0),
    };
    setIsDragging(true);
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeStartRef.current = {
      fontSize: note?.fontSize || 24,
      y: e.clientY,
    };
    setIsResizing(true);
  };

  const handleSave = () => {
    if (editText.trim()) {
      updateTextNoteText(noteId, editText.trim());
    } else {
      // Delete if empty
      deleteTextNote(noteId);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditText(note?.text || '');
      setIsEditing(false);
    }
  };

  if (!note) return null;

  const colorStyles = CHECKLIST_COLORS[note.color || 'default'];

  return (
    <div
      className="group relative"
      onMouseDown={handleDragStart}
      style={{
        cursor: isDragging ? 'grabbing' : isEditing ? 'text' : 'grab',
      }}
    >
      {/* Text content */}
      {isEditing ? (
        <textarea
          ref={inputRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={`min-w-[100px] p-2 rounded-lg border-2 border-blue-500 focus:outline-none resize-none ${colorStyles.bg}`}
          style={{
            fontSize: `${note.fontSize}px`,
            lineHeight: 1.2,
          }}
          rows={1}
        />
      ) : (
        <div
          onClick={() => setIsEditing(true)}
          className={`p-2 rounded-lg select-none whitespace-pre-wrap ${colorStyles.bg} ${note.color !== 'default' ? 'shadow-sm' : ''}`}
          style={{
            fontSize: `${note.fontSize}px`,
            lineHeight: 1.2,
          }}
        >
          {note.text || 'Click to edit...'}
        </div>
      )}

      {/* Controls - show on hover */}
      <div className="absolute -top-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        {/* Menu button */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 bg-white rounded shadow text-gray-500 hover:text-gray-700"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[120px]">
                {/* Color picker */}
                <div className="px-3 py-2 border-b border-gray-100">
                  <div className="flex flex-wrap gap-1">
                    {COLOR_OPTIONS.map(({ color, dot }) => (
                      <button
                        key={color}
                        onClick={() => {
                          updateTextNoteColor(noteId, color);
                          setShowMenu(false);
                        }}
                        className={`w-5 h-5 rounded-full ${dot} hover:scale-110 transition-transform ${
                          note.color === color ? 'ring-2 ring-offset-1 ring-blue-500' : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => {
                    deleteTextNote(noteId);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Resize handle - bottom right corner */}
      <div
        onMouseDown={handleResizeStart}
        className="absolute -bottom-2 -right-2 w-4 h-4 opacity-0 group-hover:opacity-100 cursor-ns-resize transition-opacity"
        title="Drag to resize"
      >
        <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z" />
        </svg>
      </div>
    </div>
  );
};
