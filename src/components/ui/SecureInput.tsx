/**
 * SecureInput Component
 * Form input with built-in validation and security checks
 */

import React, { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { performSecurityCheck, validateUserInput } from "@/lib/inputValidator";

interface SecureInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange"
> {
  label?: string;
  fieldType?: "name" | "email" | "phone" | "handle" | "bio" | "url" | "slug";
  value: string;
  onChange: (value: string, isValid: boolean) => void;
  showSecurityStatus?: boolean;
  sanitizeOnChange?: boolean;
  errorMessage?: string;
  successMessage?: string;
  helperText?: string;
}

const SecureInput = React.forwardRef<HTMLInputElement, SecureInputProps>(
  (
    {
      label,
      fieldType = "name",
      value,
      onChange,
      showSecurityStatus = true,
      sanitizeOnChange = true,
      errorMessage: customErrorMessage,
      successMessage,
      helperText,
      className = "",
      ...props
    },
    ref,
  ) => {
    const [errors, setErrors] = useState<string[]>([]);
    const [threats, setThreats] = useState<string[]>([]);
    const [isDirty, setIsDirty] = useState(false);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        let newValue = e.target.value;

        // Perform security check
        const securityCheck = performSecurityCheck(newValue, fieldType);
        setThreats(securityCheck.threats);

        // Validate field
        const validation = validateUserInput(fieldType, newValue);
        setErrors(validation.errors);

        // Sanitize if enabled
        if (sanitizeOnChange) {
          newValue = validation.sanitized;
        }

        setIsDirty(true);
        onChange(newValue, securityCheck.safe && validation.isValid);
      },
      [fieldType, onChange, sanitizeOnChange],
    );

    const isValid = errors.length === 0 && threats.length === 0;
    const showError = isDirty && (errors.length > 0 || threats.length > 0);
    const showSuccess = isDirty && isValid && value.length > 0;

    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-foreground">
            {label}
          </label>
        )}

        <div className="relative">
          <Input
            ref={ref}
            value={value}
            onChange={handleChange}
            className={`${className} ${
              showError
                ? "border-destructive focus:ring-destructive/50 bg-destructive/5"
                : showSuccess
                  ? "border-green-500 focus:ring-green-500/50"
                  : ""
            }`}
            {...props}
          />

          {/* Status Icons */}
          {showSecurityStatus && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              {showError && (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )}
              {showSuccess && (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              )}
            </div>
          )}
        </div>

        {/* Error Messages */}
        {showError && (
          <div className="space-y-1">
            {threats.length > 0 && (
              <div className="flex items-start gap-2 p-2 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Security Warning</p>
                  <ul className="list-disc list-inside mt-1">
                    {threats.map((threat, idx) => (
                      <li key={idx}>{threat}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {errors.length > 0 && (
              <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <ul className="list-disc list-inside">
                    {errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Success Message */}
        {showSuccess && successMessage && (
          <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
            <CheckCircle2 className="w-4 h-4" />
            {successMessage}
          </div>
        )}

        {/* Helper Text */}
        {helperText && !showError && (
          <p className="text-xs text-muted-foreground">{helperText}</p>
        )}

        {/* Custom Error Message */}
        {customErrorMessage && showError && (
          <p className="text-xs text-destructive">{customErrorMessage}</p>
        )}
      </div>
    );
  },
);

SecureInput.displayName = "SecureInput";

export default SecureInput;
