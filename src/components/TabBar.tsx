import { useEffect, useRef, useState } from 'react';
import type { OpenTab } from '../types';
import ContextMenu from './ContextMenu';

interface TabBarProps {
  tabs: OpenTab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onCloseOtherTabs: (tabId: string) => void;
  onCloseAllTabs: () => void;
  onNewTab: () => void;
}
const METHOD_COLORS: Record<string, string> = {
  GET: 'text-accent-success', POST: 'text-accent-primary', PUT: 'text-yellow-500',
  PATCH: 'text-orange-500', DELETE: 'text-accent-error',
};

export default function TabBar({ tabs, activeTabId, onSelectTab, onCloseTab, onCloseOtherTabs, onCloseAllTabs, onNewTab }: TabBarProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeTabId]);

  return (
    <div className="flex shrink-0 min-w-0 items-center bg-dark-bg border-b border-dark-border">
      <div ref={listRef} role="tablist" aria-label="Requests" className="flex flex-1 min-w-0 overflow-x-auto">
        {tabs.map((tab, index) => (
          <div key={tab.id} className={`group flex shrink-0 items-center w-48 border-r border-dark-border border-b-2 ${activeTabId === tab.id ? 'bg-dark-surface border-b-accent-primary' : 'border-b-transparent hover:bg-dark-surface/50'}`}>
            <button
              role="tab"
              aria-selected={activeTabId === tab.id}
              tabIndex={activeTabId === tab.id ? 0 : -1}
              title={`${tab.request.method} ${tab.request.endpoint || tab.title}${tab.isDirty ? ' (unsaved changes)' : ''}`}
              onClick={() => onSelectTab(tab.id)}
              onContextMenu={event => {
                event.preventDefault();
                setMenu({ x: event.clientX, y: event.clientY, tabId: tab.id });
              }}
              onKeyDown={event => {
                let next = index;
                if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
                else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
                else if (event.key === 'Home') next = 0;
                else if (event.key === 'End') next = tabs.length - 1;
                else if (event.key === 'Delete') { event.preventDefault(); onCloseTab(tab.id); return; }
                else return;
                event.preventDefault();
                onSelectTab(tabs[next].id);
                listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
              }}
              className="flex flex-1 min-w-0 items-center gap-2 px-3 py-2.5 text-left"
            >
              <span className={`text-[10px] font-bold shrink-0 ${METHOD_COLORS[tab.request.method] || 'text-text-muted'}`}>{tab.request.method}</span>
              <span className="text-xs text-text-primary truncate">{tab.title}</span>
              {tab.isDirty && <span aria-label="Unsaved changes" className="text-accent-primary shrink-0">•</span>}
              {tab.comparison.loading && <span aria-label="Sending" className="h-3 w-3 shrink-0 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />}
            </button>
            <button onClick={() => onCloseTab(tab.id)} aria-label={`Close ${tab.title}`} title="Close tab"
              className="mr-1 p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-dark-border shrink-0">×</button>
          </div>
        ))}
      </div>
      <button onClick={onNewTab} aria-label="New tab" title="New tab" className="px-3 py-2 hover:bg-dark-surface shrink-0 text-text-secondary">+</button>
      <select aria-label="Switch request tab" value={activeTabId || ''} onChange={e => onSelectTab(e.target.value)}
        className="input w-32 mr-2 shrink-0" title="All open requests">
        {tabs.map(tab => <option key={tab.id} value={tab.id}>{tab.isDirty ? '• ' : ''}{tab.request.method} {tab.title}</option>)}
      </select>
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          label={tabs.find(t => t.id === menu.tabId)?.title || 'Tab'}
          onClose={() => setMenu(null)}
          actions={[
            { label: 'Close Tab', onSelect: () => onCloseTab(menu.tabId) },
            { label: 'Close Others', onSelect: () => onCloseOtherTabs(menu.tabId), disabled: tabs.length <= 1 },
            { label: 'Close All', onSelect: () => onCloseAllTabs(), destructive: true },
          ]}
        />
      )}
    </div>
  );
}
