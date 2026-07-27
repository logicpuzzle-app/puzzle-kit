import React from 'react';
import { useTranslation } from 'react-i18next';

type ConstraintPresetOption = {
  id: string;
  label: string;
};

type ConstraintPresetSelectProps = {
  currentSchemaId: string | null;
  presetOptions: ConstraintPresetOption[];
  onChange: (schemaId: string | null) => void;
  className?: string;
  selectClassName?: string;
};

export const ConstraintPresetSelect: React.FC<ConstraintPresetSelectProps> = ({
  currentSchemaId,
  presetOptions,
  onChange,
  className,
  selectClassName,
}) => {
  const { t } = useTranslation();
  const value = currentSchemaId && currentSchemaId !== '__custom__' ? currentSchemaId : '';
  const selectClasses = selectClassName ?? 'select-office text-xs';
  const containerClassName = `flex items-center gap-2 ${className ?? ''}`.trim();

  return (
    <div className={containerClassName}>
      <span className="text-xs text-office-text-secondary">{t('constraint.preset')}</span>
      <select
        className={selectClasses}
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value;
          onChange(nextValue ? nextValue : null);
        }}
      >
        <option value="">{t('constraint.noPreset')}</option>
        {presetOptions.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.label}
          </option>
        ))}
      </select>
    </div>
  );
};
