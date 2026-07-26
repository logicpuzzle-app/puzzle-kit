import React from 'react';
import { AlertModal } from './AlertModal';
import { ConfirmModal } from './ConfirmModal';
import { ShortcutsModal } from './ShortcutsModal';
import { UrlImportModal } from './UrlImportModal';

export const BaseModals: React.FC = () => (
  <>
    <ConfirmModal />
    <AlertModal />
    <ShortcutsModal />
    <UrlImportModal />
  </>
);
