package com.example.KnowledgeOS.util;

/**
 * Password length policy shared by the token-based password reset and password
 * setup flows.
 *
 * <p>Lengths are measured with {@link String#length()}, which counts UTF-16 code
 * units. That is the same unit JavaScript's {@code String.length} uses, and it
 * is also what Bean Validation's {@code @Size} constraint uses for a
 * {@code CharSequence}, so the frontend and backend rules stay consistent for
 * all supported password characters.</p>
 */
public final class PasswordPolicy {

    public static final int MIN_LENGTH = 5;
    public static final int MAX_LENGTH = 20;
    public static final String LENGTH_MESSAGE =
            "Password must be between " + MIN_LENGTH + " and " + MAX_LENGTH + " characters";

    private PasswordPolicy() {
    }

    /**
     * Defence in depth for flows that reach the service directly, bypassing the
     * controller's Bean Validation. Must run before the raw password is encoded
     * or saved.
     *
     * @throws IllegalArgumentException when the password is missing or its
     *                                  length is outside the allowed range
     */
    public static void validateNewPassword(String password) {
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("New password is required");
        }
        if (password.length() < MIN_LENGTH || password.length() > MAX_LENGTH) {
            throw new IllegalArgumentException(LENGTH_MESSAGE);
        }
    }
}
