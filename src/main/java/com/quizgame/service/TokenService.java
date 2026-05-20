package com.quizgame.service;

import org.springframework.stereotype.Service;

import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TokenService {

    private final ConcurrentHashMap<String, String> tokenUserMap = new ConcurrentHashMap<>();

    public String createToken(String userId) {
        String token = UUID.randomUUID().toString();
        tokenUserMap.put(token, userId);
        return token;
    }

    public String getUserId(String token) {
        return tokenUserMap.get(token);
    }

    public boolean isValid(String token) {
        return tokenUserMap.containsKey(token);
    }

    public void removeToken(String token) {
        tokenUserMap.remove(token);
    }
}
