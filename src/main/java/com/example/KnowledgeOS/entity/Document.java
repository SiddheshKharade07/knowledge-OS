package com.example.KnowledgeOS.entity;

import com.example.KnowledgeOS.entity.enums.DocumentStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "documents")
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String fileName;

    @Column(nullable = false)
    private String contentType;

    private Long fileSize;

    @Column(nullable = false, unique = true)
    private String minioObjectKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DocumentStatus documentStatus;

    @CreationTimestamp
    private Instant createdAt;
}
