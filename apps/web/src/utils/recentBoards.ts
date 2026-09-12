export interface RecentBoard {
  id: string;
  name: string;
  lastVisited: number;
}

const STORAGE_KEY = 'flam_recent_boards';

export function getRecentBoards(): RecentBoard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => b.lastVisited - a.lastVisited);
    }
    return [];
  } catch {
    return [];
  }
}

export function saveRecentBoard(board: { id: string; name?: string }): void {
  try {
    const boards = getRecentBoards().filter((b) => b.id !== board.id);
    const updated: RecentBoard[] = [
      {
        id: board.id,
        name: board.name || board.id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        lastVisited: Date.now(),
      },
      ...boards,
    ].slice(0, 15); // Keep up to 15 recent boards

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[recentBoards] Failed to save recent board:', err);
  }
}

export function removeRecentBoard(id: string): RecentBoard[] {
  try {
    const updated = getRecentBoards().filter((b) => b.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearRecentBoards(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[recentBoards] Failed to clear recent boards:', err);
  }
}

