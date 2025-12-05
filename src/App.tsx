import { useState } from 'react';
import { useChecklistStore } from './store/checklistStore';
import { Canvas } from './components/Canvas';

function App() {
  const { checklists, createChecklist } = useChecklistStore();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');

  const handleCreateChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (newChecklistTitle.trim()) {
      createChecklist(newChecklistTitle.trim());
      setNewChecklistTitle('');
      setShowCreateDialog(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {checklists.length === 0 ? (
        // Welcome screen - create first checklist
        <div className="flex items-center justify-center min-h-screen p-6">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Task Manager Canvas</h1>
            <p className="text-gray-600 mb-6">
              Create your first checklist to get started. Place checklists anywhere on the canvas!
            </p>

            <form onSubmit={handleCreateChecklist}>
              <input
                type="text"
                value={newChecklistTitle}
                onChange={(e) => setNewChecklistTitle(e.target.value)}
                placeholder="Enter checklist title..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                autoFocus
              />
              <button
                type="submit"
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Create First Checklist
              </button>
            </form>
          </div>
        </div>
      ) : (
        <>
          {/* Canvas with all checklists */}
          <Canvas />

          {/* Floating Add Button */}
          <button
            onClick={() => setShowCreateDialog(true)}
            className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 transition-colors flex items-center justify-center z-50"
            title="Create new checklist"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          {/* Create Dialog */}
          {showCreateDialog && (
            <>
              <div
                className="fixed inset-0 bg-black bg-opacity-50 z-50"
                onClick={() => setShowCreateDialog(false)}
              />
              <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-xl shadow-2xl p-8 w-96">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">New Checklist</h2>
                <form onSubmit={handleCreateChecklist}>
                  <input
                    type="text"
                    value={newChecklistTitle}
                    onChange={(e) => setNewChecklistTitle(e.target.value)}
                    placeholder="Enter checklist title..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateDialog(false);
                        setNewChecklistTitle('');
                      }}
                      className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Create
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default App;
