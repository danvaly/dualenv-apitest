import { useEffect, useRef, useState, useCallback } from 'react';
import type { ConsoleLogEntry } from '../types';

interface ConsolePanelProps {
  logs: ConsoleLogEntry[];
  isOpen: boolean;
  onToggle: () => void;
  onClear: () => void;
  height: number;
  onHeightChange: (height: number) => void;
}

const MIN_HEIGHT = 100;
const MAX_HEIGHT = 500;
const DEFAULT_HEIGHT = 192; // 12rem = 192px

export default function ConsolePanel({ logs, isOpen, onToggle, onClear, height, onHeightChange }: ConsolePanelProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (isOpen && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  // Handle resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate new height based on mouse position from bottom of viewport
      const newHeight = window.innerHeight - e.clientY;
      const clampedHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, newHeight));
      onHeightChange(clampedHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onHeightChange]);

  const getLogTypeStyles = (type: ConsoleLogEntry['type']) => {
    switch (type) {
      case 'info':
        return 'text-text-secondary';
      case 'request':
        return 'text-accent-primary';
      case 'response':
        return 'text-accent-success';
      case 'error':
        return 'text-accent-error';
      case 'verbose':
        return 'text-accent-warning';
      default:
        return 'text-text-secondary';
    }
  };

  const getLogTypeIcon = (type: ConsoleLogEntry['type']) => {
    switch (type) {
      case 'info':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'request':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
          </svg>
        );
      case 'response':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'verbose':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  const consoleHeight = height || DEFAULT_HEIGHT;

  return (
    <div className="border-t border-dark-border bg-dark-bg">
      {/* Resize Handle - only show when open */}
      {isOpen && (
        <div
          className={`h-1 cursor-ns-resize hover:bg-accent-primary/50 transition-colors ${isResizing ? 'bg-accent-primary' : 'bg-transparent'}`}
          onMouseDown={handleMouseDown}
          title="Drag to resize"
        />
      )}

      {/* Console Header */}
      <div
        className="flex items-center justify-between px-3 py-1.5 bg-dark-bg-secondary cursor-pointer hover:bg-dark-bg-tertiary transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-3 h-3 text-text-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
          <span className="text-xs font-medium text-text-primary">Console</span>
          {logs.length > 0 && (
            <span className="badge bg-dark-bg text-text-tertiary text-xs px-1.5 py-0">
              {logs.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isOpen && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
              title="Clear console"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Console Content */}
      {isOpen && (
        <div
          ref={containerRef}
          style={{ height: consoleHeight }}
          className="overflow-y-auto bg-dark-bg font-mono text-xs"
        >
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-text-tertiary">
              No logs yet. Send a request to see output.
            </div>
          ) : (
            <div className="p-2 space-y-0.5">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 py-0.5 hover:bg-dark-bg-secondary rounded px-1">
                  <span className="text-text-tertiary flex-shrink-0 tabular-nums">
                    {formatTimestamp(log.timestamp)}
                  </span>
                  <span className={`flex-shrink-0 ${getLogTypeStyles(log.type)}`}>
                    {getLogTypeIcon(log.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className={`${getLogTypeStyles(log.type)} break-all`}>
                      {log.message}
                    </span>
                    {log.details && (
                      <pre className="mt-1 text-text-tertiary whitespace-pre-wrap break-all text-[10px] leading-tight bg-dark-bg-secondary rounded p-1.5">
                        {log.details}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      )}

      {/* Overlay to prevent text selection while resizing */}
      {isResizing && (
        <div className="fixed inset-0 z-50 cursor-ns-resize" />
      )}
    </div>
  );
}
