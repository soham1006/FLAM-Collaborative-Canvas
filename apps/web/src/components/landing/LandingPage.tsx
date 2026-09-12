import React, { useState, useEffect } from 'react';
import {
  Plus,
  ArrowRight,
  Clock,
  Trash2,
  Sparkles,
  Zap,
  Database,
  Layers,
  ExternalLink,
  Sun,
  Moon,
  Users,
} from 'lucide-react';
import { getRecentBoards, removeRecentBoard, RecentBoard } from '../../utils/recentBoards';

interface LandingPageProps {
  onNavigate: (path: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

interface ServerRoom {
  id: string;
  slug: string;
  name: string;
  updatedAt?: string;
  shapeCount?: number;
}

const PRESET_NAMES = [
  'System Architecture',
  'Microservices Flow',
  'UI/UX Wireframe',
  'Database Schema',
  'Sprint Brainstorm',
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  isDark,
  onToggleTheme,
}) => {
  const [boardName, setBoardName] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [recentBoards, setRecentBoards] = useState<RecentBoard[]>([]);
  const [serverRooms, setServerRooms] = useState<ServerRoom[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setRecentBoards(getRecentBoards());

    // Attempt to fetch public rooms from server
    fetch('/api/rooms')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.rooms && Array.isArray(data.rooms)) {
          setServerRooms(data.rooms);
        }
      })
      .catch(() => {
        // Offline or standalone mode - silent fallback
      });
  }, []);

  const handleCreateBoard = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsCreating(true);
    setErrorMsg(null);

    const name = boardName.trim() || PRESET_NAMES[Math.floor(Math.random() * PRESET_NAMES.length)];

    // Generate readable slug: e.g. "system-architecture-a4f2"
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const slug = `${baseSlug || 'board'}-${randomSuffix}`;

    try {
      // Try to create room on server via REST API
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        const data = await res.json();
        onNavigate(`/board/${data.slug || slug}`);
        return;
      }
    } catch {
      // Offline fallback: navigate directly to generated slug
    }

    onNavigate(`/board/${slug}`);
  };

  const handleJoinBoard = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = joinInput.trim();
    if (!raw) return;

    // Check if user pasted a full URL (e.g. http://localhost:5173/board/xyz or /board/xyz)
    let extractedId = raw;
    try {
      if (raw.includes('/board/')) {
        const parts = raw.split('/board/');
        extractedId = parts[1].split('?')[0].split('#')[0];
      } else if (raw.includes('?room=')) {
        const urlObj = new URL(raw, window.location.origin);
        extractedId = urlObj.searchParams.get('room') || raw;
      }
    } catch {
      extractedId = raw;
    }

    extractedId = extractedId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!extractedId) {
      setErrorMsg('Please enter a valid board ID or URL.');
      return;
    }

    onNavigate(`/board/${extractedId}`);
  };

  const handleDeleteRecent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = removeRecentBoard(id);
    setRecentBoards(updated);
  };

  const formatRelativeTime = (timestamp: number) => {
    const elapsedSec = Math.floor((Date.now() - timestamp) / 1000);
    if (elapsedSec < 60) return 'Just now';
    const elapsedMin = Math.floor(elapsedSec / 60);
    if (elapsedMin < 60) return `${elapsedMin}m ago`;
    const elapsedHours = Math.floor(elapsedMin / 60);
    if (elapsedHours < 24) return `${elapsedHours}h ago`;
    const elapsedDays = Math.floor(elapsedHours / 24);
    return `${elapsedDays}d ago`;
  };

  return (
    <div className="min-h-screen bg-[var(--canvas-bg)] text-[var(--text-primary)] flex flex-col font-sans transition-colors duration-200">
      {/* Top Navigation */}
      <header className="h-16 px-6 sm:px-10 border-b border-[var(--surface-panel-border)] bg-[var(--surface-panel)] flex items-center justify-between shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--accent-primary)] flex items-center justify-center text-white font-bold text-lg shadow-md shadow-sky-500/20">
            F
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-[var(--text-primary)]">
              FLAM Canvas
            </h1>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Real-Time Collaborative Vector Studio
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg border border-[var(--surface-panel-border)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-colors shadow-sm"
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 sm:py-16 flex flex-col gap-12">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 shadow-sm animate-in fade-in duration-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>High-Frequency Delta Streaming • SQLite Persistence</span>
          </div>

          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-primary)] leading-tight">
            Infinite Collaborative Canvas for Engineering Teams
          </h2>
          <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed">
            Create multi-user diagrams, freehand illustrations, and architectures with sub-millisecond local rendering, operation-based sync, and transactional persistence.
          </p>
        </div>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Board Card */}
          <div className="p-6 sm:p-8 rounded-2xl border border-[var(--surface-panel-border)] bg-[var(--surface-panel)] shadow-[var(--shadow-md)] flex flex-col justify-between hover:border-sky-500/40 transition-all duration-200">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">Create New Board</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Start an empty canvas or architecture space. Share the link with teammates to draw live together.
                </p>
              </div>

              <form onSubmit={handleCreateBoard} className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Board Name (optional)
                  </label>
                  <input
                    type="text"
                    value={boardName}
                    onChange={(e) => setBoardName(e.target.value)}
                    placeholder="e.g. Sprint 14 System Architecture"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--surface-panel-border)] bg-[var(--canvas-bg)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition-all"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {PRESET_NAMES.slice(0, 3).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setBoardName(preset)}
                      className="text-[11px] px-2.5 py-1 rounded-lg border border-[var(--surface-panel-border)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-[var(--accent-primary)] hover:opacity-90 active:scale-[0.99] text-white shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isCreating ? 'Creating Board...' : 'Create & Launch Board'}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Join Board Card */}
          <div className="p-6 sm:p-8 rounded-2xl border border-[var(--surface-panel-border)] bg-[var(--surface-panel)] shadow-[var(--shadow-md)] flex flex-col justify-between hover:border-emerald-500/40 transition-all duration-200">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <ArrowRight className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">Join Existing Board</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Enter a room ID or paste an invite link shared by your teammate to jump directly into the session.
                </p>
              </div>

              <form onSubmit={handleJoinBoard} className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Room ID or URL
                  </label>
                  <input
                    type="text"
                    value={joinInput}
                    onChange={(e) => {
                      setJoinInput(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="e.g. system-architecture-a4f2 or full URL"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--surface-panel-border)] bg-[var(--canvas-bg)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                  />
                  {errorMsg && (
                    <p className="text-xs text-rose-500 mt-1 font-medium">{errorMsg}</p>
                  )}
                </div>

                <div className="text-[11px] text-[var(--text-muted)] pt-1">
                  Pro-tip: Paste any direct board link or room slug.
                </div>

                <button
                  type="submit"
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white shadow-sm transition-all"
                >
                  <Users className="w-4 h-4" />
                  <span>Join Board Session</span>
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Recent Boards Section */}
        {recentBoards.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--text-secondary)]" />
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Recent Boards</h3>
              </div>
              <span className="text-xs text-[var(--text-muted)]">Saved in this browser</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentBoards.map((b) => (
                <div
                  key={b.id}
                  onClick={() => onNavigate(`/board/${b.id}`)}
                  className="group p-4 rounded-xl border border-[var(--surface-panel-border)] bg-[var(--surface-panel)] hover:border-sky-500/40 cursor-pointer shadow-sm hover:shadow-md transition-all flex items-center justify-between"
                >
                  <div className="min-w-0 pr-3">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate group-hover:text-sky-500 transition-colors">
                      {b.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-hover)] text-[var(--text-muted)] border border-[var(--surface-panel-border)]">
                        {b.id}
                      </span>
                      <span className="text-[11px] text-[var(--text-secondary)]">
                        {formatRelativeTime(b.lastVisited)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleDeleteRecent(b.id, e)}
                      title="Remove from recents"
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-500 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ExternalLink className="w-4 h-4 text-[var(--text-muted)] group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Server Public Rooms (if any found) */}
        {serverRooms.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[var(--text-secondary)]" />
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Discovered Server Boards</h3>
              </div>
              <span className="text-xs text-[var(--text-muted)]">From SQLite Persistence</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {serverRooms.map((r) => (
                <div
                  key={r.id || r.slug}
                  onClick={() => onNavigate(`/board/${r.slug}`)}
                  className="group p-4 rounded-xl border border-[var(--surface-panel-border)] bg-[var(--surface-panel)] hover:border-emerald-500/40 cursor-pointer shadow-sm hover:shadow-md transition-all flex items-center justify-between"
                >
                  <div className="min-w-0 pr-3">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate group-hover:text-emerald-500 transition-colors">
                      {r.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-hover)] text-[var(--text-muted)] border border-[var(--surface-panel-border)]">
                        {r.slug}
                      </span>
                      {typeof r.shapeCount === 'number' && (
                        <span className="text-[11px] text-[var(--text-secondary)]">
                          {r.shapeCount} shape{r.shapeCount === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[var(--text-muted)] group-hover:text-emerald-500 transition-colors" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feature & Architecture Badges */}
        <div className="pt-6 border-t border-[var(--surface-panel-border)] grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-[var(--surface-panel-border)] bg-[var(--surface-panel)] flex items-start gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500 mt-0.5">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[var(--text-primary)]">Streamed Freehand Delta</h4>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                0.1px quantization & 33ms RAF chunking drops payloads from 150 KB to ~250 B.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[var(--surface-panel-border)] bg-[var(--surface-panel)] flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 mt-0.5">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[var(--text-primary)]">Transactional Persistence</h4>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Node 22 native SQLite repository in development, seamless PostgreSQL in production.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[var(--surface-panel-border)] bg-[var(--surface-panel)] flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 mt-0.5">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[var(--text-primary)]">Clean OOP & GoF Patterns</h4>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Command pattern undo/redo, multi-handle transforms, and decoupled engine lifecycle.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
