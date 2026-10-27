package com.example.KnowledgeOS.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Dedicated, bounded worker pool for SSE chat generation.
 *
 * <p>Streaming a chat answer can take minutes, so these tasks must not share a
 * pool with regular request work. A {@link SynchronousQueue} grows the pool
 * immediately; when every worker is busy, {@link #chatStreamExecutor()} rejects
 * the task instead of queueing an unbounded number of stalled connections.</p>
 */
@Configuration
public class ChatStreamExecutorConfig {

    @Bean(destroyMethod = "shutdown")
    public ExecutorService chatStreamExecutor() {
        AtomicInteger counter = new AtomicInteger();
        return new ThreadPoolExecutor(
                4,
                24,
                60L,
                TimeUnit.SECONDS,
                new SynchronousQueue<>(),
                runnable -> {
                    Thread thread = new Thread(runnable, "chat-stream-" + counter.incrementAndGet());
                    thread.setDaemon(true);
                    return thread;
                },
                new ThreadPoolExecutor.AbortPolicy());
    }
}
