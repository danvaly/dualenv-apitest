import React, { useState } from 'react';
import type { Folder } from '../types';

interface SaveRequestDialogProps {
  folders: Folder[];
  onSave: (name: string, folderId: string | null) => void;
  onCancel: () => void;
}

const SaveRequestDialog: React.FC<SaveRequestDialogProps> = ({ folders, onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [folderId, setFolderId] = useState<string | null>(null);

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), folderId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="card p-4 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Save Request</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Request Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) handleSave();
                if (e.key === 'Escape') onCancel();
              }}
              placeholder="Enter request name..."
              className="input w-full text-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Folder (optional)
            </label>
            <select
              value={folderId || ''}
              onChange={(e) => setFolderId(e.target.value || null)}
              className="input w-full text-sm"
            >
              <option value="">Root (no folder)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-4">
          <button onClick={onCancel} className="btn text-xs">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="btn-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveRequestDialog;
