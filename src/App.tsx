import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useChecklistStore } from './store/checklistStore';
import { useTextNoteStore } from './store/textNoteStore';
import { Canvas } from './components/Canvas';
import { ItemDetailPanel } from './components/ItemDetailPanel';
import { Auth } from './components/Auth';

function AppContent() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const { loadChecklists, isLoaded: checklistsLoaded } = useChecklistStore();
  const { loadTextNotes, isLoaded: textNotesLoaded } = useTextNoteStore();

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
      </div>

      {/* Canvas */}
      <Canvas />

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
