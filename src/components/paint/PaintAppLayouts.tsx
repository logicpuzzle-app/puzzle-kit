import React from 'react';
import { PaintMenuBar, type PaintMenuBarProps } from './PaintMenuBar';
import { WorkspaceLayout } from '../layouts/WorkspaceLayout';
import { PaintCanvasArea, type PaintCanvasAreaProps } from './PaintCanvasArea';
import {
  PaintPrimaryToolbar,
  PaintMediaControls,
  PaintTrialControls,
  PaintAdjustModeControls,
  PaintHistoryControls,
  type PaintPrimaryToolbarProps,
  type PaintMediaControlsProps,
  type PaintTrialControlsProps,
  type PaintAdjustModeControlsProps,
  type PaintHistoryControlsProps,
} from './PaintPrimaryToolbar';
import {
  PaintImageAdjustToolbar,
  PaintGridSettingsToolbar,
  type PaintImageAdjustToolbarProps,
  type PaintGridSettingsToolbarProps,
} from './PaintSecondaryToolbars';
import { PaintGenreToolbarDesktop, PaintGenreToolbarMobile, type PaintGenreToolbarProps } from './PaintGenreToolbar';

export type PaintAppDesktopLayoutProps = {
  isExpanded: boolean;
  menuBarProps: PaintMenuBarProps;
  primaryToolbarProps: PaintPrimaryToolbarProps;
  imageAdjustToolbarProps?: PaintImageAdjustToolbarProps | null;
  gridSettingsToolbarProps?: PaintGridSettingsToolbarProps | null;
  canvasAreaProps: PaintCanvasAreaProps;
  genreToolbarProps: PaintGenreToolbarProps;
};

export const PaintAppDesktopLayout: React.FC<PaintAppDesktopLayoutProps> = ({
  isExpanded,
  menuBarProps,
  primaryToolbarProps,
  imageAdjustToolbarProps,
  gridSettingsToolbarProps,
  canvasAreaProps,
  genreToolbarProps,
}) => (
  <div
    className={
      isExpanded
        ? 'fixed inset-0 z-40 w-full h-full px-0 py-0'
        : 'mx-auto w-full max-w-[960px] px-2 sm:px-4 py-3 sm:py-6'
    }
  >
    <div
      className={
        isExpanded
          ? 'flex flex-col w-full h-full bg-white border border-office-border rounded-none shadow-none overflow-hidden'
          : 'flex flex-col min-h-[420px] sm:min-h-[520px] h-[70vh] max-h-[820px] bg-white border border-office-border rounded-lg shadow-lg overflow-hidden'
      }
    >
      <WorkspaceLayout
        maxWidthClassName="max-w-none"
        centered={false}
        header={(
          <header className="flex flex-col border-b border-office-border bg-white">
            <PaintMenuBar {...menuBarProps} />
            <PaintPrimaryToolbar {...primaryToolbarProps} />
            {imageAdjustToolbarProps && <PaintImageAdjustToolbar {...imageAdjustToolbarProps} />}
            {gridSettingsToolbarProps && <PaintGridSettingsToolbar {...gridSettingsToolbarProps} />}
          </header>
        )}
        footer={<PaintGenreToolbarDesktop {...genreToolbarProps} />}
      >
        <PaintCanvasArea {...canvasAreaProps} />
      </WorkspaceLayout>
    </div>
  </div>
);

export type PaintAppMobileLayoutProps = {
  isExpanded: boolean;
  menuBarProps: PaintMenuBarProps;
  mediaControlsProps: PaintMediaControlsProps;
  trialControlsProps: PaintTrialControlsProps;
  adjustModeControlsProps: PaintAdjustModeControlsProps;
  historyControlsProps: PaintHistoryControlsProps;
  imageAdjustToolbarProps?: PaintImageAdjustToolbarProps | null;
  gridSettingsToolbarProps?: PaintGridSettingsToolbarProps | null;
  canvasAreaProps: PaintCanvasAreaProps;
  genreToolbarProps: PaintGenreToolbarProps;
};

export const PaintAppMobileLayout: React.FC<PaintAppMobileLayoutProps> = ({
  isExpanded,
  menuBarProps,
  mediaControlsProps,
  trialControlsProps,
  adjustModeControlsProps,
  historyControlsProps,
  imageAdjustToolbarProps,
  gridSettingsToolbarProps,
  canvasAreaProps,
  genreToolbarProps,
}) => (
  <div
    className={
      isExpanded
        ? 'fixed inset-0 z-40 w-full h-full px-0 py-0'
        : 'mx-auto w-full max-w-[960px] px-2 py-3'
    }
  >
    <div
      className={
        isExpanded
          ? 'flex flex-col w-full h-full bg-white border border-office-border rounded-none shadow-none overflow-hidden'
          : 'flex flex-col min-h-[520px] h-[78vh] bg-white border border-office-border rounded-lg shadow-lg overflow-hidden'
      }
    >
      <WorkspaceLayout
        maxWidthClassName="max-w-none"
        centered={false}
        header={(
          <header className="flex flex-col border-b border-office-border bg-white">
            <PaintMenuBar {...menuBarProps} />
            <div className="flex flex-wrap items-center gap-2 px-2 py-2 border-t border-office-border bg-white">
              <PaintMediaControls {...mediaControlsProps} />
              <PaintTrialControls {...trialControlsProps} />
            </div>
            {imageAdjustToolbarProps && <PaintImageAdjustToolbar {...imageAdjustToolbarProps} />}
            {gridSettingsToolbarProps && <PaintGridSettingsToolbar {...gridSettingsToolbarProps} />}
          </header>
        )}
        footer={(
          <>
            <div className="border-t border-office-border bg-white px-2 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <PaintAdjustModeControls {...adjustModeControlsProps} size="lg" />
                <PaintHistoryControls {...historyControlsProps} size="lg" />
              </div>
            </div>
            <PaintGenreToolbarMobile {...genreToolbarProps} />
          </>
        )}
      >
        <PaintCanvasArea {...canvasAreaProps} />
      </WorkspaceLayout>
    </div>
  </div>
);
