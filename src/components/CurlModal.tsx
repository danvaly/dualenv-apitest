import { useState } from 'react';

interface CurlModalProps {
  isOpen: boolean;
  onClose: () => void;
  curlCommand: string;
  envName: string;
}

export default function CurlModal({ isOpen, onClose, curlCommand, envName }: CurlModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(curlCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-dark-surface border border-dark-border rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border">
          <h2 className="text-sm font-medium text-text-primary">
            cURL Command {envName && <span className="text-text-muted">({envName})</span>}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-dark-border transition-colors"
            title="Close"
          >
            <svg className="w-4 h-4 text-text-muted hover:text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <pre className="bg-dark-bg rounded border border-dark-border p-3 text-xs font-mono text-text-primary whitespace-pre-wrap break-all overflow-auto">
            {curlCommand}
          </pre>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-dark-border">
          <button
            onClick={onClose}
            className="btn text-xs px-3 py-1.5"
          >
            Close
          </button>
          <button
            onClick={handleCopy}
            className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy to Clipboard
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
