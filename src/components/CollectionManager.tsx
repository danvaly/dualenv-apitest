import { useState, useRef } from 'react';
import ContextMenu from './ContextMenu';
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
  const [showMenu, setShowMenu] = useState<{ x: number; y: number } | null>(null);
  const menuTrigger = useRef<HTMLElement | null>(null);
  const closeMenu = () => { setShowMenu(null); menuTrigger.current?.focus(); };

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
      <div className="px-3 py-2" onContextMenu={event => {
        if ((event.target as HTMLElement).closest('input')) return;
        event.preventDefault();
        menuTrigger.current = event.currentTarget.querySelector('select');
        setShowMenu({ x: event.clientX, y: event.clientY });
      }} onKeyDown={event => {
        if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
          event.preventDefault();
          menuTrigger.current = event.target as HTMLElement;
          const rect = event.currentTarget.getBoundingClientRect();
          setShowMenu({ x: rect.left, y: rect.bottom });
        }
      }}>
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
              aria-haspopup="menu"
              aria-expanded={!!showMenu}
              onClick={event => {
                menuTrigger.current = event.currentTarget;
                const rect = event.currentTarget.getBoundingClientRect();
                setShowMenu(showMenu ? null : { x: rect.left, y: rect.bottom });
              }}
              className="p-1.5 rounded hover:bg-dark-bg-tertiary transition-colors"
              title="Collection options"
            >
              <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {showMenu && <ContextMenu {...showMenu} label={activeCollection?.name || 'Collections'} onClose={closeMenu}
              actions={[
                { label: 'New collection', onSelect: () => { setEditingId(null); setShowNewForm(true); } },
                ...(activeCollection ? [
                  { label: 'Rename collection', onSelect: () => { setShowNewForm(false); startEditing(activeCollection); } },
                  { label: 'Duplicate collection', onSelect: () => onDuplicateCollection(activeCollection.id) },
                  { label: 'Delete collection', destructive: true, disabled: collections.length <= 1, onSelect: () => {
                    if (confirm(`Delete "${activeCollection.name}"? This will remove all folders and requests in this collection.`)) onDeleteCollection(activeCollection.id);
                  } },
                ] : []),
              ]} />}

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


    </div>
  );
}
