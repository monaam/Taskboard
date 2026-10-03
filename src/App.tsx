import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useChecklistStore } from './store/checklistStore';
import { useTextNoteStore } from './store/textNoteStore';
import { Canvas } from './components/Canvas';
import { QuickAddBar } from './components/QuickAddBar';
import { GuideOverlay } from './components/GuideOverlay';
import { ItemDetailPanel } from './components/ItemDetailPanel';
import { PriorityView } from './components/PriorityView';
import { ScheduleView } from './components/ScheduleView';
import { Auth } from './components/Auth';
import { UndoToast } from './components/UndoToast';
import { useGuideStore, useQuickAddStore, useViewStore } from './store/uiStore';

function AppContent() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const { loadChecklists, isLoaded: checklistsLoaded } = useChecklistStore();
  const { loadTextNotes, isLoaded: textNotesLoaded } = useTextNoteStore();
  const view = useViewStore((s) => s.view);
  const setView = useViewStore((s) => s.setView);
  const checklists = useChecklistStore((s) => s.checklists);
  const isQuickAddOpen = useQuickAddStore((s) => s.isOpen);
  const openQuickAdd = useQuickAddStore((s) => s.openQuickAdd);
  const isGuideOpen = useGuideStore((s) => s.isOpen);
  const openGuide = useGuideStore((s) => s.openGuide);

  useEffect(() => {
    if (user) {
      loadChecklists();
      loadTextNotes();
    }
  }, [user, loadChecklists, loadTextNotes]);

  // N opens quick add and ? opens the guide, from anywhere. On window rather
  // than a container so they work over the canvas, both list views and the FAB
  // alike — and so there is a way to create a task without the mouse.
  useEffect(() => {
    if (!user) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const isNew = e.key === 'n' || e.key === 'N';
      // '?' is Shift+/ on most layouts, so the Shift guard that protects the
      // letter keys cannot apply to it — e.key is already the resolved char.
      const isHelp = e.key === '?';
      if (!isNew && !isHelp) return;
      // Leaves browser and OS chords (Cmd+N, Ctrl+N) alone.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      // Never steal the key from anywhere text is being entered, the quick add
      // input included.
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return;
      e.preventDefault();
      if (isHelp) {
        openGuide();
        return;
      }
      // Read through getState rather than subscribing: the guard must not make
      // this listener re-register on every checklist change.
      if (useChecklistStore.getState().checklists.length === 0) return;
      openQuickAdd();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user, openQuickAdd, openGuide]);

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

        {/* Outside the view switcher's `hidden sm:flex` group: the guide is the
            one control a first-time user on a phone needs most. */}
        <button
          type="button"
          onClick={openGuide}
          title="How to use this app (?)"
          aria-label="How to use this app"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-gray-500 shadow transition-colors hover:text-gray-800 sm:h-8 sm:w-8"
        >
          ?
        </button>
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
        onClick={openQuickAdd}
        disabled={checklists.length === 0}
        title={checklists.length === 0 ? 'Create a checklist first' : 'New task (N)'}
        aria-label="New task"
        className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center transition-colors hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {isQuickAddOpen && <QuickAddBar />}

      {isGuideOpen && <GuideOverlay />}

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
