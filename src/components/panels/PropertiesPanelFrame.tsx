import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { usePuzzleStore } from '../../store/puzzleStoreContext';
import { useModalStore } from '../../store/modalStoreContext';

/** The same property editors live in a sidebar or a modal on narrow screens. */
export function PropertiesPanelFrame({
  children,
  suspended = false,
}: {
  children: ReactNode;
  suspended?: boolean;
}) {
  const { t } = useTranslation();
  const narrow = useMediaQuery('(max-width: 767px)');
  const open = usePuzzleStore((state) => state.isPropertiesPanelOpen);
  const setOpen = usePuzzleStore((state) => state.setPropertiesPanelOpen);
  const validationOpen = usePuzzleStore((state) => state.isValidationModalOpen);
  const storeModalOpen = useModalStore(
    (state) =>
      state.alertModal.isOpen ||
      state.confirmModal.isOpen ||
      state.shortcutsModal.isOpen ||
      state.urlImportModal.isOpen
  );
  const otherModalOpen = suspended || validationOpen || storeModalOpen;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const backdropStart = useRef(false);
  const panelId = useId();
  const titleId = useId();
  const previouslyOpen = useRef(open);

  useEffect(() => {
    if (previouslyOpen.current && !open && !otherModalOpen) {
      openerRef.current?.focus({ preventScroll: true });
    }
    previouslyOpen.current = open;
  }, [open, otherModalOpen]);

  useEffect(() => {
    if (!narrow || !open) return;
    // Existing application alerts are outside the native dialog's top layer.
    // Dismiss the drawer so their controls remain available.
    if (otherModalOpen) {
      setOpen(false);
      return;
    }
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    closeRef.current?.focus();
    return () => {
      dialog.close();
    };
  }, [narrow, open, otherModalOpen, setOpen]);

  const close = () => {
    dialogRef.current?.close();
    setOpen(false);
    // The opener stays mounted on narrow screens, including touch/WebKit.
    openerRef.current?.focus({ preventScroll: true });
  };

  const content = (
    <>
      <div className="panel-header flex-shrink-0 flex items-center justify-between">
        <span id={titleId}>{t('panel.properties')}</span>
        <button
          ref={closeRef}
          onClick={close}
          className="properties-close hover:bg-office-ribbon-hover rounded transition-colors"
          title={t('action.close')}
          aria-label={t('action.close')}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
      <div className="p-3 flex flex-col gap-4 flex-1 overflow-y-auto min-h-0 overscroll-contain">
        {children}
      </div>
    </>
  );

  return (
    <>
      {(narrow || !open) && (
        <div className="bg-white border-l border-office-border flex flex-col h-full flex-shrink-0">
          <button
            ref={openerRef}
            onClick={() => setOpen(true)}
            className="p-2 min-h-11 hover:bg-office-ribbon-hover transition-colors"
            title={t('panel.properties')}
            aria-label={t('panel.properties')}
            aria-expanded={open}
            aria-controls={panelId}
            aria-haspopup={narrow ? 'dialog' : undefined}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        </div>
      )}
      {narrow ? (
        <dialog
          ref={dialogRef}
          id={panelId}
          className="properties-drawer"
          aria-labelledby={titleId}
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
          onKeyDown={(event) => {
            // Document-level canvas shortcuts must not edit the board behind us.
            event.stopPropagation();
            if (event.key !== 'Tab') return;
            const targets = Array.from(
              event.currentTarget.querySelectorAll<HTMLElement>(
                'button, input, select, textarea, a[href], [tabindex]'
              )
            ).filter(
              (el) =>
                el.tabIndex >= 0 &&
                !el.matches(':disabled') &&
                el.getClientRects().length > 0
            );
            const first = targets[0],
              last = targets[targets.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }}
          onPointerDown={(event) => {
            backdropStart.current = event.target === event.currentTarget;
          }}
          onClick={(event) => {
            if (backdropStart.current && event.target === event.currentTarget)
              close();
            backdropStart.current = false;
          }}
        >
          {open && (
            <div className="flex flex-col h-full min-h-0">{content}</div>
          )}
        </dialog>
      ) : (
        open && (
          <aside
            id={panelId}
            aria-labelledby={titleId}
            className="properties-sidebar w-56 flex-shrink-0 bg-white border-l border-office-border flex flex-col h-full"
          >
            {content}
          </aside>
        )
      )}
    </>
  );
}
