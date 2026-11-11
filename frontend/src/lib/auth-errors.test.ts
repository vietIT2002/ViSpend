import { describe, expect, test } from "vitest";

import { ApiError } from "./api";
import { authErrorKey } from "./auth-errors";

describe("authErrorKey", () => {
  test("timeouts and gateway errors say the server is unavailable", () => {
    expect(authErrorKey(new ApiError("Request timed out. Please try again.", 408), "auth.googleError")).toBe("auth.serverUnavailable");
    expect(authErrorKey(new ApiError("Bad Gateway", 502), "auth.googleError")).toBe("auth.serverUnavailable");
    expect(authErrorKey(new TypeError("Failed to fetch"), "auth.googleError")).toBe("auth.serverUnavailable");
  });
  test("known codes keep their message; unknown fall back", () => {
    expect(authErrorKey(new ApiError("invalid_credentials", 401), "auth.googleError")).toBe("errors.invalid_credentials");
    expect(authErrorKey(new Error("x"), "auth.googleError")).toBe("auth.googleError");
  });
});
