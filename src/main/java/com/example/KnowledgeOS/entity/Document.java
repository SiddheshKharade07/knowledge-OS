package com.example.KnowledgeOS.entity;

import com.example.KnowledgeOS.enums.DocumentStatus;
import com.example.KnowledgeOS.enums.DocumentVisibility;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

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

    //    @Column(nullable = false)
    private String contentType;

    private Long fileSize;

    //    @Column(nullable = false, unique = true)
    private String minioObjectKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DocumentStatus documentStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private DocumentVisibility documentVisibility = DocumentVisibility.DEPARTMENT;

    @ManyToMany
    @JoinTable(
            name = "document_departments",
            joinColumns = @JoinColumn(name = "document_id"),
            inverseJoinColumns = @JoinColumn(name = "department_id"),
            uniqueConstraints = @UniqueConstraint(
                    name = "uk_document_department",
                    columnNames = {"document_id", "department_id"}
            )
    )
    @Builder.Default
    private Set<Department> departments = new HashSet<>();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner", nullable = false)
    private User owner;

    @CreationTimestamp
    private Instant createdAt;
}
