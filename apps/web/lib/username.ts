// Mirrors h-space-api's UsernameRules: 3–30 letters, digits, "." or "_",
// starting and ending with a letter or digit, compared case-insensitively.
// Usernames can never contain "@", which is how the login form's single
// field tells a username from an email.

const USERNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._]{1,28}[A-Za-z0-9]$/

export const USERNAME_HINT =
  "3–30 characters: letters, numbers, “.” or “_”, starting and ending with a letter or number."

/** null when the username is well-formed, otherwise why it isn't. */
export function usernameFormatError(username: string): string | null {
  const value = username.trim()
  if (value.length < 3) return "Username must be at least 3 characters."
  if (value.length > 30) return "Username must be at most 30 characters."
  if (!USERNAME_PATTERN.test(value))
    return `Username must be ${USERNAME_HINT.charAt(0).toLowerCase()}${USERNAME_HINT.slice(1)}`
  return null
}
