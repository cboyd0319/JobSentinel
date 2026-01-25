import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFormValidation } from "./useFormValidation";

interface TestForm {
  email: string;
  password: string;
  age: number;
}

describe("useFormValidation", () => {
  const validationRules = {
    email: [
      { validate: (v: string) => v.length > 0, message: "Email is required" },
      { validate: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), message: "Invalid email format" },
    ],
    password: [
      { validate: (v: string) => v.length > 0, message: "Password is required" },
      { validate: (v: string) => v.length >= 8, message: "Password must be at least 8 characters" },
    ],
    age: [
      { validate: (v: number) => v >= 18, message: "Must be 18 or older" },
      { validate: (v: number) => v <= 120, message: "Invalid age" },
    ],
  };

  it("initializes with no errors and no touched fields", () => {
    const { result } = renderHook(() => useFormValidation<TestForm>(validationRules));

    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
    expect(result.current.hasErrors).toBe(false);
  });

  it("validates single field correctly", () => {
    const { result } = renderHook(() => useFormValidation<TestForm>(validationRules));

    let error: string | undefined;

    act(() => {
      error = result.current.validateField("email", "");
    });

    expect(error).toBe("Email is required");
    expect(result.current.errors.email).toBe("Email is required");
    expect(result.current.hasErrors).toBe(true);
  });

  it("validates field with multiple rules", () => {
    const { result } = renderHook(() => useFormValidation<TestForm>(validationRules));

    // First rule fails (empty)
    act(() => {
      result.current.validateField("email", "");
    });
    expect(result.current.errors.email).toBe("Email is required");

    // First rule passes, second fails (invalid format)
    act(() => {
      result.current.validateField("email", "invalid-email");
    });
    expect(result.current.errors.email).toBe("Invalid email format");

    // All rules pass
    act(() => {
      result.current.validateField("email", "test@example.com");
    });
    expect(result.current.errors.email).toBeUndefined();
  });

  it("clears field error when validation passes", () => {
    const { result } = renderHook(() => useFormValidation<TestForm>(validationRules));

    act(() => {
      result.current.validateField("password", "short");
    });
    expect(result.current.errors.password).toBe("Password must be at least 8 characters");

    act(() => {
      result.current.validateField("password", "validpassword");
    });
    expect(result.current.errors.password).toBeUndefined();
    expect(result.current.hasErrors).toBe(false);
  });

  it("validates entire form", () => {
    const { result } = renderHook(() => useFormValidation<TestForm>(validationRules));

    const invalidForm: TestForm = {
      email: "",
      password: "short",
      age: 15,
    };

    let isValid: boolean;
    act(() => {
      isValid = result.current.validateForm(invalidForm);
    });

    expect(isValid).toBe(false);
    expect(result.current.errors.email).toBe("Email is required");
    expect(result.current.errors.password).toBe("Password must be at least 8 characters");
    expect(result.current.errors.age).toBe("Must be 18 or older");
  });

  it("returns true for valid form", () => {
    const { result } = renderHook(() => useFormValidation<TestForm>(validationRules));

    const validForm: TestForm = {
      email: "test@example.com",
      password: "validpassword",
      age: 25,
    };

    let isValid: boolean;
    act(() => {
      isValid = result.current.validateForm(validForm);
    });

    expect(isValid).toBe(true);
    expect(result.current.errors).toEqual({});
    expect(result.current.hasErrors).toBe(false);
  });

  it("tracks touched fields", () => {
    const { result } = renderHook(() => useFormValidation<TestForm>(validationRules));

    expect(result.current.touched.email).toBeUndefined();

    act(() => {
      result.current.setFieldTouched("email");
    });

    expect(result.current.touched.email).toBe(true);

    act(() => {
      result.current.setFieldTouched("email", false);
    });

    expect(result.current.touched.email).toBe(false);
  });

  it("sets all fields as touched", () => {
    const { result } = renderHook(() => useFormValidation<TestForm>(validationRules));

    act(() => {
      result.current.setAllTouched();
    });

    expect(result.current.touched.email).toBe(true);
    expect(result.current.touched.password).toBe(true);
    expect(result.current.touched.age).toBe(true);
  });

  it("getFieldError returns error only if field is touched", () => {
    const { result } = renderHook(() => useFormValidation<TestForm>(validationRules));

    // Validate field to set error
    act(() => {
      result.current.validateField("email", "");
    });

    expect(result.current.errors.email).toBe("Email is required");
    expect(result.current.getFieldError("email")).toBeUndefined(); // Not touched yet

    act(() => {
      result.current.setFieldTouched("email");
    });

    expect(result.current.getFieldError("email")).toBe("Email is required"); // Now touched
  });

  it("resets all state", () => {
    const { result } = renderHook(() => useFormValidation<TestForm>(validationRules));

    // Set some errors and touched fields
    act(() => {
      result.current.validateField("email", "");
      result.current.setFieldTouched("email");
    });

    expect(result.current.errors.email).toBe("Email is required");
    expect(result.current.touched.email).toBe(true);

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
    expect(result.current.hasErrors).toBe(false);
  });

  it("handles fields without validation rules", () => {
    const { result } = renderHook(() => useFormValidation<TestForm>(validationRules));

    const formWithExtraField = {
      email: "test@example.com",
      password: "validpassword",
      age: 25,
      // @ts-expect-error Testing runtime behavior with unexpected field
      extra: "ignored",
    };

    let isValid: boolean;
    act(() => {
      isValid = result.current.validateForm(formWithExtraField as TestForm);
    });

    expect(isValid).toBe(true);
  });

  it("stops validation at first failing rule", () => {
    const rule1 = vi.fn(() => false);
    const rule2 = vi.fn(() => true);

    const rules = {
      field: [
        { validate: rule1, message: "First rule failed" },
        { validate: rule2, message: "Second rule failed" },
      ],
    };

    const { result } = renderHook(() => useFormValidation<{ field: string }>(rules));

    act(() => {
      result.current.validateField("field", "test");
    });

    expect(rule1).toHaveBeenCalled();
    expect(rule2).not.toHaveBeenCalled(); // Should not reach second rule
    expect(result.current.errors.field).toBe("First rule failed");
  });

  it("handles form with partial validation rules", () => {
    const partialRules = {
      email: [
        { validate: (v: string) => v.length > 0, message: "Email is required" },
      ],
    };

    const { result } = renderHook(() => useFormValidation<TestForm>(partialRules));

    const form: TestForm = {
      email: "",
      password: "", // No rules for this field
      age: 15, // No rules for this field
    };

    let isValid: boolean;
    act(() => {
      isValid = result.current.validateForm(form);
    });

    expect(isValid).toBe(false);
    expect(result.current.errors.email).toBe("Email is required");
    expect(result.current.errors.password).toBeUndefined();
    expect(result.current.errors.age).toBeUndefined();
  });
});
