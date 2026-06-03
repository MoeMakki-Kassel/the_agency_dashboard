import { describe, expect, it } from "vitest";
import { sanitizeUserFacingMessage } from "./userFacingError";

describe("userFacingError", () => {
  it("returns generic message for internal errors", () => {
    expect(sanitizeUserFacingMessage("violates foreign key constraint")).toBe(
      "Something went wrong. Please try again.",
    );
  });
});
