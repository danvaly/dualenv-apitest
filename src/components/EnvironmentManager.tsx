import { useState } from 'react';
import type { Environment, EnvironmentVariable } from '../types';

interface EnvironmentManagerProps {
  environments: Environment[];
  selectedEnv1Id: string | null;
  selectedEnv2Id: string | null;
  onEnvironmentsChange: (environments: Environment[]) => void;
  onSelectEnv1: (id: string | null) => void;
  onSelectEnv2: (id: string | null) => void;
}

export default function EnvironmentManager({
  environments,
  selectedEnv1Id,
  selectedEnv2Id,
  onEnvironmentsChange,
  onSelectEnv1,
  onSelectEnv2,
}: EnvironmentManagerProps) {
  const [editingEnvId, setEditingEnvId] = useState<string | null>(null);
  const [showNewEnvForm, setShowNewEnvForm] = useState(false);
  const [newEnvName, setNewEnvName] = useState('');

  const createEnvironment = () => {
    if (!newEnvName.trim()) return;

    const newEnv: Environment = {
      id: `env-${Date.now()}`,
      name: newEnvName.trim(),
      variables: [
        { key: 'baseUrl', value: '', enabled: true },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onEnvironmentsChange([...environments, newEnv]);
    setNewEnvName('');
    setShowNewEnvForm(false);
    setEditingEnvId(newEnv.id);
  };

  const deleteEnvironment = (id: string) => {
    onEnvironmentsChange(environments.filter(e => e.id !== id));
    if (selectedEnv1Id === id) onSelectEnv1(null);
    if (selectedEnv2Id === id) onSelectEnv2(null);
    if (editingEnvId === id) setEditingEnvId(null);
  };

  const duplicateEnvironment = (env: Environment) => {
    const newEnv: Environment = {
      ...env,
      id: `env-${Date.now()}`,
      name: `${env.name} (copy)`,
      variables: env.variables.map(v => ({ ...v })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onEnvironmentsChange([...environments, newEnv]);
  };

  const updateEnvironment = (id: string, updates: Partial<Environment>) => {
    onEnvironmentsChange(
      environments.map(e =>
        e.id === id ? { ...e, ...updates, updatedAt: Date.now() } : e
      )
    );
  };

  const addVariable = (envId: string) => {
    const env = environments.find(e => e.id === envId);
    if (!env) return;

    updateEnvironment(envId, {
      variables: [...env.variables, { key: '', value: '', enabled: true }],
    });
  };

  const updateVariable = (envId: string, index: number, updates: Partial<EnvironmentVariable>) => {
    const env = environments.find(e => e.id === envId);
    if (!env) return;

    const newVariables = [...env.variables];
    newVariables[index] = { ...newVariables[index], ...updates };
    updateEnvironment(envId, { variables: newVariables });
  };

  const deleteVariable = (envId: string, index: number) => {
    const env = environments.find(e => e.id === envId);
    if (!env) return;

    updateEnvironment(envId, {
      variables: env.variables.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-3">
      {/* Environment Selectors */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Main Environment
          </label>
          <select
            value={selectedEnv1Id || ''}
            onChange={(e) => onSelectEnv1(e.target.value || null)}
            className="input w-full"
          >
            <option value="">Select environment...</option>
            {environments.map(env => (
              <option key={env.id} value={env.id}>{env.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Comparison Environment
          </label>
          <select
            value={selectedEnv2Id || ''}
            onChange={(e) => onSelectEnv2(e.target.value || null)}
            className="input w-full"
          >
            <option value="">Select environment...</option>
            {environments.map(env => (
              <option key={env.id} value={env.id}>{env.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Environment List */}
      <div className="border-t border-dark-border pt-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-text-secondary">Manage Environments</h3>
          <button
            onClick={() => setShowNewEnvForm(true)}
            className="btn text-xs"
          >
            + New
          </button>
        </div>

        {/* New Environment Form */}
        {showNewEnvForm && (
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newEnvName}
              onChange={(e) => setNewEnvName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createEnvironment()}
              placeholder="Environment name..."
              className="input flex-1"
              autoFocus
            />
            <button onClick={createEnvironment} className="btn-primary text-xs">
              Create
            </button>
            <button
              onClick={() => {
                setShowNewEnvForm(false);
                setNewEnvName('');
              }}
              className="btn text-xs"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Environment Cards */}
        <div className="space-y-1">
          {environments.map(env => (
            <div
              key={env.id}
              className={`rounded border transition-colors ${editingEnvId === env.id
                  ? 'border-accent-primary bg-dark-surface'
                  : 'border-dark-border hover:border-dark-border-hover'
                }`}
            >
              <div
                className="flex items-center justify-between px-2 py-1.5 cursor-pointer"
                onClick={() => setEditingEnvId(editingEnvId === env.id ? null : env.id)}
              >
                <div className="flex items-center gap-2">
                  <svg
                    className={`w-3 h-3 transition-transform ${editingEnvId === env.id ? 'rotate-90' : ''}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-medium text-text-primary">{env.name}</span>
                  <span className="text-xs text-text-muted">
                    ({env.variables.filter(v => v.enabled).length} vars)
                  </span>
                </div>
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => duplicateEnvironment(env)}
                    className="p-1 text-text-muted hover:text-text-secondary transition-colors"
                    title="Duplicate"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteEnvironment(env.id)}
                    className="p-1 text-text-muted hover:text-accent-error transition-colors"
                    title="Delete"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Environment Variables Editor */}
              {editingEnvId === env.id && (
                <div className="px-2 pb-2 border-t border-dark-border">
                  {/* Environment Name */}
                  <div className="py-2">
                    <label className="block text-xs text-text-muted mb-1">Name</label>
                    <input
                      type="text"
                      value={env.name}
                      onChange={(e) => updateEnvironment(env.id, { name: e.target.value })}
                      className="input w-full"
                    />
                  </div>

                  {/* Variables */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-text-muted">Variables</label>
                      <button
                        onClick={() => addVariable(env.id)}
                        className="text-xs text-accent-primary hover:text-accent-primary-hover"
                      >
                        + Add Variable
                      </button>
                    </div>

                    {env.variables.length === 0 ? (
                      <p className="text-xs text-text-muted italic py-2">No variables defined</p>
                    ) : (
                      <div className="space-y-1">
                        {env.variables.map((variable, index) => (
                          <div key={index} className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={variable.enabled}
                              onChange={(e) => updateVariable(env.id, index, { enabled: e.target.checked })}
                              className="w-3 h-3 accent-accent-primary"
                            />
                            <input
                              type="text"
                              value={variable.key}
                              onChange={(e) => updateVariable(env.id, index, { key: e.target.value })}
                              placeholder="key"
                              className={`input flex-1 text-xs ${!variable.enabled ? 'opacity-50' : ''}`}
                            />
                            <input
                              type="text"
                              value={variable.value}
                              onChange={(e) => updateVariable(env.id, index, { value: e.target.value })}
                              placeholder="value"
                              className={`input flex-[2] text-xs ${!variable.enabled ? 'opacity-50' : ''}`}
                            />
                            <button
                              onClick={() => deleteVariable(env.id, index)}
                              className="p-1 text-text-muted hover:text-accent-error transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Usage hint */}
                  <p className="text-xs text-text-muted mt-2 pt-2 border-t border-dark-border">
                    Use <code className="bg-dark-bg px-1 rounded">{'{{variableName}}'}</code> in endpoint URL, headers, or body.
                    <br />
                    Example: <code className="bg-dark-bg px-1 rounded">{'{{baseUrl}}/api/users'}</code>
                  </p>
                </div>
              )}
            </div>
          ))}

          {environments.length === 0 && !showNewEnvForm && (
            <p className="text-xs text-text-muted italic py-2 text-center">
              No environments yet. Create one to get started.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
