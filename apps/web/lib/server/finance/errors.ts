export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400,
  ) {
    super(message)
    this.name = "AppError"
  }
}

export const Errors = {
  unauthorized: () => new AppError("UNAUTHORIZED", "Authentication required", 401),
  // Signed in with a password alone on an account that has an authenticator.
  mfaRequired: () =>
    new AppError("MFA_REQUIRED", "Enter your two-step verification code to open Finance", 403),
  notFound: (resource: string) => new AppError("NOT_FOUND", `${resource} not found`, 404),
  validation: (message: string) => new AppError("VALIDATION_ERROR", message, 422),
  // Well-formed request that conflicts with existing data — a duplicate name,
  // or a delete blocked because other rows still reference this one. Kept
  // distinct from VALIDATION_ERROR so the UI can react to it specifically.
  conflict: (message: string) => new AppError("CONFLICT", message, 409),
}
