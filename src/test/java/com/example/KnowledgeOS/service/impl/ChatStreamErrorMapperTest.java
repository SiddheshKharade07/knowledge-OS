package com.example.KnowledgeOS.service.impl;

import com.example.KnowledgeOS.exception.GenerationException;
import com.example.KnowledgeOS.exception.RagPipelineException;
import com.example.KnowledgeOS.exception.ResourceNotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.net.ConnectException;
import java.net.SocketTimeoutException;

import static org.assertj.core.api.Assertions.assertThat;

class ChatStreamErrorMapperTest {

    @Test
    void mapsMissingSessionToNonRetryableFailure() {
        ChatStreamErrorMapper.StreamFailure failure =
                ChatStreamErrorMapper.map(new ResourceNotFoundException("Chat session not found"));

        assertThat(failure.code()).isEqualTo("session_not_found");
        assertThat(failure.retryable()).isFalse();
    }

    @Test
    void mapsEmptyGenerationToEmptyResponse() {
        ChatStreamErrorMapper.StreamFailure failure =
                ChatStreamErrorMapper.map(new GenerationException("The AI service returned an empty answer."));

        assertThat(failure.code()).isEqualTo("empty_response");
        assertThat(failure.retryable()).isTrue();
    }

    @Test
    void mapsGenericGenerationFailure() {
        ChatStreamErrorMapper.StreamFailure failure =
                ChatStreamErrorMapper.map(new GenerationException("provider exploded with key sk-secret"));

        assertThat(failure.code()).isEqualTo("generation_failed");
        assertThat(failure.message()).doesNotContain("sk-secret");
    }

    @Test
    void mapsRetrievalFailureWithoutLeakingDetails() {
        ChatStreamErrorMapper.StreamFailure failure =
                ChatStreamErrorMapper.map(new RagPipelineException("SQL error: relation chunks missing"));

        assertThat(failure.code()).isEqualTo("retrieval_failed");
        assertThat(failure.retryable()).isTrue();
        assertThat(failure.message()).doesNotContain("SQL");
    }

    @Test
    void mapsTimeouts() {
        assertThat(ChatStreamErrorMapper.map(new SocketTimeoutException("Read timed out")).code())
                .isEqualTo("timeout");
        assertThat(ChatStreamErrorMapper.map(new java.util.concurrent.TimeoutException()).code())
                .isEqualTo("timeout");
    }

    @Test
    void mapsConnectionFailuresToProviderUnavailable() {
        ChatStreamErrorMapper.StreamFailure failure =
                ChatStreamErrorMapper.map(new ConnectException("Connection refused"));

        assertThat(failure.code()).isEqualTo("provider_unavailable");
        assertThat(failure.retryable()).isTrue();
    }

    @Test
    void mapsProviderRateLimit() {
        WebClientResponseException rateLimited = WebClientResponseException.create(
                429, "Too Many Requests", HttpHeaders.EMPTY, new byte[0], null);

        ChatStreamErrorMapper.StreamFailure failure = ChatStreamErrorMapper.map(rateLimited);

        assertThat(failure.code()).isEqualTo("rate_limited");
        assertThat(failure.retryable()).isTrue();
    }

    @Test
    void mapsProviderServerErrorsToProviderUnavailable() {
        WebClientResponseException unavailable = WebClientResponseException.create(
                503, "Service Unavailable", HttpHeaders.EMPTY, new byte[0], null);

        assertThat(ChatStreamErrorMapper.map(unavailable).code()).isEqualTo("provider_unavailable");
    }

    @Test
    void detectsClientDisconnects() {
        assertThat(ChatStreamErrorMapper.isClientDisconnect(
                new java.io.IOException("Broken pipe"))).isTrue();
        assertThat(ChatStreamErrorMapper.isClientDisconnect(
                new java.io.IOException("Connection reset by peer"))).isTrue();
        assertThat(ChatStreamErrorMapper.isClientDisconnect(
                new RuntimeException("generation failed"))).isFalse();
    }
}
