package com.quizgame.controller;

import com.quizgame.dto.JoinGameRequest;
import com.quizgame.entity.Player;
import com.quizgame.service.PlayerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/games")
@RequiredArgsConstructor
public class PlayerController {

    private final PlayerService playerService;

    @PostMapping("/join")
    public ResponseEntity<Player> joinGame(@Valid @RequestBody JoinGameRequest request) {
        Player player = playerService.joinGame(request.getJoinCode(), request.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(player);
    }
}
