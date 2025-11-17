import React from 'react';
import { FormField, FieldType } from '../types';

interface FormRendererProps {
  fields: FormField[];
  values: Record<number, any>;
  onChange: (fieldId: number, value: any) => void;
  readonly?: boolean;
}

/**
 * FormRenderer - Dynamically renders form fields based on field definitions
 *
 * Supports field types: TEXT, NUMBER, DATE, CHECKBOX, ATTACHMENT
 * Note: ATTACHMENT type shows info message (file uploads not supported in POC)
 * Handles validation highlighting for required fields
 *
 * @param fields - Array of FormField definitions to render
 * @param values - Current form values (keyed by field ID)
 * @param onChange - Callback when field value changes
 * @param readonly - If true, render fields as read-only
 */
const FormRenderer: React.FC<FormRendererProps> = ({
  fields,
  values,
  onChange,
  readonly = false
}) => {
  // Sort fields by order
  const sortedFields = [...(fields || [])].sort((a, b) => a.order - b.order);

  // Check if a required field is empty
  const isFieldEmpty = (fieldId: number, fieldType: FieldType): boolean => {
    const value = values[fieldId];
    if (fieldType === FieldType.CHECKBOX) {
      return false; // Checkbox is never "empty"
    }
    return value === undefined || value === null || value === '';
  };

  // Render appropriate input based on field type
  const renderField = (field: FormField) => {
    const value = values[field.id];
    const isEmpty = field.is_required && isFieldEmpty(field.id, field.field_type);
    const inputClassName = `input input-bordered w-full bg-white ${isEmpty ? 'input-error' : ''}`;

    switch (field.field_type) {
      case FieldType.TEXT:
        return (
          <input
            type="text"
            className={inputClassName}
            value={value || ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.is_required ? 'Required' : 'Optional'}
            disabled={readonly}
          />
        );

      case FieldType.NUMBER:
        return (
          <input
            type="number"
            className={inputClassName}
            value={value || ''}
            onChange={(e) => onChange(field.id, e.target.value ? Number(e.target.value) : '')}
            placeholder={field.is_required ? 'Required' : 'Optional'}
            disabled={readonly}
          />
        );

      case FieldType.DATE:
        return (
          <input
            type="date"
            className={inputClassName}
            value={value || ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            disabled={readonly}
          />
        );

      case FieldType.CHECKBOX:
        return (
          <input
            type="checkbox"
            className="checkbox checkbox-primary"
            checked={value || false}
            onChange={(e) => onChange(field.id, e.target.checked)}
            disabled={readonly}
          />
        );

      case FieldType.ATTACHMENT:
        // POC: File uploads not supported yet
        return (
          <div className="alert alert-info">
            <span>File uploads not supported in POC</span>
          </div>
        );

      default:
        // Fallback to textarea for any unknown types
        return (
          <textarea
            className={`textarea textarea-bordered w-full bg-white ${isEmpty ? 'textarea-error' : ''}`}
            value={value || ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.is_required ? 'Required' : 'Optional'}
            rows={3}
            disabled={readonly}
          />
        );
    }
  };

  if (!fields || fields.length === 0) {
    return (
      <div className="text-gray-500 italic">
        No form fields defined for this stage
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedFields.map((field) => (
        <div key={field.id} className="form-control">
          <label className="label">
            <span className="label-text font-medium">
              {field.label}
              {field.is_required && <span className="text-error ml-1">*</span>}
            </span>
          </label>
          {renderField(field)}
          {field.is_required && isFieldEmpty(field.id, field.field_type) && (
            <label className="label">
              <span className="label-text-alt text-error">This field is required</span>
            </label>
          )}
        </div>
      ))}
    </div>
  );
};

export default FormRenderer;
