import React, { useState } from 'react';
import {
  Share2,
  Download,
  Moon,
  Sun,
  Check,
  FileImage,
  Code2,
  FileJson,
  ChevronLeft,
  Copy,
  HelpCircle,
} from 'lucide-react';
import { useCanvasStore } from '../../store/useCanvasStore';

interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onExport?: (format: 'png' | 'svg' | 'json') => void;
  onOpenShortcuts?: () => void;
  onBackToLanding?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isDark,
  onToggleTheme,
  onExport,
  onOpenShortcuts,
  onBackToLanding,
}) => {
  const {
    roomName,
    roomId,
    connectionStatus,
    collaborators,
    currentUserName,
    currentUserColor,
  } = useCanvasStore();

  const [copied, setCopied] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleShare = () => {
    const url = `${window.location.origin}/board/${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="h-14 px-4 border-b border-[var(--surface-panel-border)] bg-[var(--surface-panel)] flex items-center justify-between shadow-sm z-20 select-none">
      {/* Left: Branding & Room Details */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onBackToLanding && (
          <button
            onClick={onBackToLanding}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg border border-[var(--surface-panel-border)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title="Return to Boards Dashboard"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Boards</span>
          </button>
        )}

        <button
          onClick={onBackToLanding}
          className="w-8 h-8 rounded-lg bg-[var(--accent-primary)] flex items-center justify-center text-white font-bold text-base shadow-sm hover:opacity-90 active:scale-95 transition-transform"
          title="FLAM Canvas Home"
        >
          F
        </button>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs sm:text-sm tracking-tight text-[var(--text-primary)] truncate max-w-[140px] sm:max-w-[220px]">
              {roomName}
            </span>
            <button
              onClick={handleShare}
              title="Click to copy Room ID"
              className="text-[10px] px-1.5 py-0.5 rounded font-mono text-[var(--text-muted)] bg-[var(--surface-hover)] border border-[var(--surface-panel-border)] hover:border-sky-500/40 hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
            >
              <span>{roomId}</span>
              <Copy className="w-2.5 h-2.5 opacity-60" />
            </button>
          </div>
          <span className="text-[10px] sm:text-[11px] text-[var(--text-secondary)] hidden xs:inline">
            FLAM Collaborative Canvas
          </span>
        </div>
      </div>

      {/* Center: Collaborators & Connection Pill */}
      <div className="flex items-center gap-3">
        {/* Connection Status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors border-[var(--surface-panel-border)] bg-[var(--surface-hover)]">
          <span
            className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected'
                ? 'bg-emerald-500 animate-pulse'
                : connectionStatus === 'connecting'
                ? 'bg-amber-500 animate-pulse'
                : 'bg-rose-500'
            }`}
          />
          <span className="text-[var(--text-secondary)] capitalize text-xs">
            {connectionStatus}
          </span>
        </div>

        {/* Collaborators Avatar Pile */}
        <div className="flex items-center -space-x-2">
          {/* Current User */}
          <div
            title={`You (${currentUserName})`}
            className="w-7 h-7 rounded-full border-2 border-[var(--surface-panel)] flex items-center justify-center text-white text-[11px] font-semibold shadow-sm ring-1 ring-[var(--surface-panel-border)]"
            style={{ backgroundColor: currentUserColor }}
          >
            {currentUserName.charAt(0).toUpperCase()}
          </div>

          {/* Remote Collaborators */}
          {collaborators.map((user) => (
            <div
              key={user.id}
              title={user.name}
              className="w-7 h-7 rounded-full border-2 border-[var(--surface-panel)] flex items-center justify-center text-white text-[11px] font-semibold shadow-sm ring-1 ring-[var(--surface-panel-border)]"
              style={{ backgroundColor: user.color }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
          ))}

          {collaborators.length > 3 && (
            <div className="w-7 h-7 rounded-full border-2 border-[var(--surface-panel)] bg-[var(--surface-hover)] flex items-center justify-center text-[var(--text-secondary)] text-[10px] font-semibold shadow-sm">
              +{collaborators.length - 3}
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions (Share, Export, Theme) */}
      <div className="flex items-center gap-2">
        {/* Share Button */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--surface-panel-border)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] transition-colors shadow-sm active:scale-95"
          title="Copy shareable room link"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-600">Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <span>Share</span>
            </>
          )}
        </button>

        {/* Export Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--surface-panel-border)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] transition-colors shadow-sm"
            title="Export Canvas"
          >
            <Download className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <span>Export</span>
          </button>

          {showExportMenu && (
            <div
              className="absolute right-0 mt-1.5 w-40 rounded-xl border border-[var(--surface-panel-border)] bg-[var(--surface-panel)] shadow-[var(--shadow-lg)] p-1 z-30 animate-in fade-in zoom-in-95 duration-100"
              onMouseLeave={() => setShowExportMenu(false)}
            >
              <button
                onClick={() => {
                  onExport?.('png');
                  setShowExportMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors text-left"
              >
                <FileImage className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                Export PNG
              </button>
              <button
                onClick={() => {
                  onExport?.('svg');
                  setShowExportMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors text-left"
              >
                <Code2 className="w-3.5 h-3.5 text-emerald-600" />
                Export SVG
              </button>
              <button
                onClick={() => {
                  onExport?.('json');
                  setShowExportMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors text-left"
              >
                <FileJson className="w-3.5 h-3.5 text-amber-600" />
                Export JSON
              </button>
            </div>
          )}
        </div>

        {/* Shortcuts Help Button */}
        <button
          onClick={onOpenShortcuts}
          className="p-2 rounded-lg border border-[var(--surface-panel-border)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-colors shadow-sm"
          title="Keyboard Shortcuts (?)"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-lg border border-[var(--surface-panel-border)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-colors shadow-sm"
          title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
