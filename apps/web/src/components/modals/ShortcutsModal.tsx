import React from 'react';
import { X, Command } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS = [
  {
    title: 'Tools',
    shortcuts: [
      { key: 'V', desc: 'Select & Move' },
      { key: 'H', desc: 'Hand (Pan Canvas)' },
      { key: 'R', desc: 'Rectangle' },
      { key: 'O', desc: 'Circle / Ellipse' },
      { key: 'L', desc: 'Line' },
      { key: 'A', desc: 'Arrow' },
      { key: 'P', desc: 'Pencil / Freehand' },
      { key: 'T', desc: 'Text' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { key: 'Ctrl + Z', desc: 'Undo' },
      { key: 'Ctrl + Y', desc: 'Redo' },
      { key: 'Delete / Backspace', desc: 'Delete Selected' },
      { key: 'Shift + Click', desc: 'Multi-select' },
      { key: 'Drag empty area', desc: 'Marquee selection' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { key: 'Space + Drag', desc: 'Pan Camera' },
      { key: 'Middle Click + Drag', desc: 'Pan Camera' },
      { key: 'Ctrl + MouseWheel', desc: 'Zoom at Cursor' },
      { key: 'Pinch Trackpad', desc: 'Zoom at Cursor' },
      { key: '?', desc: 'Show Shortcuts' },
    ],
  },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg p-6 rounded-2xl border border-[var(--surface-panel-border)] bg-[var(--surface-panel)] shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--surface-panel-border)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent-light)] text-[var(--accent-primary)] flex items-center justify-center">
              <Command className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[10px] mb-2.5">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((item) => (
                  <div key={item.key} className="flex flex-col gap-0.5">
                    <kbd className="px-1.5 py-0.5 w-fit rounded bg-[var(--surface-hover)] border border-[var(--surface-panel-border)] font-mono text-[10px] text-[var(--text-primary)] font-medium">
                      {item.key}
                    </kbd>
                    <span className="text-[11px] text-[var(--text-secondary)]">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-[var(--surface-panel-border)] text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[var(--accent-primary)] text-white text-xs font-medium hover:bg-[var(--accent-primary-hover)] transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
