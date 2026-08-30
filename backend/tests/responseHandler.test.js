/**
 * responseHandler.test.js
 * Unit tests for handleSuccess / handleError — no DB required.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { handleSuccess, handleError } = require("../src/utils/responseHandler");

function mockRes() {
  const res = {};
  res.statusCode = null;
  res.payload = null;
  res.status = function (code) {
    this.statusCode = code;
    return this;
  };
  res.json = function (payload) {
    this.payload = payload;
    return this;
  };
  return res;
}

describe("responseHandler — handleSuccess", () => {
  it("returns 200 with success:true, message and data when data is provided", () => {
    const res = mockRes();
    handleSuccess(res, 200, "OK", { id: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ success: true, message: "OK", data: { id: 1 } });
  });

  it("omits the data field when data is null", () => {
    const res = mockRes();
    handleSuccess(res, 201, "Created", null);
    expect(res.statusCode).toBe(201);
    expect(res.payload).toEqual({ success: true, message: "Created" });
    expect(res.payload).not.toHaveProperty("data");
  });

  it("handles 204 No Content without a data payload", () => {
    const res = mockRes();
    handleSuccess(res, 204, "No Content");
    expect(res.statusCode).toBe(204);
    expect(res.payload.success).toBe(true);
  });

  it("preserves array data as-is", () => {
    const res = mockRes();
    handleSuccess(res, 200, "List", [{ a: 1 }, { a: 2 }]);
    expect(res.payload.data).toHaveLength(2);
  });
});

describe("responseHandler — handleError: Supabase/Auth code mapping", () => {
  let errorSpy;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    errorSpy.mockRestore();
  });

  function callWithCode(code, message) {
    const res = mockRes();
    handleError(res, { code, message: message || "raw" });
    return res;
  }

  it("maps email-already-exists variants to 400", () => {
    for (const c of ["auth/email-already-exists", "auth/email-already-in-use", "email_exists", "user_already_exists"]) {
      const r = callWithCode(c);
      expect(r.statusCode).toBe(400);
      expect(r.payload.success).toBe(false);
    }
  });

  it("maps invalid-email variants to 400", () => {
    for (const c of ["auth/invalid-email", "invalid_email"]) {
      const r = callWithCode(c);
      expect(r.statusCode).toBe(400);
    }
  });

  it("maps weak-password variants to 400", () => {
    for (const c of ["auth/weak-password", "weak_password"]) {
      const r = callWithCode(c);
      expect(r.statusCode).toBe(400);
    }
  });

  it("maps user-not-found variants to 404", () => {
    for (const c of ["auth/user-not-found", "user_not_found"]) {
      const r = callWithCode(c);
      expect(r.statusCode).toBe(404);
    }
  });

  it("maps invalid-credential variants to 401", () => {
    for (const c of ["auth/invalid-credential", "invalid_credentials"]) {
      const r = callWithCode(c);
      expect(r.statusCode).toBe(401);
    }
  });

  it("maps email_not_confirmed to 400", () => {
    expect(callWithCode("email_not_confirmed").statusCode).toBe(400);
  });

  it("maps over_email_send_rate_limit to 429", () => {
    expect(callWithCode("over_email_send_rate_limit").statusCode).toBe(429);
  });

  it("maps invalid-phone-number to 400", () => {
    expect(callWithCode("auth/invalid-phone-number").statusCode).toBe(400);
  });

  it("maps phone-number-already-exists to 400", () => {
    expect(callWithCode("auth/phone-number-already-exists").statusCode).toBe(400);
  });

  it("maps JWT expired variants to 401", () => {
    for (const c of ["auth/id-token-expired", "JWT expired"]) {
      expect(callWithCode(c).statusCode).toBe(401);
    }
  });

  it("maps id-token-revoked to 401", () => {
    expect(callWithCode("auth/id-token-revoked").statusCode).toBe(401);
  });

  it("maps invalid token / argument-error to 401", () => {
    for (const c of ["auth/argument-error", "auth/invalid-id-token"]) {
      expect(callWithCode(c).statusCode).toBe(401);
    }
  });

  it("returns 400 with E.164 hint when message contains E.164", () => {
    const res = mockRes();
    handleError(res, { code: "unknown-code", message: "Phone must be in E.164 format" });
    expect(res.statusCode).toBe(400);
    expect(res.payload.message).toMatch(/E\.164/);
  });

  it("falls back to the original message for unknown codes that carry a message", () => {
    const res = mockRes();
    handleError(res, { code: "some_random_code", message: "Original service message" });
    expect(res.statusCode).toBe(500);
    expect(res.payload.message).toBe("Original service message");
  });

  it("uses defaultMessage when unknown code has no message", () => {
    const res = mockRes();
    handleError(res, { code: "some_random_code" }, "Fallback default");
    expect(res.payload.message).toBe("Fallback default");
  });

  it("maps Joi validation errors to 400 with joined details", () => {
    const res = mockRes();
    handleError(res, { isJoi: true, details: [{ message: '"email" is invalid' }, { message: '"password" is required' }] });
    expect(res.statusCode).toBe(400);
    expect(res.payload.message).toBe('"email" is invalid, "password" is required');
  });

  it("respects a custom statusCode property on the error object", () => {
    const res = mockRes();
    handleError(res, { statusCode: 403, message: "Forbidden" });
    expect(res.statusCode).toBe(403);
    expect(res.payload.message).toBe("Forbidden");
  });

  it("uses defaultMessage when statusCode is present but message is missing", () => {
    const res = mockRes();
    handleError(res, { statusCode: 422 }, "Validation failed");
    expect(res.statusCode).toBe(422);
    expect(res.payload.message).toBe("Validation failed");
  });

  it("returns 500 with defaultMessage for a generic Error with no code/statusCode", () => {
    const res = mockRes();
    handleError(res, new Error("boom"), "Internal server error.");
    expect(res.statusCode).toBe(500);
    expect(res.payload.message).toBe("Internal server error.");
  });

  it("logs stack trace in non-production for generic Errors", () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const res = mockRes();
    handleError(res, new Error("boom stack"));
    const joined = errorSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(joined).toMatch(/Stack Trace/);
    process.env.NODE_ENV = origEnv;
  });

  it("does not log stack trace in production", () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = mockRes();
    handleError(res, new Error("boom"));
    const joined = spy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(joined).not.toMatch(/Stack Trace/);
    spy.mockRestore();
    process.env.NODE_ENV = origEnv;
  });
});
