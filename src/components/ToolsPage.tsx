import { useState } from 'react';
import JsonViewer from './tools/JsonViewer';
import JsonDiff from './tools/JsonDiff';
import Tooltip from './Tooltip';

interface ToolsPageProps {
  isOpen: boolean;
  onClose: () => void;
}

type ToolTab = 'json-viewer' | 'json-diff';

export default function ToolsPage({ isOpen, onClose }: ToolsPageProps) {
  const [activeTab, setActiveTab] = useState<ToolTab>('json-viewer');
  const [isMaximized, setIsMaximized] = useState(false);

  if (!isOpen) return null;

  const tabs: { id: ToolTab; name: string; icon: React.ReactNode }[] = [
    {
      id: 'json-viewer',
      name: 'JSON Viewer',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      ),
    },
    {
      id: 'json-diff',
      name: 'JSON Diff',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`bg-dark-bg-secondary border border-dark-border shadow-xl flex flex-col transition-all duration-200 ${
        isMaximized
          ? 'w-screen h-screen rounded-none'
          : 'w-[90vw] max-w-6xl h-[85vh] rounded-lg'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
            </svg>
            <h2 className="text-lg font-semibold text-text-primary">Tools</h2>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip content={isMaximized ? 'Restore' : 'Maximize'}>
              <button
                onClick={() => setIsMaximized(!isMaximized)}
                className="p-1.5 rounded hover:bg-dark-bg-tertiary transition-colors text-text-secondary hover:text-text-primary"
              >
                {isMaximized ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V5a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2h-4M15 15H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                )}
              </button>
            </Tooltip>
            <Tooltip content="Close">
              <button
                onClick={onClose}
                className="p-1.5 rounded hover:bg-dark-bg-tertiary transition-colors text-text-secondary hover:text-text-primary"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </Tooltip>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar with tabs */}
          <div className="w-48 flex-shrink-0 border-r border-dark-border bg-dark-bg p-2">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'bg-accent-primary/20 text-accent-primary'
                      : 'text-text-secondary hover:bg-dark-bg-tertiary hover:text-text-primary'
                  }`}
                >
                  {tab.icon}
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-auto p-4">
            {activeTab === 'json-viewer' && <JsonViewer />}
            {activeTab === 'json-diff' && <JsonDiff />}
          </div>
        </div>
      </div>
    </div>
  );
}
