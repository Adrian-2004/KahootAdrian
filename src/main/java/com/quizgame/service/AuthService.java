package com.quizgame.service;

import com.quizgame.dto.AuthResponse;
import com.quizgame.dto.LoginRequest;
import com.quizgame.dto.RegisterRequest;
import com.quizgame.entity.User;
import com.quizgame.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Set<String> BLOCKED_WORDS = Set.of(
            "nigger", "fuck", "shit", "bitch", "asshole", "bastard",
            "cunt", "dickhead", "motherfucker", "piss", "slut", "whore",
            "cock", "porn", "penis", "vagina"
    );

    private final UserRepository userRepository;
    private final TokenService tokenService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthResponse register(RegisterRequest request) {
        String username = request.getUsername().trim();

        if (username.isEmpty()) {
            throw new IllegalArgumentException("El nombre de usuario no puede estar vacio");
        }

        String lower = username.toLowerCase();
        for (String word : BLOCKED_WORDS) {
            if (lower.contains(word)) {
                throw new IllegalArgumentException("El nombre de usuario contiene lenguaje inapropiado");
            }
        }

        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("El nombre de usuario ya existe");
        }

        User user = new User();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setCreatedAt(LocalDateTime.now());
        user = userRepository.save(user);

        String token = tokenService.createToken(user.getId());
        return new AuthResponse(token, user.getId(), user.getUsername());
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("Credenciales invalidas"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Credenciales invalidas");
        }

        String token = tokenService.createToken(user.getId());
        return new AuthResponse(token, user.getId(), user.getUsername());
    }

    public AuthResponse validate(String token) {
        if (token == null || !tokenService.isValid(token)) {
            throw new IllegalArgumentException("Token invalido");
        }
        String userId = tokenService.getUserId(token);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        String newToken = tokenService.createToken(userId);
        return new AuthResponse(newToken, user.getId(), user.getUsername());
    }

    public User getUserFromToken(String token) {
        if (token == null || !tokenService.isValid(token)) {
            return null;
        }
        String userId = tokenService.getUserId(token);
        return userRepository.findById(userId).orElse(null);
    }
}
