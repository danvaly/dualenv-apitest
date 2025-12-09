import { useState } from 'react';
import type { RequestCollection } from '../types';

interface CollectionManagerProps {
  collections: RequestCollection[];
  activeCollectionId: string | null;
  onSelectCollection: (id: string) => void;
  onCreateCollection: (name: string) => void;
  onRenameCollection: (id: string, name: string) => void;
  onDeleteCollection: (id: string) => void;
  onDuplicateCollection: (id: string) => void;
}

export default function CollectionManager({
  collections,
  activeCollectionId,
  onSelectCollection,
  onCreateCollection,
  onRenameCollection,
  onDeleteCollection,
  onDuplicateCollection,
}: CollectionManagerProps) {
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showMenu, setShowMenu] = useState<string | null>(null);

  const handleCreate = () => {
    if (newName.trim()) {
      onCreateCollection(newName.trim());
      setNewName('');
      setShowNewForm(false);
    }
  };

  const handleRename = (id: string) => {
    if (editingName.trim()) {
      onRenameCollection(id, editingName.trim());
      setEditingId(null);
      setEditingName('');
    }
  };

  const startEditing = (collection: RequestCollection) => {
    setEditingId(collection.id);
    setEditingName(collection.name);
    setShowMenu(null);
  };

  const activeCollection = collections.find(c => c.id === activeCollectionId);

  return (
    <div className="border-b border-dark-border">
      {/* Collection Selector Dropdown */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <select
              value={activeCollectionId || ''}
              onChange={(e) => onSelectCollection(e.target.value)}
              className="input w-full text-xs pr-8 font-medium"
            >
              {collections.map(collection => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
          </div>

          {/* Collection Actions */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(showMenu ? null : 'main')}
              className="p-1.5 rounded hover:bg-dark-bg-tertiary transition-colors"
              title="Collection options"
            >
              <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {showMenu === 'main' && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-dark-bg-secondary border border-dark-border rounded shadow-lg z-20 py-1">
                <button
                  onClick={() => {
                    setShowNewForm(true);
                    setShowMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-dark-bg-tertiary flex items-center gap-2"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Collection
                </button>
                {activeCollection && (
                  <>
                    <button
                      onClick={() => startEditing(activeCollection)}
                      className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-dark-bg-tertiary flex items-center gap-2"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Rename
                    </button>
                    <button
                      onClick={() => {
                        onDuplicateCollection(activeCollectionId!);
                        setShowMenu(null);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-dark-bg-tertiary flex items-center gap-2"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Duplicate
                    </button>
                    {collections.length > 1 && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${activeCollection.name}"? This will remove all folders and requests in this collection.`)) {
                            onDeleteCollection(activeCollectionId!);
                          }
                          setShowMenu(null);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-accent-error hover:bg-dark-bg-tertiary flex items-center gap-2"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Collection Stats */}
        {activeCollection && (
          <div className="flex items-center gap-3 mt-1.5 text-xs text-text-muted">
            <span>{activeCollection.folders.length} folders</span>
            <span>{activeCollection.requests.length} requests</span>
          </div>
        )}
      </div>

      {/* New Collection Form */}
      {showNewForm && (
        <div className="px-3 pb-2">
          <div className="flex gap-1.5">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') {
                  setShowNewForm(false);
                  setNewName('');
                }
              }}
              placeholder="Collection name"
              className="input flex-1 text-xs"
              autoFocus
            />
            <button
              onClick={handleCreate}
              className="btn-primary text-xs px-2"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowNewForm(false);
                setNewName('');
              }}
              className="btn text-xs px-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rename Form */}
      {editingId && (
        <div className="px-3 pb-2">
          <div className="flex gap-1.5">
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename(editingId);
                if (e.key === 'Escape') {
                  setEditingId(null);
                  setEditingName('');
                }
              }}
              placeholder="Collection name"
              className="input flex-1 text-xs"
              autoFocus
            />
            <button
              onClick={() => handleRename(editingId)}
              className="btn-primary text-xs px-2"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditingId(null);
                setEditingName('');
              }}
              className="btn text-xs px-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowMenu(null)}
        />
      )}
    </div>
  );
}
