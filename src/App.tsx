import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useChecklistStore } from './store/checklistStore';
import { useTextNoteStore } from './store/textNoteStore';
import { Canvas } from './components/Canvas';
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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* User menu */}
      <div className="fixed top-4 left-4 z-50 flex items-center gap-2">
        <span className="text-sm text-gray-600 bg-white px-3 py-1 rounded-lg shadow">
          {user.username}
        </span>
        <button
          onClick={logout}
          className="text-sm text-gray-500 hover:text-gray-700 bg-white px-3 py-1 rounded-lg shadow hover:shadow-md transition-shadow"
        >
          Logout
        </button>
      </div>

      {/* Canvas */}
      <Canvas />
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
