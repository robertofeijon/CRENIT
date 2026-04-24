/**
 * Frontend Form Validation
 * Helper functions for form validation on the client side
 */

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return "Email is required";
  if (!emailRegex.test(email)) return "Invalid email address";
  return null;
};

export const validatePassword = (password) => {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Must contain at least one uppercase letter";
  if (!/[a-z]/.test(password)) return "Must contain at least one lowercase letter";
  if (!/[0-9]/.test(password)) return "Must contain at least one number";
  return null;
};

export const validateName = (name) => {
  if (!name) return "Name is required";
  if (name.trim().length < 2) return "Name must be at least 2 characters";
  return null;
};

export const validatePhone = (phone) => {
  const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
  if (phone && !phoneRegex.test(phone)) return "Invalid phone number";
  return null;
};

export const validateAmount = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num)) return "Amount must be a number";
  if (num < 0) return "Amount cannot be negative";
  if (num > 999999999) return "Amount is too large";
  return null;
};

export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === "string" && !value.trim())) {
    return `${fieldName} is required`;
  }
  return null;
};

export const validateMinLength = (value, min, fieldName) => {
  if (value && value.length < min) {
    return `${fieldName} must be at least ${min} characters`;
  }
  return null;
};

export const validateMaxLength = (value, max, fieldName) => {
  if (value && value.length > max) {
    return `${fieldName} must be less than ${max} characters`;
  }
  return null;
};

export const validateRange = (value, min, max, fieldName) => {
  const num = Number(value);
  if (isNaN(num)) return `${fieldName} must be a number`;
  if (num < min) return `${fieldName} must be at least ${min}`;
  if (num > max) return `${fieldName} must be at most ${max}`;
  return null;
};

export const validatePasswordMatch = (password, confirmPassword) => {
  if (password !== confirmPassword) return "Passwords do not match";
  return null;
};

/**
 * Validates an entire form object
 * @param {Object} formData - Form field values
 * @param {Object} validators - Object mapping field names to validation functions
 * @returns {Object} Object with field names as keys and error messages as values
 */
export const validateForm = (formData, validators) => {
  const errors = {};

  Object.entries(validators).forEach(([fieldName, validator]) => {
    const value = formData[fieldName];
    const error = validator(value, formData);
    if (error) {
      errors[fieldName] = error;
    }
  });

  return errors;
};

/**
 * Common validation rules for forms
 */
export const ValidationRules = {
  email: {
    validate: (value) => validateEmail(value),
    initialError: null
  },
  password: {
    validate: (value) => validatePassword(value),
    initialError: null
  },
  name: {
    validate: (value) => validateName(value),
    initialError: null
  },
  phone: {
    validate: (value) => validatePhone(value),
    initialError: null
  },
  amount: {
    validate: (value) => validateAmount(value),
    initialError: null
  }
};

/**
 * Hook for form validation
 * Usage: const { errors, validateField, validateForm } = useFormValidation({...})
 */
export const useFormValidation = (validators) => {
  const [errors, setErrors] = React.useState({});

  const validateField = (fieldName, value) => {
    if (!validators[fieldName]) return;
    const error = validators[fieldName](value);
    setErrors((prev) => ({
      ...prev,
      [fieldName]: error
    }));
  };

  const validateAllFields = (formData) => {
    const newErrors = {};
    Object.entries(validators).forEach(([fieldName, validator]) => {
      const error = validator(formData[fieldName]);
      if (error) newErrors[fieldName] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearErrors = () => setErrors({});

  return {
    errors,
    validateField,
    validateAllFields,
    clearErrors,
    hasErrors: Object.keys(errors).length > 0
  };
};
