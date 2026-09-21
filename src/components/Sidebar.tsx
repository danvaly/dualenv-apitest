import React, { useState, useRef } from 'react';
import type { Folder, SavedRequest, ApiRequest, RequestCollection } from '../types';
import CollectionManager from './CollectionManager';
import Tooltip from './Tooltip';
import ContextMenu, { type MenuAction } from './ContextMenu';

interface SidebarProps {
  folders: Folder[];
  requests: SavedRequest[];
  currentRequestId: string | null;
  onSelectRequest: (request: ApiRequest, requestId: string) => void;
  onCreateRequest: (name: string, folderId: string | null) => void;
  onDuplicateRequest: (requestId: string) => void;
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
  onCreateRequest,
  onDuplicateRequest,
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
  const [saveCurrentAs, setSaveCurrentAs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; label: string; actions: MenuAction[] } | null>(null);
  const menuTrigger = useRef<HTMLElement | null>(null);
  const closeMenu = () => { setContextMenu(null); menuTrigger.current?.focus(); };

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
      (saveCurrentAs ? onSaveRequest : onCreateRequest)(newRequestName.trim(), newRequestFolderId);
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

  const createFolder = (parentId: string | null) => {
    setIsCreatingRequest(false);
    setNewFolderName('');
    setNewFolderParentId(parentId);
    setIsCreatingFolder(true);
  };
  const createRequest = (folderId: string | null, saveCurrent = false) => {
    setIsCreatingFolder(false);
    setSaveCurrentAs(saveCurrent);
    setNewRequestName('');
    setNewRequestFolderId(folderId);
    setIsCreatingRequest(true);
  };
  const showContextMenu = (event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, label: string, actions: MenuAction[]) => {
    if ((event.target as HTMLElement).closest('input, select, textarea')) return;
    if ('key' in event && event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return;
    event.preventDefault();
    event.stopPropagation();
    menuTrigger.current = event.currentTarget;
    const rect = event.currentTarget.getBoundingClientRect();
    setContextMenu({ x: 'clientX' in event ? event.clientX : rect.left,
      y: 'clientY' in event ? event.clientY : rect.bottom, label, actions });
  };
  const rootActions: MenuAction[] = [
    { label: 'New request', onSelect: () => createRequest(null) },
    { label: 'New folder', onSelect: () => createFolder(null) },
    { label: 'Save current request as…', onSelect: () => createRequest(null, true) },
  ];
  const folderActions = (folder: Folder): MenuAction[] => [
    { label: folder.isExpanded ? 'Collapse folder' : 'Expand folder', onSelect: () => onToggleFolder(folder.id) },
    { label: 'New request in folder', onSelect: () => createRequest(folder.id) },
    { label: 'New subfolder', onSelect: () => createFolder(folder.id) },
    { label: 'Save current request here…', onSelect: () => createRequest(folder.id, true) },
    { label: 'Rename folder', onSelect: () => startEditingFolder(folder) },
    { label: 'Delete folder', destructive: true, onSelect: () => {
      if (confirm(`Delete "${folder.name}" and all its subfolders and saved requests? Open requests will be kept as unsaved tabs.`)) onDeleteFolder(folder.id);
    } },
  ];
  const requestActions = (request: SavedRequest): MenuAction[] => [
    { label: 'Open request', onSelect: () => onSelectRequest(request.request, request.id) },
    { label: 'Rename request', onSelect: () => startEditingRequest(request) },
    { label: 'Duplicate request', onSelect: () => onDuplicateRequest(request.id) },
    ...(currentRequestId === request.id ? [{ label: 'Save changes', onSelect: onSaveCurrentRequest }] : []),
    { label: 'Delete request', destructive: true, onSelect: () => {
      if (confirm(`Delete "${request.name}" from this collection? Any open copy will be kept as an unsaved tab.`)) onDeleteRequest(request.id);
    } },
  ];

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

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const matchesRequest = (request: SavedRequest) => !normalizedSearch ||
    `${request.name} ${request.request.method} ${request.request.endpoint}`.toLowerCase().includes(normalizedSearch);
  const visibleFolderIds = new Set<string>();
  const folderHasMatch = (folder: Folder): boolean => {
    const directMatch = !normalizedSearch || folder.name.toLowerCase().includes(normalizedSearch);
    const requestMatch = requests.some(request => request.folderId === folder.id && matchesRequest(request));
    const childMatch = folders.filter(child => child.parentId === folder.id).some(child => folderHasMatch(child));
    if (directMatch || requestMatch || childMatch) visibleFolderIds.add(folder.id);
    return directMatch || requestMatch || childMatch;
  };
  if (normalizedSearch) folders.filter(folder => folder.parentId === null).forEach(folderHasMatch);

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
    const childFolders = folders.filter(f => f.parentId === folder.id && (!normalizedSearch || visibleFolderIds.has(f.id)));
    const folderRequests = requests.filter(r => r.folderId === folder.id && matchesRequest(r));
    const isDropTarget = dropTargetFolderId === folder.id && !dropTargetRequestId;

    return (
      <div key={folder.id} style={{ marginLeft: `${depth * 10}px` }}>
        <div
          className={`flex items-center gap-1 py-1 px-1.5 hover:bg-dark-bg-tertiary rounded group transition-colors ${
            isDropTarget ? 'bg-accent-primary/20 ring-1 ring-accent-primary' : ''
          }`}
          tabIndex={0}
          aria-label={`Folder ${folder.name}`}
          onContextMenu={event => showContextMenu(event, folder.name, folderActions(folder))}
          onKeyDown={event => showContextMenu(event, folder.name, folderActions(folder))}
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
              aria-label="Rename folder"
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
                      createFolder(folder.id);
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
        tabIndex={0}
        aria-label={`Request ${request.name}`}
        onContextMenu={event => showContextMenu(event, request.name, requestActions(request))}
        onKeyDown={event => showContextMenu(event, request.name, requestActions(request))}
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
            aria-label="Rename request"
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
            onClick={() => createFolder(null)}
            className="btn flex-1 text-xs"
          >
            + Folder
          </button>
          <button
            onClick={() => createRequest(null)}
            className="btn-primary flex-1 text-xs"
          >
            + Request
          </button>
        </div>
      </div>

      <div className="px-2 py-2 border-b border-dark-border">
        <label className="sr-only" htmlFor="sidebar-request-search">Search requests and folders</label>
        <div className="relative">
          <input
            id="sidebar-request-search"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="Search requests..."
            className="input pr-7 text-xs"
            type="search"
          />
          {searchQuery && <button onClick={() => setSearchQuery('')} aria-label="Clear request search" className="absolute right-1 top-1/2 -translate-y-1/2 px-1 text-text-muted hover:text-text-primary">×</button>}
        </div>
        {normalizedSearch && <div className="mt-1 text-[10px] text-text-muted">{requests.filter(matchesRequest).length} matching request{requests.filter(matchesRequest).length === 1 ? '' : 's'}</div>}
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
          <p className="mb-2 text-xs text-text-secondary">{saveCurrentAs ? 'Save current request as' : 'New empty request'}</p>
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
              {saveCurrentAs ? 'Save' : 'Create'}
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
        tabIndex={0}
        aria-label="Sidebar requests and folders"
        onContextMenu={event => showContextMenu(event, 'Collection contents', rootActions)}
        onKeyDown={event => showContextMenu(event, 'Collection contents', rootActions)}
        onDragOver={(e) => handleDragOverFolder(e, null)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDropOnFolder(e, null)}
      >
        {rootFolders.filter(f => !normalizedSearch || visibleFolderIds.has(f.id)).map(f => renderFolder(f))}
        {rootRequests.filter(matchesRequest).map(r => renderRequest(r))}

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
        {normalizedSearch && !folders.some(f => visibleFolderIds.has(f.id)) && !requests.some(matchesRequest) && (
          <div className="text-center text-text-tertiary text-xs mt-6 px-2">No matching requests or folders.</div>
        )}
      </div>
      {contextMenu && <ContextMenu {...contextMenu} onClose={closeMenu} />}
    </div>
  );
};

export default Sidebar;
