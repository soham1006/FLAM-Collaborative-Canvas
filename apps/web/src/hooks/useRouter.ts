import { useState, useEffect, useCallback } from 'react';

export interface RouteState {
  path: string;
  roomId: string | null;
}

export function parseRoute(pathname: string, search: string): RouteState {
  const params = new URLSearchParams(search);
  const queryRoom = params.get('room');
  if (queryRoom) {
    return { path: `/board/${queryRoom}`, roomId: queryRoom };
  }

  const match = pathname.match(/^\/board\/([a-zA-Z0-9_-]+)/);
  if (match) {
    return { path: `/board/${match[1]}`, roomId: match[1] };
  }

  const matchShort = pathname.match(/^\/b\/([a-zA-Z0-9_-]+)/);
  if (matchShort) {
    return { path: `/board/${matchShort[1]}`, roomId: matchShort[1] };
  }

  return { path: '/', roomId: null };
}

export function useRouter() {
  const [route, setRoute] = useState<RouteState>(() =>
    parseRoute(window.location.pathname, window.location.search)
  );

  useEffect(() => {
    const handlePopState = () => {
      setRoute(parseRoute(window.location.pathname, window.location.search));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((to: string, replace = false) => {
    if (replace) {
      window.history.replaceState({}, '', to);
    } else {
      window.history.pushState({}, '', to);
    }
    setRoute(parseRoute(window.location.pathname, window.location.search));
  }, []);

  return { ...route, navigate };
}

