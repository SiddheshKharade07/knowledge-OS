package com.example.KnowledgeOS.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "knowledgeos.rag")
public class RagProperties {

    private Lexical lexical = new Lexical();
    private Semantic semantic = new Semantic();
    private Fusion fusion = new Fusion();
    private Reranker reranker = new Reranker();
    private FinalContext finalContext = new FinalContext();

    @Getter
    @Setter
    public static class Lexical {
        private int topK = 20;
    }

    @Getter
    @Setter
    public static class Semantic {
        private int topK = 20;
        private double similarityThreshold = 0.25;
    }

    @Getter
    @Setter
    public static class Fusion {
        private int topK = 20;
        private double rrfK = 60.0;
    }

    @Getter
    @Setter
    public static class Reranker {
        private int topK = 5;
        private boolean enabled = true;
    }

    @Getter
    @Setter
    public static class FinalContext {
        private int topK = 5;
    }
}
