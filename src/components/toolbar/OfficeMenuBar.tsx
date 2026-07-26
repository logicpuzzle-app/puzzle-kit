import React from 'react';
import { useTranslation } from 'react-i18next';
import type { MenuDefinition } from './menu';

type OfficeMenuBarProps = {
  title?: React.ReactNode;
  menus: MenuDefinition[];
  menuRef: React.RefObject<HTMLDivElement | null>;
  activeMenu: string | null;
  setActiveMenu: (menu: string | null) => void;
  containerClassName?: string;
  className?: string;
  menuButtonClassName?: string;
  dropdownClassName?: string;
  rightSlot?: React.ReactNode;
  rightSlotClassName?: string;
  enableHoverOpen?: boolean;
};

export const OfficeMenuBar: React.FC<OfficeMenuBarProps> = ({
  title,
  menus,
  menuRef,
  activeMenu,
  setActiveMenu,
  containerClassName,
  className,
  menuButtonClassName,
  dropdownClassName,
  rightSlot,
  rightSlotClassName,
  enableHoverOpen = true,
}) => {
  const { t } = useTranslation();
  const resolvedContainerClassName = containerClassName
    ?? `flex items-center bg-office-ribbon h-7 px-1 ${className ?? ''}`.trim();
  const menuButtonBaseClassName = menuButtonClassName
    ?? 'px-3 py-1 text-sm hover:bg-office-ribbon-hover transition-colors';
  const dropdownBaseClassName = dropdownClassName
    ?? 'absolute top-full left-0 bg-white border border-office-border shadow-lg min-w-[200px] py-1 z-50';
  const resolvedRightSlotClassName = rightSlotClassName
    ?? 'ml-auto flex items-center gap-2 px-2';

  return (
    <div ref={menuRef} className={resolvedContainerClassName}>
      {title && (
        <div className="flex items-center px-2 mr-2">
          {title}
        </div>
      )}
      {menus.map((menu) => (
        <div key={menu.labelKey} className="relative">
          <button
            className={`${menuButtonBaseClassName} ${activeMenu === menu.labelKey ? 'bg-office-ribbon-hover' : ''}`}
            onClick={() =>
              setActiveMenu(activeMenu === menu.labelKey ? null : menu.labelKey)
            }
            onMouseEnter={enableHoverOpen && activeMenu ? () => setActiveMenu(menu.labelKey) : undefined}
          >
            {t(menu.labelKey)}
          </button>

          {activeMenu === menu.labelKey && (
            <div className={dropdownBaseClassName}>
              {menu.items.map((item, index) =>
                item.divider ? (
                  <div
                    key={`${menu.labelKey}-divider-${index}`}
                    className="border-t border-office-border my-1"
                  />
                ) : (
                  <button
                    key={item.labelKey}
                    className={`w-full text-left px-4 py-1.5 text-sm flex justify-between items-center ${
                      item.disabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'hover:bg-office-ribbon-hover'
                    }`}
                    onClick={() => !item.disabled && item.action?.()}
                    disabled={item.disabled}
                  >
                    <span className={`flex items-center gap-2 ${item.strikethrough ? 'line-through' : ''}`}>
                      {item.checked !== undefined && (
                        <span className="w-4 text-center">
                          {item.checked ? '✓' : ''}
                        </span>
                      )}
                      {t(item.labelKey)}{item.suffix ? ` ${item.suffix}` : ''}
                    </span>
                    {item.shortcut && (
                      <span className="text-office-text-secondary text-xs ml-4">
                        {item.shortcut}
                      </span>
                    )}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ))}
      {rightSlot && (
        <div className={resolvedRightSlotClassName}>
          {rightSlot}
        </div>
      )}
    </div>
  );
};
