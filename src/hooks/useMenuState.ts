import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export function useMenuState<T extends string>() {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [activeMenu, setActiveMenu] = useState<T | null>(null);
  const closeMenu = useCallback(() => setActiveMenu(null), []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return {
    menuRef: menuRef as RefObject<HTMLDivElement | null>,
    activeMenu,
    setActiveMenu,
    closeMenu,
  };
}
