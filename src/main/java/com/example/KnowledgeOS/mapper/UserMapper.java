package com.example.KnowledgeOS.mapper;

import com.example.KnowledgeOS.dto.UserProfileResponse;
import com.example.KnowledgeOS.dto.UserSummaryResponse;
import com.example.KnowledgeOS.dto.request.CreateUserRequest;
import com.example.KnowledgeOS.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(
            target = "departmentIds",
            expression = "java(user.getDepartments().stream()" +
                    ".map(department -> department.getId())" +
                    ".collect(java.util.stream.Collectors.toSet()))"
    )
    UserProfileResponse toUserProfileResponse(User user);

    @Mapping(target = "departments", ignore = true)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "password", ignore = true)
    @Mapping(target = "active", ignore = true)
    User toEntity(CreateUserRequest createUserRequest);


    UserSummaryResponse toUserSummaryResponse(User user);

}
