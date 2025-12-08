/**
 * Constraint properties panel - preset selection and rule display
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../../store/puzzleStore';
import { constraintCatalog } from '../../../constraints';
import { CONSTRAINT_ICONS } from '../../toolbar/RibbonIcons';
import { NumberInputPanel } from './NumberInputPanel';
import { ArrowDirectionSettings } from './ArrowDirectionSettings';
import { TestCasePanel } from './TestCasePanel';

export const ConstraintPropertiesPanel: React.FC = () => {
  const { t } = useTranslation();
  const {
    currentSchemaId,
    setCurrentSchemaId,
    constraintSubCategory,
    currentInputMode,
  } = usePuzzleStore();

  const currentSchema = currentSchemaId ? constraintCatalog.getSchema(currentSchemaId) : null;

  return (
    <div className="space-y-3">
      {/* Common/Preset tab: Preset tree list (for selecting puzzle type) */}
      {constraintSubCategory === 'common' && (
        <div>
          <div className="text-xs font-medium text-office-text-secondary mb-2">
            {t('constraint.preset')}
          </div>
          <div className="border border-office-border rounded-sm bg-white max-h-48 overflow-y-auto">
            {/* None option (default) - uses blue accent when selected */}
            <button
              className={`w-full text-left px-2 py-1.5 text-xs flex items-center gap-2 transition-colors border-b border-office-border ${
                currentSchemaId === null
                  ? 'bg-office-accent/10 text-office-accent'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => setCurrentSchemaId(null)}
            >
              <span className={`text-sm ${currentSchemaId === null ? 'text-office-accent' : 'text-gray-400'}`}>○</span>
              <span>{t('constraint.none')}</span>
            </button>

            {/* Puzzle presets - uses purple when selected */}
            {constraintCatalog.getPuzzleIds().map((pid) => {
              const schema = constraintCatalog.getSchema(pid);
              if (!schema) return null;
              const isSelected = currentSchemaId === pid;
              return (
                <button
                  key={pid}
                  className={`w-full text-left px-2 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                    isSelected
                      ? 'bg-purple-100 text-purple-800'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setCurrentSchemaId(pid)}
                >
                  <CONSTRAINT_ICONS.preset size={12} className={isSelected ? 'text-purple-600' : 'text-gray-400'} />
                  <span>{t(schema.nameKey)}</span>
                </button>
              );
            })}

            {/* Custom option - disabled for now */}
            <button
              className="w-full text-left px-2 py-1.5 text-xs flex items-center gap-2 transition-colors border-t border-office-border bg-gray-50 text-gray-400 cursor-not-allowed"
              disabled
              title={t('constraint.customDisabled')}
            >
              <CONSTRAINT_ICONS.constraint size={12} className="text-gray-300" />
              <span>{t('constraint.custom')}</span>
            </button>
          </div>

          {/* Notes for selected preset */}
          {currentSchema && currentSchema.notes && currentSchema.notes.length > 0 && (
            <div className="mt-2 text-xs text-gray-500 p-2 bg-gray-50 rounded-sm">
              {currentSchema.notes.map((note, i) => (
                <div key={i}>• {note}</div>
              ))}
            </div>
          )}

          {/* Test cases for selected preset */}
          {currentSchemaId && currentSchemaId !== '__custom__' && (
            <div className="mt-3">
              <TestCasePanel />
            </div>
          )}
        </div>
      )}

      {/* Edit tab: Show problem input rules (editor constraints) */}
      {constraintSubCategory === 'edit' && (
        <RulesSection
          rules={currentSchema?.problem || []}
          currentSchemaId={currentSchemaId}
          currentInputMode={currentInputMode}
        />
      )}

      {/* Play tab: Show answer input rules */}
      {constraintSubCategory === 'play' && (
        <RulesSection
          rules={currentSchema?.answer || []}
          currentSchemaId={currentSchemaId}
          currentInputMode={currentInputMode}
        />
      )}

      {/* Check tab: Show validation rules */}
      {constraintSubCategory === 'check' && (
        <ValidationSection
          rules={currentSchema?.validation || []}
          currentSchemaId={currentSchemaId}
        />
      )}
    </div>
  );
};

interface RulesSectionProps {
  rules: Array<{ id: string; title: string; description: string }>;
  currentSchemaId: string | null;
  currentInputMode: string;
}

const RulesSection: React.FC<RulesSectionProps> = ({ rules, currentSchemaId, currentInputMode }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      {currentSchemaId === null && (
        <div className="text-xs text-office-text-secondary p-2 bg-gray-50 rounded-sm border border-office-border">
          {t('constraint.noneDesc')}
        </div>
      )}
      {currentSchemaId === '__custom__' && (
        <div className="text-xs text-office-text-secondary p-2 bg-gray-50 rounded-sm border border-office-border">
          {t('constraint.customDesc')}
        </div>
      )}
      {rules.length > 0 && (
        <div className="space-y-1.5">
          {rules.map((rule) => (
            <div key={rule.id} className="p-2 bg-gray-50 rounded-sm border border-office-border">
              <div className="font-medium text-xs text-office-text">{t(rule.title)}</div>
              <div className="text-xs text-office-text-secondary mt-0.5">{t(rule.description)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Number input panel - show when in number mode */}
      {currentSchemaId && (currentInputMode === 'number' || currentInputMode === 'number-') && (
        <NumberInputPanel />
      )}

      {/* Arrow direction panel - show when in direc mode */}
      {currentSchemaId && currentInputMode === 'direc' && (
        <ArrowDirectionSettings />
      )}

      {/* Add button */}
      <button
        disabled
        className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs border border-dashed border-office-border rounded-sm text-office-text-secondary bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        title={t('constraint.addRule', 'Add rule (coming soon)')}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span>{t('action.add', 'Add')}</span>
      </button>
    </div>
  );
};

interface ValidationSectionProps {
  rules: Array<{ id: string; title: string; description: string; defaultOn?: boolean }>;
  currentSchemaId: string | null;
}

const ValidationSection: React.FC<ValidationSectionProps> = ({ rules, currentSchemaId }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      {currentSchemaId === null && (
        <div className="text-xs text-office-text-secondary p-2 bg-gray-50 rounded-sm border border-office-border">
          {t('constraint.noneDesc')}
        </div>
      )}
      {currentSchemaId === '__custom__' && (
        <div className="text-xs text-office-text-secondary p-2 bg-gray-50 rounded-sm border border-office-border">
          {t('constraint.customDesc')}
        </div>
      )}
      {rules.length > 0 && (
        <div className="space-y-1.5">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="p-2 bg-gray-50 rounded-sm border border-office-border"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-xs text-office-text">{t(rule.title)}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  rule.defaultOn !== false
                    ? 'bg-office-accent/10 text-office-accent'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {rule.defaultOn !== false ? t('constraint.enabled') : t('constraint.disabled')}
                </span>
              </div>
              <div className="text-xs text-office-text-secondary mt-0.5">
                {t(rule.description)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add button */}
      <button
        disabled
        className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs border border-dashed border-office-border rounded-sm text-office-text-secondary bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        title={t('constraint.addRule', 'Add rule (coming soon)')}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span>{t('action.add', 'Add')}</span>
      </button>
    </div>
  );
};
