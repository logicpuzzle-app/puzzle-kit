/**
 * Modal Store - Zustand-based modal state management
 *
 * Manages confirm dialogs, alerts, and other modal states.
 */

import { create } from 'zustand';

// ========================================
// Types
// ========================================

export interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: (() => void) | null;
  onCancel: (() => void) | null;
}

export interface AlertModalState {
  isOpen: boolean;
  title: string;
  message: string;
  variant?: 'success' | 'error' | 'warning' | 'info';
  closeLabel?: string;
  onClose: (() => void) | null;
}

export interface ShortcutsModalState {
  isOpen: boolean;
}

export interface ModalStore {
  // Confirm modal
  confirmModal: ConfirmModalState;
  showConfirm: (options: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm?: () => void;
    onCancel?: () => void;
  }) => void;
  closeConfirm: () => void;
  handleConfirm: () => void;
  handleCancel: () => void;

  // Alert modal
  alertModal: AlertModalState;
  showAlert: (options: {
    title: string;
    message: string;
    variant?: 'success' | 'error' | 'warning' | 'info';
    closeLabel?: string;
    onClose?: () => void;
  }) => void;
  closeAlert: () => void;

  // Shortcuts modal
  shortcutsModal: ShortcutsModalState;
  showShortcuts: () => void;
  closeShortcuts: () => void;
}

// ========================================
// Initial States
// ========================================

const initialConfirmModal: ConfirmModalState = {
  isOpen: false,
  title: '',
  message: '',
  confirmLabel: undefined,
  cancelLabel: undefined,
  variant: 'info',
  onConfirm: null,
  onCancel: null,
};

const initialAlertModal: AlertModalState = {
  isOpen: false,
  title: '',
  message: '',
  variant: 'info',
  closeLabel: undefined,
  onClose: null,
};

const initialShortcutsModal: ShortcutsModalState = {
  isOpen: false,
};

// ========================================
// Store
// ========================================

export const useModalStore = create<ModalStore>((set, get) => ({
  // Confirm modal state
  confirmModal: initialConfirmModal,

  showConfirm: (options) => {
    set({
      confirmModal: {
        isOpen: true,
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel,
        cancelLabel: options.cancelLabel,
        variant: options.variant || 'info',
        onConfirm: options.onConfirm || null,
        onCancel: options.onCancel || null,
      },
    });
  },

  closeConfirm: () => {
    set({ confirmModal: initialConfirmModal });
  },

  handleConfirm: () => {
    const { confirmModal, closeConfirm } = get();
    if (confirmModal.onConfirm) {
      confirmModal.onConfirm();
    }
    closeConfirm();
  },

  handleCancel: () => {
    const { confirmModal, closeConfirm } = get();
    if (confirmModal.onCancel) {
      confirmModal.onCancel();
    }
    closeConfirm();
  },

  // Alert modal state
  alertModal: initialAlertModal,

  showAlert: (options) => {
    set({
      alertModal: {
        isOpen: true,
        title: options.title,
        message: options.message,
        variant: options.variant || 'info',
        closeLabel: options.closeLabel,
        onClose: options.onClose || null,
      },
    });
  },

  closeAlert: () => {
    const { alertModal } = get();
    if (alertModal.onClose) {
      alertModal.onClose();
    }
    set({ alertModal: initialAlertModal });
  },

  // Shortcuts modal state
  shortcutsModal: initialShortcutsModal,

  showShortcuts: () => {
    set({ shortcutsModal: { isOpen: true } });
  },

  closeShortcuts: () => {
    set({ shortcutsModal: initialShortcutsModal });
  },
}));
