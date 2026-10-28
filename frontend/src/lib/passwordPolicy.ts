export const MIN_PASSWORD_LENGTH = 5;
export const MAX_PASSWORD_LENGTH = 20;
export const PASSWORD_TOO_SHORT = 'Password must be at least 5 characters long.';
export const PASSWORD_TOO_LONG = 'Password must not exceed 20 characters.';

/**
 * String.length counts UTF-16 code units in both JavaScript and Java, so this
 * matches the backend's @Size(min = 5, max = 20) constraint.
 */
export function getPasswordLengthError(value: string): string | null {
  if (value.length < MIN_PASSWORD_LENGTH) {
    return PASSWORD_TOO_SHORT;
  }
  if (value.length > MAX_PASSWORD_LENGTH) {
    return PASSWORD_TOO_LONG;
  }
  return null;
}
