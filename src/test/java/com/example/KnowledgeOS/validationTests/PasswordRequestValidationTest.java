package com.example.KnowledgeOS.validationTests;

import com.example.KnowledgeOS.dto.request.ResetPasswordRequest;
import com.example.KnowledgeOS.dto.request.SetPasswordRequest;
import com.example.KnowledgeOS.util.PasswordPolicy;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Boundary tests for the reset/set password request DTOs. These exercise the
 * same Bean Validation constraints that the controllers trigger with
 * {@code @Valid}.
 */
class PasswordRequestValidationTest {

    private final Validator validator =
            Validation.buildDefaultValidatorFactory().getValidator();

    @ParameterizedTest
    @ValueSource(ints = {5, 10, 20})
    void acceptsPasswordsWithinAllowedLength(int length) {
        String password = "a".repeat(length);

        assertThat(validator.validate(new ResetPasswordRequest("token", password))).isEmpty();
        assertThat(validator.validate(new SetPasswordRequest("token", password))).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(ints = {4, 21})
    void rejectsPasswordsOutsideAllowedLength(int length) {
        String password = "a".repeat(length);

        assertLengthViolation(validator.validate(new ResetPasswordRequest("token", password)));
        assertLengthViolation(validator.validate(new SetPasswordRequest("token", password)));
    }

    @Test
    void rejectsEmptyPassword() {
        Set<ConstraintViolation<ResetPasswordRequest>> resetViolations =
                validator.validate(new ResetPasswordRequest("token", ""));
        Set<ConstraintViolation<SetPasswordRequest>> setupViolations =
                validator.validate(new SetPasswordRequest("token", ""));

        assertThat(resetViolations).isNotEmpty();
        assertThat(resetViolations)
                .extracting(violation -> violation.getPropertyPath().toString())
                .contains("newPassword");
        assertThat(setupViolations).isNotEmpty();
        assertThat(setupViolations)
                .extracting(violation -> violation.getPropertyPath().toString())
                .contains("newPassword");
    }

    private void assertLengthViolation(Set<? extends ConstraintViolation<?>> violations) {
        assertThat(violations).hasSize(1);
        ConstraintViolation<?> violation = violations.iterator().next();
        assertThat(violation.getPropertyPath().toString()).isEqualTo("newPassword");
        assertThat(violation.getMessage()).isEqualTo(PasswordPolicy.LENGTH_MESSAGE);
    }
}
