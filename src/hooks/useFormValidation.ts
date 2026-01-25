import { useState, useCallback, useMemo } from "react";

type ValidationRule<T> = {
  validate: (value: T) => boolean;
  message: string;
};

type FieldValidation<T> = ValidationRule<T>[];

type FormValidationRules<T extends Record<string, unknown>> = {
  [K in keyof T]?: FieldValidation<T[K]>;
};

type FormErrors<T extends Record<string, unknown>> = {
  [K in keyof T]?: string;
};

type TouchedFields<T extends Record<string, unknown>> = {
  [K in keyof T]?: boolean;
};

interface FormValidationResult<T extends Record<string, unknown>> {
  // Error state
  errors: FormErrors<T>;
  hasErrors: boolean;

  // Touched state
  touched: TouchedFields<T>;

  // Validation functions
  validateField: (field: keyof T, value: T[keyof T]) => string | undefined;
  validateForm: (values: T) => boolean;

  // Touch management
  setFieldTouched: (field: keyof T, isTouched?: boolean) => void;
  setAllTouched: () => void;

  // Reset
  reset: () => void;

  // Helper to check if field has error and is touched
  getFieldError: (field: keyof T) => string | undefined;
}

/**
 * Hook for form validation with field-level and form-level validation.
 * Tracks touched state to show errors only after user interaction.
 *
 * @example
 * interface LoginForm {
 *   email: string;
 *   password: string;
 * }
 *
 * const validation = useFormValidation<LoginForm>({
 *   email: [
 *     { validate: (v) => v.length > 0, message: "Email is required" },
 *     { validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), message: "Invalid email" },
 *   ],
 *   password: [
 *     { validate: (v) => v.length > 0, message: "Password is required" },
 *     { validate: (v) => v.length >= 8, message: "Password must be at least 8 characters" },
 *   ],
 * });
 *
 * const handleSubmit = (values: LoginForm) => {
 *   validation.setAllTouched();
 *   if (!validation.validateForm(values)) {
 *     return;
 *   }
 *   // Submit form
 * };
 *
 * // In render
 * <Input
 *   value={email}
 *   onChange={(e) => {
 *     setEmail(e.target.value);
 *     validation.validateField("email", e.target.value);
 *   }}
 *   onBlur={() => validation.setFieldTouched("email")}
 *   error={validation.getFieldError("email")}
 * />
 */
export function useFormValidation<T extends Record<string, unknown>>(
  rules: FormValidationRules<T>
): FormValidationResult<T> {
  const [errors, setErrors] = useState<FormErrors<T>>({});
  const [touched, setTouched] = useState<TouchedFields<T>>({});

  const validateField = useCallback(
    (field: keyof T, value: T[keyof T]): string | undefined => {
      const fieldRules = rules[field];
      if (!fieldRules) return undefined;

      for (const rule of fieldRules) {
        if (!rule.validate(value)) {
          setErrors((prev) => ({ ...prev, [field]: rule.message }));
          return rule.message;
        }
      }

      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
      return undefined;
    },
    [rules]
  );

  const validateForm = useCallback(
    (values: T): boolean => {
      const newErrors: FormErrors<T> = {};
      let isValid = true;

      for (const field in rules) {
        const fieldRules = rules[field];
        if (!fieldRules) continue;

        const value = values[field];
        for (const rule of fieldRules) {
          if (!rule.validate(value)) {
            newErrors[field] = rule.message;
            isValid = false;
            break;
          }
        }
      }

      setErrors(newErrors);
      return isValid;
    },
    [rules]
  );

  const setFieldTouched = useCallback((field: keyof T, isTouched = true) => {
    setTouched((prev) => ({ ...prev, [field]: isTouched }));
  }, []);

  const setAllTouched = useCallback(() => {
    const allTouched: TouchedFields<T> = {};
    for (const field in rules) {
      allTouched[field] = true;
    }
    setTouched(allTouched);
  }, [rules]);

  const reset = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  const getFieldError = useCallback(
    (field: keyof T): string | undefined => {
      return touched[field] ? errors[field] : undefined;
    },
    [touched, errors]
  );

  const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);

  return {
    errors,
    hasErrors,
    touched,
    validateField,
    validateForm,
    setFieldTouched,
    setAllTouched,
    reset,
    getFieldError,
  };
}
