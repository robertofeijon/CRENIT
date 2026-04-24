import React from "react";
import "../components.css";

/**
 * FormInput - Reusable form input with consistent styling and validation
 */
export function FormInput({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  helperText,
  ...props
}) {
  return (
    <div className="form-group">
      {label && (
        <label htmlFor={name} className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`form-input ${error ? "form-input--error" : ""}`}
        {...props}
      />
      {error && <span className="form-error">{error}</span>}
      {helperText && !error && <span className="form-helper">{helperText}</span>}
    </div>
  );
}

/**
 * FormSelect - Reusable select dropdown with consistent styling
 */
export function FormSelect({
  label,
  name,
  value,
  onChange,
  options,
  placeholder,
  required = false,
  disabled = false,
  error,
  ...props
}) {
  return (
    <div className="form-group">
      {label && (
        <label htmlFor={name} className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`form-select ${error ? "form-select--error" : ""}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

/**
 * FormTextarea - Reusable textarea with consistent styling
 */
export function FormTextarea({
  label,
  name,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  rows = 4,
  error,
  maxLength,
  ...props
}) {
  return (
    <div className="form-group">
      {label && (
        <label htmlFor={name} className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        className={`form-textarea ${error ? "form-textarea--error" : ""}`}
        {...props}
      />
      {maxLength && (
        <span className="form-counter">
          {value.length}/{maxLength}
        </span>
      )}
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

/**
 * FormCheckbox - Reusable checkbox with label
 */
export function FormCheckbox({
  label,
  name,
  checked,
  onChange,
  disabled = false,
  error,
  ...props
}) {
  return (
    <div className="form-group form-group--checkbox">
      <input
        id={name}
        name={name}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="form-checkbox"
        {...props}
      />
      {label && (
        <label htmlFor={name} className="form-label form-label--checkbox">
          {label}
        </label>
      )}
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

/**
 * FormButton - Reusable button with loading state
 */
export function FormButton({
  type = "button",
  variant = "primary",
  size = "medium",
  onClick,
  disabled = false,
  loading = false,
  fullWidth = false,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`btn btn--${variant} btn--${size} ${fullWidth ? "btn--full" : ""}`}
      {...props}
    >
      {loading ? <span className="btn-loading">Loading...</span> : children}
    </button>
  );
}

/**
 * FormGroup - Container for grouping multiple form fields
 */
export function FormGroup({ title, children, error }) {
  return (
    <fieldset className="form-fieldset">
      {title && <legend className="form-legend">{title}</legend>}
      {error && <div className="form-group-error">{error}</div>}
      <div className="form-fieldset-content">{children}</div>
    </fieldset>
  );
}

/**
 * FormContainer - Main form wrapper with submit handling
 */
export function FormContainer({
  onSubmit,
  loading = false,
  error,
  success,
  children,
  className = ""
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`form ${className}`}>
      {error && <div className="form-alert form-alert--error">{error}</div>}
      {success && <div className="form-alert form-alert--success">{success}</div>}
      {children}
    </form>
  );
}
