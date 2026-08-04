import { useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useChecklistStore } from './store/checklistStore';
import { useTextNoteStore } from './store/textNoteStore';
import { Canvas } from './components/Canvas';
import { CreateItemPanel } from './components/CreateItemPanel';
import { ItemDetailPanel } from './components/ItemDetailPanel';
import { PriorityView } from './components/PriorityView';
import { ScheduleView } from './components/ScheduleView';
import { Auth } from './components/Auth';
import { UndoToast } from './components/UndoToast';
import { useCreateItemStore, useViewStore } from './store/uiStore';

function AppContent() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const { loadChecklists, isLoaded: checklistsLoaded } = useChecklistStore();
  const { loadTextNotes, isLoaded: textNotesLoaded } = useTextNoteStore();
  const view = useViewStore((s) => s.view);
  const setView = useViewStore((s) => s.setView);
  const checklists = useChecklistStore((s) => s.checklists);
  const isCreateOpen = useCreateItemStore((s) => s.isOpen);
  const openCreateItem = useCreateItemStore((s) => s.openCreateItem);
  const createFabRef = useRef<HTMLButtonElement>(null);

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
          <button
            type="button"
            onClick={() => setView('schedule')}
            aria-pressed={view === 'schedule'}
            className={`text-sm px-3 py-1 rounded-md transition-colors ${
              view === 'schedule' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Schedule
          </button>
        </div>
      </div>

      {/* Branching here, not inside Canvas: its root is overflow-hidden +
          touch-none, which is exactly wrong for a long scrolling page.
          Unmounting Canvas loses nothing — zoom and pan are re-read from
          localStorage in the useState initializers on remount. */}
      {/* One line per view rather than a nested ternary — at three branches the
          ternary chain stops being readable and every future view makes it
          worse. */}
      {view === 'board' && <Canvas />}
      {view === 'priority' && <PriorityView />}
      {view === 'schedule' && <ScheduleView />}

      {/* Sibling of Canvas, never inside it — .canvas-content is transformed. */}
      <ItemDetailPanel />

      {/* Same rule as the panels: outside Canvas, or `fixed` would resolve
          against the transformed .canvas-content.
          z-30, not z-50: Canvas's context menu uses a `fixed inset-0 z-40`
          dismiss catcher, and App renders after Canvas, so a z-50 FAB would
          paint over an open menu while sitting outside its catcher. */}
      <button
        type="button"
        ref={createFabRef}
        onClick={openCreateItem}
        disabled={checklists.length === 0}
        title={checklists.length === 0 ? 'Create a checklist first' : 'New task'}
        aria-label="New task"
        className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center transition-colors hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {isCreateOpen && <CreateItemPanel returnFocusRef={createFabRef} />}

      {/* Same rule as the FAB and the panels: outside Canvas, whose
          .canvas-content is transformed and would become the containing block
          for anything `fixed` inside it.
          Unconditional, and AppContent deliberately does not subscribe to
          useUndoStore — that would re-render the whole view tree twice per
          toast. The component owns its own subscription. */}
      <UndoToast />
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
