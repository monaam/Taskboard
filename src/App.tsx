import { useState } from 'react';
import { useChecklistStore } from './store/checklistStore';
import { Checklist } from './components/Checklist';

function App() {
  const { checklist, createChecklist } = useChecklistStore();
  const [newChecklistTitle, setNewChecklistTitle] = useState('');

  const handleCreateChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (newChecklistTitle.trim()) {
      createChecklist(newChecklistTitle.trim());
      setNewChecklistTitle('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {!checklist ? (
        // Welcome screen - create first checklist
        <div className="flex items-center justify-center min-h-screen p-6">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Task Manager</h1>
            <p className="text-gray-600 mb-6">Create your first checklist to get started</p>

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
                Create Checklist
              </button>
            </form>
          </div>
        </div>
      ) : (
        // Main checklist view
        <Checklist />
      )}
    </div>
  );
}

export default App;
