package com.example.KnowledgeOS.service.impl;

import com.example.KnowledgeOS.dto.AuthResponse;
import com.example.KnowledgeOS.dto.UserProfileResponse;
import com.example.KnowledgeOS.dto.request.CreateUserRequest;
import com.example.KnowledgeOS.dto.request.LoginRequest;
import com.example.KnowledgeOS.dto.request.SignupRequest;
import com.example.KnowledgeOS.entity.User;
import com.example.KnowledgeOS.mapper.UserMapper;
import com.example.KnowledgeOS.repository.UserRepository;
import com.example.KnowledgeOS.security.AuthUtil;
import com.example.KnowledgeOS.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final AuthUtil authUtil;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;

    @Override
    public AuthResponse signup(CreateUserRequest createUserRequest) {
        Optional<User> user = userRepository.findByEmail(createUserRequest.getEmail());

        if (user.isPresent()) {
            throw new BadCredentialsException("user with email + " + createUserRequest.getEmail() + " already exists");
        }

        User userToBeCreated = userMapper.toEntity(createUserRequest);
        userToBeCreated.setPassword(passwordEncoder.encode(createUserRequest.getPassword()));
        User savedUser = userRepository.save(userToBeCreated);
        UserProfileResponse userProfileResponse = userMapper.toUserProfileResponse(savedUser);

        String token = authUtil.generateAccessToken(savedUser);
        return new AuthResponse(token, userProfileResponse);

    }

    @Override
    public AuthResponse login(LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.email(), loginRequest.password())
        );

        User user = (User) authentication.getPrincipal();
        String token = authUtil.generateAccessToken(user);
        UserProfileResponse userProfileResponse = userMapper.toUserProfileResponse(user);

        return new AuthResponse(token, userProfileResponse);
    }
}
