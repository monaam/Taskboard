import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useChecklistStore } from './store/checklistStore';
import { useTextNoteStore } from './store/textNoteStore';
import { Canvas } from './components/Canvas';
import { ItemDetailPanel } from './components/ItemDetailPanel';
import { PriorityView } from './components/PriorityView';
import { Auth } from './components/Auth';
import { useViewStore } from './store/uiStore';

function AppContent() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const { loadChecklists, isLoaded: checklistsLoaded } = useChecklistStore();
  const { loadTextNotes, isLoaded: textNotesLoaded } = useTextNoteStore();
  const view = useViewStore((s) => s.view);
  const setView = useViewStore((s) => s.setView);

  useEffect(() => {
    if (user) {
      loadChecklists();
      loadTextNotes();
    }
  }, [user, loadChecklists, loadTextNotes]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-200 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const isLoading = !checklistsLoaded || !textNotesLoaded;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-200 flex items-center justify-center">
        <div className="text-gray-600">Loading your data...</div>
      </div>
    );
  }

  // Invariant: never add transform / filter / contain to the wrapper below. Any
  // of them makes it the containing block for `position: fixed` descendants and
  // breaks ItemDetailPanel's positioning.
  return (
    <div className="min-h-screen bg-gray-100">
      {/* User menu - responsive positioning */}
      <div className="fixed top-2 left-2 sm:top-4 sm:left-4 z-50 flex items-center gap-1 sm:gap-2">
        <span className="text-xs sm:text-sm text-gray-600 bg-white px-2 sm:px-3 py-1 rounded-lg shadow truncate max-w-[100px] sm:max-w-none">
          {user.username}
        </span>
        <button
          onClick={logout}
          className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 bg-white px-2 sm:px-3 py-1 rounded-lg shadow hover:shadow-md transition-shadow"
        >
          Logout
        </button>

        {/* Lives in this cluster rather than inside either view, so it exists in
            both with no duplicated markup and no new z-index. Hidden below sm:
            the priority view is a desktop surface with no mobile layout. */}
        <div
          role="group"
          aria-label="View"
          className="hidden sm:flex items-center gap-0.5 bg-white rounded-lg shadow p-0.5"
        >
          <button
            type="button"
            onClick={() => setView('board')}
            aria-pressed={view === 'board'}
            className={`text-sm px-3 py-1 rounded-md transition-colors ${
              view === 'board' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Board
          </button>
          <button
            type="button"
            onClick={() => setView('priority')}
            aria-pressed={view === 'priority'}
            className={`text-sm px-3 py-1 rounded-md transition-colors ${
              view === 'priority' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Priority
          </button>
        </div>
      </div>

      {/* Branching here, not inside Canvas: its root is overflow-hidden +
          touch-none, which is exactly wrong for a long scrolling page.
          Unmounting Canvas loses nothing — zoom and pan are re-read from
          localStorage in the useState initializers on remount. */}
      {view === 'board' ? <Canvas /> : <PriorityView />}

      {/* Sibling of Canvas, never inside it — .canvas-content is transformed. */}
      <ItemDetailPanel />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
