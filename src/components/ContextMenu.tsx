import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface MenuAction {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  label: string;
  actions: MenuAction[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, label, actions, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const menu = ref.current;
    if (!menu) return;
    const bounds = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - bounds.width - 8))}px`;
    menu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - bounds.height - 8))}px`;
    menu.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }, [x, y]);

  useEffect(() => {
    const dismiss = (event: Event) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  return createPortal(
    <div ref={ref} role="menu" aria-label={label}
      className="fixed z-[100] w-56 max-h-[calc(100vh-16px)] overflow-y-auto rounded-md border border-dark-border bg-dark-bg-secondary p-1 shadow-xl"
      style={{ left: x, top: y }}
      onContextMenu={event => { event.preventDefault(); event.stopPropagation(); }}
      onKeyDown={event => {
        const buttons = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || []);
        const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
        if (event.key === 'Escape' || event.key === 'Tab') { event.preventDefault(); onClose(); return; }
        let next = current;
        if (event.key === 'ArrowDown') next = (current + 1) % buttons.length;
        else if (event.key === 'ArrowUp') next = (current - 1 + buttons.length) % buttons.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = buttons.length - 1;
        else return;
        event.preventDefault();
        buttons[next]?.focus();
      }}>
      <div className="px-2 py-1.5 text-[10px] text-text-muted truncate border-b border-dark-border mb-1">{label}</div>
      {actions.map(action => (
        <button key={action.label} role="menuitem" disabled={action.disabled}
          className={`block w-full rounded px-2 py-2 text-left text-xs hover:bg-dark-bg-tertiary focus:bg-dark-bg-tertiary disabled:opacity-40 disabled:cursor-not-allowed ${action.destructive ? 'text-accent-error' : 'text-text-primary'}`}
          onClick={() => { onClose(); action.onSelect(); }}>
          {action.label}
        </button>
      ))}
    </div>, document.body,
  );
}
