import React, { useState } from 'react';
import type { Folder, SavedRequest, ApiRequest, RequestCollection } from '../types';
import CollectionManager from './CollectionManager';
import Tooltip from './Tooltip';

interface SidebarProps {
  folders: Folder[];
  requests: SavedRequest[];
  currentRequestId: string | null;
  onSelectRequest: (request: ApiRequest, requestId: string) => void;
  onSaveRequest: (name: string, folderId: string | null) => void;
  onUpdateRequest: (requestId: string, name: string) => void;
  onDeleteRequest: (requestId: string) => void;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onToggleFolder: (folderId: string) => void;
  onSaveCurrentRequest: () => void;
  onMoveRequest?: (requestId: string, targetFolderId: string | null, targetIndex?: number) => void;
  onReorderRequests?: (requestIds: string[], folderId: string | null) => void;
  // Collection props
  collections: RequestCollection[];
  activeCollectionId: string | null;
  onSelectCollection: (id: string) => void;
  onCreateCollection: (name: string) => void;
  onRenameCollection: (id: string, name: string) => void;
  onDeleteCollection: (id: string) => void;
  onDuplicateCollection: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  folders,
  requests,
  currentRequestId,
  onSelectRequest,
  onSaveRequest,
  onUpdateRequest,
  onDeleteRequest,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onToggleFolder,
  onSaveCurrentRequest,
  onMoveRequest,
  onReorderRequests,
  collections,
  activeCollectionId,
  onSelectCollection,
  onCreateCollection,
  onRenameCollection,
  onDeleteCollection,
  onDuplicateCollection,
}) => {
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);

  const [isCreatingRequest, setIsCreatingRequest] = useState(false);
  const [newRequestName, setNewRequestName] = useState('');
  const [newRequestFolderId, setNewRequestFolderId] = useState<string | null>(null);

  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');

  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [editingRequestName, setEditingRequestName] = useState('');

  // Drag and drop state
  const [draggedRequestId, setDraggedRequestId] = useState<string | null>(null);
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null | 'root'>(null);
  const [dropTargetRequestId, setDropTargetRequestId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim(), newFolderParentId);
      setNewFolderName('');
      setNewFolderParentId(null);
      setIsCreatingFolder(false);
    }
  };

  const handleSaveRequest = () => {
    if (newRequestName.trim()) {
      onSaveRequest(newRequestName.trim(), newRequestFolderId);
      setNewRequestName('');
      setNewRequestFolderId(null);
      setIsCreatingRequest(false);
    }
  };

  const handleRenameFolder = (folderId: string) => {
    if (editingFolderName.trim()) {
      onRenameFolder(folderId, editingFolderName.trim());
      setEditingFolderId(null);
      setEditingFolderName('');
    }
  };

  const handleRenameRequest = (requestId: string) => {
    if (editingRequestName.trim()) {
      onUpdateRequest(requestId, editingRequestName.trim());
      setEditingRequestId(null);
      setEditingRequestName('');
    }
  };

  const startEditingFolder = (folder: Folder) => {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
  };

  const startEditingRequest = (request: SavedRequest) => {
    setEditingRequestId(request.id);
    setEditingRequestName(request.name);
  };

  const getMethodBadgeClass = (method: string) => {
    switch (method) {
      case 'GET':
        return 'method-get';
      case 'POST':
        return 'method-post';
      case 'PUT':
        return 'method-put';
      case 'PATCH':
        return 'method-patch';
      case 'DELETE':
        return 'method-delete';
      default:
        return 'bg-text-tertiary/15 text-text-tertiary';
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, requestId: string) => {
    setDraggedRequestId(requestId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', requestId);
  };

  const handleDragEnd = () => {
    setDraggedRequestId(null);
    setDropTargetFolderId(null);
    setDropTargetRequestId(null);
    setDropPosition(null);
  };

  const handleDragOverFolder = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedRequestId) {
      setDropTargetFolderId(folderId === null ? 'root' : folderId);
      setDropTargetRequestId(null);
      setDropPosition(null);
    }
  };

  const handleDragOverRequest = (e: React.DragEvent, requestId: string, folderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedRequestId && draggedRequestId !== requestId) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const position = e.clientY < midY ? 'before' : 'after';
      setDropTargetRequestId(requestId);
      setDropPosition(position);
      setDropTargetFolderId(folderId === null ? 'root' : folderId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the sidebar entirely
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDropTargetFolderId(null);
      setDropTargetRequestId(null);
      setDropPosition(null);
    }
  };

  const handleDropOnFolder = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedRequestId && onMoveRequest) {
      const draggedRequest = requests.find(r => r.id === draggedRequestId);
      if (draggedRequest && draggedRequest.folderId !== folderId) {
        onMoveRequest(draggedRequestId, folderId);
      }
    }
    handleDragEnd();
  };

  const handleDropOnRequest = (e: React.DragEvent, targetRequestId: string, folderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedRequestId && draggedRequestId !== targetRequestId && onReorderRequests) {
      const folderRequests = requests.filter(r => r.folderId === folderId);
      const draggedRequest = requests.find(r => r.id === draggedRequestId);

      if (draggedRequest) {
        // If moving from different folder, first move to target folder
        if (draggedRequest.folderId !== folderId && onMoveRequest) {
          onMoveRequest(draggedRequestId, folderId);
        }

        // Reorder within the folder
        const currentIds = folderRequests.map(r => r.id).filter(id => id !== draggedRequestId);
        const targetIndex = currentIds.indexOf(targetRequestId);
        const insertIndex = dropPosition === 'before' ? targetIndex : targetIndex + 1;
        currentIds.splice(insertIndex, 0, draggedRequestId);
        onReorderRequests(currentIds, folderId);
      }
    }
    handleDragEnd();
  };

  const renderFolder = (folder: Folder, depth: number = 0) => {
    const childFolders = folders.filter(f => f.parentId === folder.id);
    const folderRequests = requests.filter(r => r.folderId === folder.id);
    const isDropTarget = dropTargetFolderId === folder.id && !dropTargetRequestId;

    return (
      <div key={folder.id} style={{ marginLeft: `${depth * 10}px` }}>
        <div
          className={`flex items-center gap-1 py-1 px-1.5 hover:bg-dark-bg-tertiary rounded group transition-colors ${
            isDropTarget ? 'bg-accent-primary/20 ring-1 ring-accent-primary' : ''
          }`}
          onDragOver={(e) => handleDragOverFolder(e, folder.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDropOnFolder(e, folder.id)}
        >
          <Tooltip content={folder.isExpanded ? 'Collapse folder' : 'Expand folder'}>
            <button
              onClick={() => onToggleFolder(folder.id)}
              className="text-text-tertiary hover:text-accent-primary transition-colors"
            >
              <svg
                className={`w-2.5 h-2.5 transition-transform duration-200 ${folder.isExpanded ? 'rotate-90' : ''}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </Tooltip>

          {editingFolderId === folder.id ? (
            <input
              type="text"
              value={editingFolderName}
              onChange={(e) => setEditingFolderName(e.target.value)}
              onBlur={() => handleRenameFolder(folder.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameFolder(folder.id);
                if (e.key === 'Escape') {
                  setEditingFolderId(null);
                  setEditingFolderName('');
                }
              }}
              className="flex-1 input py-0.5 text-xs"
              autoFocus
            />
          ) : (
            <>
              <svg className="w-3 h-3 text-accent-primary" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              <span className="flex-1 text-xs font-medium text-text-primary truncate">
                {folder.name}
              </span>
              <div className="hidden group-hover:flex gap-0.5">
                <Tooltip content="Rename">
                  <button
                    onClick={() => startEditingFolder(folder)}
                    className="p-0.5 text-text-tertiary hover:text-accent-primary rounded transition-colors"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </Tooltip>
                <Tooltip content="Add subfolder">
                  <button
                    onClick={() => {
                      setIsCreatingFolder(true);
                      setNewFolderParentId(folder.id);
                    }}
                    className="p-0.5 text-text-tertiary hover:text-accent-success rounded transition-colors"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </Tooltip>
                <Tooltip content="Delete">
                  <button
                    onClick={() => onDeleteFolder(folder.id)}
                    className="p-0.5 text-text-tertiary hover:text-accent-error rounded transition-colors"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </Tooltip>
              </div>
            </>
          )}
        </div>

        {folder.isExpanded && (
          <div>
            {childFolders.map(f => renderFolder(f, depth + 1))}
            {folderRequests.map(r => renderRequest(r, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderRequest = (request: SavedRequest, depth: number = 0) => {
    const isSelected = currentRequestId === request.id;
    const isDragging = draggedRequestId === request.id;
    const isDropTargetRequest = dropTargetRequestId === request.id;

    return (
      <div
        key={request.id}
        style={{ marginLeft: `${depth * 10}px` }}
        className={`relative flex items-center gap-1 py-1 px-1.5 rounded group cursor-pointer transition-all ${
          isSelected
            ? 'bg-accent-primary text-white'
            : 'hover:bg-dark-bg-tertiary'
        } ${isDragging ? 'opacity-50' : ''}`}
        draggable
        onDragStart={(e) => handleDragStart(e, request.id)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOverRequest(e, request.id, request.folderId)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDropOnRequest(e, request.id, request.folderId)}
      >
        {/* Drop position indicator */}
        {isDropTargetRequest && dropPosition === 'before' && (
          <div className="absolute -top-0.5 left-0 right-0 h-0.5 bg-accent-primary rounded" />
        )}
        {isDropTargetRequest && dropPosition === 'after' && (
          <div className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-accent-primary rounded" />
        )}
        <span className="w-3"></span>

        {editingRequestId === request.id ? (
          <input
            type="text"
            value={editingRequestName}
            onChange={(e) => setEditingRequestName(e.target.value)}
            onBlur={() => handleRenameRequest(request.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameRequest(request.id);
              if (e.key === 'Escape') {
                setEditingRequestId(null);
                setEditingRequestName('');
              }
            }}
            className="flex-1 input py-0.5 text-xs"
            autoFocus
          />
        ) : (
          <>
            <div
              onClick={() => onSelectRequest(request.request, request.id)}
              className="flex-1 flex items-center gap-1.5 min-w-0"
            >
              <span className={`badge text-xs ${isSelected ? 'bg-white/20 text-white' : getMethodBadgeClass(request.request.method)}`}>
                {request.request.method}
              </span>
              <span className={`text-xs truncate ${isSelected ? 'text-white' : 'text-text-primary'}`}>
                {request.name}
              </span>
            </div>
            <div className={`hidden group-hover:flex gap-0.5 ${isSelected ? 'text-white/70' : ''}`}>
              {isSelected && (
                <Tooltip content="Save current request data">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSaveCurrentRequest();
                    }}
                    className={`p-0.5 rounded transition-colors ${isSelected ? 'hover:text-white' : 'text-text-tertiary hover:text-accent-success'}`}
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                  </button>
                </Tooltip>
              )}
              <Tooltip content="Rename">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditingRequest(request);
                  }}
                  className={`p-0.5 rounded transition-colors ${isSelected ? 'hover:text-white' : 'text-text-tertiary hover:text-accent-primary'}`}
                >
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </Tooltip>
              <Tooltip content="Delete">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteRequest(request.id);
                  }}
                  className={`p-0.5 rounded transition-colors ${isSelected ? 'hover:text-white' : 'text-text-tertiary hover:text-accent-error'}`}
                >
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </Tooltip>
            </div>
          </>
        )}
      </div>
    );
  };

  const rootFolders = folders.filter(f => f.parentId === null);
  const rootRequests = requests.filter(r => r.folderId === null);

  return (
    <div className="w-full sidebar h-screen overflow-y-auto flex flex-col">
      {/* Collection Manager */}
      <CollectionManager
        collections={collections}
        activeCollectionId={activeCollectionId}
        onSelectCollection={onSelectCollection}
        onCreateCollection={onCreateCollection}
        onRenameCollection={onRenameCollection}
        onDeleteCollection={onDeleteCollection}
        onDuplicateCollection={onDuplicateCollection}
      />

      <div className="p-2 border-b border-dark-border">
        <div className="flex gap-1.5">
          <button
            onClick={() => setIsCreatingFolder(true)}
            className="btn flex-1 text-xs"
          >
            + Folder
          </button>
          <button
            onClick={() => setIsCreatingRequest(true)}
            className="btn-primary flex-1 text-xs"
          >
            + Request
          </button>
        </div>
      </div>

      {isCreatingFolder && (
        <div className="p-2 bg-accent-primary/5 border-b border-accent-primary/20">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFolder();
              if (e.key === 'Escape') {
                setIsCreatingFolder(false);
                setNewFolderName('');
                setNewFolderParentId(null);
              }
            }}
            placeholder="Folder name..."
            className="input mb-1.5 text-xs"
            autoFocus
          />
          <div className="flex gap-1.5">
            <button
              onClick={handleCreateFolder}
              className="btn-accent flex-1 text-xs"
            >
              Create
            </button>
            <button
              onClick={() => {
                setIsCreatingFolder(false);
                setNewFolderName('');
                setNewFolderParentId(null);
              }}
              className="btn flex-1 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isCreatingRequest && (
        <div className="p-2 bg-accent-success/5 border-b border-accent-success/20">
          <input
            type="text"
            value={newRequestName}
            onChange={(e) => setNewRequestName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveRequest();
              if (e.key === 'Escape') {
                setIsCreatingRequest(false);
                setNewRequestName('');
                setNewRequestFolderId(null);
              }
            }}
            placeholder="Request name..."
            className="input mb-1.5 text-xs"
            autoFocus
          />
          <select
            value={newRequestFolderId || ''}
            onChange={(e) => setNewRequestFolderId(e.target.value || null)}
            className="input mb-1.5 text-xs"
          >
            <option value="">Root</option>
            {folders.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <div className="flex gap-1.5">
            <button
              onClick={handleSaveRequest}
              className="btn-primary flex-1 text-xs"
            >
              Save
            </button>
            <button
              onClick={() => {
                setIsCreatingRequest(false);
                setNewRequestName('');
                setNewRequestFolderId(null);
              }}
              className="btn flex-1 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div
        className="flex-1 p-1.5 overflow-y-auto"
        onDragOver={(e) => handleDragOverFolder(e, null)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDropOnFolder(e, null)}
      >
        {rootFolders.map(f => renderFolder(f))}
        {rootRequests.map(r => renderRequest(r))}

        {/* Root drop zone indicator */}
        {draggedRequestId && dropTargetFolderId === 'root' && !dropTargetRequestId && (
          <div className="mt-1 p-2 border-2 border-dashed border-accent-primary/50 rounded bg-accent-primary/10 text-center text-xs text-accent-primary">
            Drop here to move to root
          </div>
        )}

        {folders.length === 0 && requests.length === 0 && (
          <div className="text-center text-text-tertiary text-xs mt-6 px-2">
            No requests yet. Create a request or folder to get started.
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
