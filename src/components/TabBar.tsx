import type { OpenTab } from '../types';

interface TabBarProps {
  tabs: OpenTab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNewTab: () => void;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-accent-success',
  POST: 'text-accent-primary',
  PUT: 'text-yellow-500',
  PATCH: 'text-orange-500',
  DELETE: 'text-accent-error',
};

export default function TabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
}: TabBarProps) {
  return (
    <div className="flex items-center bg-dark-bg border-b border-dark-border overflow-x-auto">
      <div className="flex items-center flex-1 min-w-0">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`group flex items-center gap-1.5 px-3 py-1.5 border-r border-dark-border cursor-pointer min-w-0 max-w-[200px] transition-colors ${
              activeTabId === tab.id
                ? 'bg-dark-surface border-b-2 border-b-accent-primary -mb-px'
                : 'bg-dark-bg hover:bg-dark-surface/50'
            }`}
            onClick={() => onSelectTab(tab.id)}
          >
            <span className={`text-[10px] font-bold shrink-0 ${METHOD_COLORS[tab.request.method] || 'text-text-muted'}`}>
              {tab.request.method}
            </span>
            <span className="text-xs text-text-primary truncate flex-1">
              {tab.title}
              {tab.isDirty && <span className="text-accent-primary ml-0.5">•</span>}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-dark-border transition-all shrink-0"
              title="Close tab"
            >
              <svg className="w-3 h-3 text-text-muted hover:text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={onNewTab}
        className="p-2 hover:bg-dark-surface transition-colors shrink-0"
        title="New tab"
      >
        <svg className="w-4 h-4 text-text-muted hover:text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}
