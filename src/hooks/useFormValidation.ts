/**
 * useFormValidation Hook
 * Provides form-level validation with security checks
 */

import { useState, useCallback } from "react";
import {
  validateUserInput,
  performSecurityCheck,
  sanitizeFormData,
  ValidationResult,
} from "@/lib/inputValidator";

export interface FormFieldValidation {
  value: string;
  isValid: boolean;
  errors: string[];
  isDirty: boolean;
}

export interface FormValidationState {
  [fieldName: string]: FormFieldValidation;
}

interface UseFormValidationOptions {
  onValidationChange?: (isFormValid: boolean) => void;
  sanitizeOnChange?: boolean;
}

export const useFormValidation = (
  fieldTypes: Record<
    string,
    "name" | "email" | "phone" | "handle" | "bio" | "url" | "slug"
  >,
  options: UseFormValidationOptions = {},
) => {
  const [validation, setValidation] = useState<FormValidationState>({});
  const [securityThreats, setSecurityThreats] = useState<
    Record<string, string[]>
  >({});

  const validateField = useCallback(
    (fieldName: string, value: string) => {
      const fieldType = fieldTypes[fieldName];

      if (!fieldType) {
        // If no specific field type, just sanitize
        return {
          isValid: true,
          errors: [],
          sanitized: value.trim(),
        };
      }

      // Perform security check
      const securityCheck = performSecurityCheck(value, fieldType);
      setSecurityThreats((prev) => ({
        ...prev,
        [fieldName]: securityCheck.threats,
      }));

      // Validate using field-specific validator
      const validationResult = validateUserInput(fieldType, value);

      return {
        isValid: securityCheck.safe && validationResult.isValid,
        errors: [...securityCheck.threats, ...validationResult.errors],
        sanitized: validationResult.sanitized,
      };
    },
    [fieldTypes],
  );

  const updateField = useCallback(
    (fieldName: string, value: string) => {
      const result = validateField(fieldName, value);

      setValidation((prev) => ({
        ...prev,
        [fieldName]: {
          value: options.sanitizeOnChange ? result.sanitized : value,
          isValid: result.isValid,
          errors: result.errors,
          isDirty: true,
        },
      }));

      // Notify about overall form validity
      if (options.onValidationChange) {
        const isFormValid = Object.values(validation).every((f) => f.isValid);
        options.onValidationChange(isFormValid);
      }
    },
    [validateField, validation, options],
  );

  const validateForm = useCallback(
    (formData: Record<string, string>): boolean => {
      const newValidation: FormValidationState = {};
      let isValid = true;

      for (const [fieldName, value] of Object.entries(formData)) {
        const result = validateField(fieldName, value);
        newValidation[fieldName] = {
          value: options.sanitizeOnChange ? result.sanitized : value,
          isValid: result.isValid,
          errors: result.errors,
          isDirty: true,
        };

        if (!result.isValid) {
          isValid = false;
        }
      }

      setValidation(newValidation);

      if (options.onValidationChange) {
        options.onValidationChange(isValid);
      }

      return isValid;
    },
    [validateField, options],
  );

  const getSanitizedFormData = useCallback(
    (formData: Record<string, any>): Record<string, any> => {
      return sanitizeFormData(formData);
    },
    [],
  );

  const getFieldError = useCallback(
    (fieldName: string): string | null => {
      const field = validation[fieldName];
      return field?.errors?.[0] || null;
    },
    [validation],
  );

  const getFieldErrors = useCallback(
    (fieldName: string): string[] => {
      return validation[fieldName]?.errors || [];
    },
    [validation],
  );

  const isFieldValid = useCallback(
    (fieldName: string): boolean => {
      return validation[fieldName]?.isValid ?? true;
    },
    [validation],
  );

  const isFieldDirty = useCallback(
    (fieldName: string): boolean => {
      return validation[fieldName]?.isDirty ?? false;
    },
    [validation],
  );

  const resetField = useCallback((fieldName: string) => {
    setValidation((prev) => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
    setSecurityThreats((prev) => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }, []);

  const resetForm = useCallback(() => {
    setValidation({});
    setSecurityThreats({});
  }, []);

  return {
    validation,
    securityThreats,
    updateField,
    validateField,
    validateForm,
    getSanitizedFormData,
    getFieldError,
    getFieldErrors,
    isFieldValid,
    isFieldDirty,
    resetField,
    resetForm,
  };
};

export default useFormValidation;
