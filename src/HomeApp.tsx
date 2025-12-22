import React from 'react';
import { useTranslation } from 'react-i18next';
import './i18n';

type ModeCardProps = {
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
};

function ModeCard({ title, description, href, ctaLabel }: ModeCardProps) {
  return (
    <a
      href={href}
      className="panel group flex h-full flex-col gap-3 border border-office-border bg-white p-5 text-left transition-colors hover:border-office-accent focus:outline-none focus:ring-2 focus:ring-office-accent"
    >
      <div className="text-lg font-semibold text-office-text">{title}</div>
      <div className="text-sm text-office-text-secondary">{description}</div>
      <div className="mt-auto text-xs font-semibold uppercase tracking-wide text-office-accent">
        {ctaLabel}
      </div>
    </a>
  );
}

function HomeApp() {
  const { t, i18n } = useTranslation();
  const isJa = i18n.language?.toLowerCase().startsWith('ja');
  const isEn = i18n.language?.toLowerCase().startsWith('en');

  return (
    <div className="flex min-h-screen flex-col bg-office-bg font-segoe">
      <header className="border-b border-office-border bg-white">
        <div className="mx-auto w-full max-w-5xl px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="text-2xl font-semibold text-office-text">{t('app.title')}</div>
              <div className="text-sm text-office-text-secondary">{t('app.subtitle')}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`rounded-sm border px-2 py-1 text-xs font-semibold transition-colors ${
                  isJa
                    ? 'border-office-accent bg-office-accent text-white'
                    : 'border-office-border bg-white text-office-text hover:bg-office-ribbon-hover'
                }`}
                onClick={() => i18n.changeLanguage('ja')}
              >
                {t('language.ja')}
              </button>
              <button
                type="button"
                className={`rounded-sm border px-2 py-1 text-xs font-semibold transition-colors ${
                  isEn
                    ? 'border-office-accent bg-office-accent text-white'
                    : 'border-office-border bg-white text-office-text hover:bg-office-ribbon-hover'
                }`}
                onClick={() => i18n.changeLanguage('en')}
              >
                {t('language.en')}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-8">
          <div className="text-xs font-semibold uppercase tracking-wide text-office-text-secondary">
            {t('app.modeSelect')}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <ModeCard
              href="/play"
              title={t('app.mode.play.title')}
              description={t('app.mode.play.desc')}
              ctaLabel={t('app.mode.open')}
            />
            <ModeCard
              href="/edit"
              title={t('app.mode.edit.title')}
              description={t('app.mode.edit.desc')}
              ctaLabel={t('app.mode.open')}
            />
            <ModeCard
              href="/master"
              title={t('app.mode.master.title')}
              description={t('app.mode.master.desc')}
              ctaLabel={t('app.mode.open')}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default HomeApp;
