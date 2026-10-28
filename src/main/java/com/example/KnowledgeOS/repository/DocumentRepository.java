package com.example.KnowledgeOS.repository;

import com.example.KnowledgeOS.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DocumentRepository extends JpaRepository<Document, Long> {

    List<Document> findAllByOrderByCreatedAtDesc();

    long countByOwnerId(Long ownerId);

    @Query("""
            select distinct d from Document d
            left join fetch d.departments
            left join fetch d.owner
            where exists (
                select 1 from User u where u.id = :userId and u.userRole = com.example.KnowledgeOS.enums.UserRole.ADMIN
            )
               or d.owner.id = :userId
               or exists (
                    select 1 from d.departments dept
                    where dept.id in :departmentIds
               )
            order by d.createdAt desc
            """)
    List<Document> findAllAccessible(@Param("userId") Long userId, @Param("departmentIds") List<Long> departmentIds);
}

