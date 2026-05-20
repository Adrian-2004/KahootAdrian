package com.quizgame.controller;

import com.quizgame.dto.AddQuestionRequest;
import com.quizgame.dto.CreateGameRequest;
import com.quizgame.dto.GameResponse;
import com.quizgame.dto.QuestionDTO;
import com.quizgame.entity.Game;
import com.quizgame.entity.User;
import com.quizgame.service.AuthService;
import com.quizgame.service.GameService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/games")
@RequiredArgsConstructor
public class GameController {

    private final GameService gameService;
    private final AuthService authService;

    @PostMapping
    public ResponseEntity<GameResponse> createGame(
            @Valid @RequestBody CreateGameRequest request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = authService.getUserFromToken(authHeader);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Game game = gameService.createGame(request.getName(), user.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(game));
    }

   @GetMapping
public ResponseEntity<java.util.List<Game>> getAllGames(
        @RequestParam(required = false) String name,
        @RequestParam(required = false) String author) {
    
    // Obtenemos todos los juegos usando tu lógica original
    java.util.List<Game> games = gameService.getAllGames();
    
    // Filtramos en memoria para no alterar la estructura del programa
    if (name != null && !name.isEmpty()) {
        games = games.stream()
                .filter(g -> g.getName() != null && g.getName().toLowerCase().contains(name.toLowerCase()))
                .collect(java.util.stream.Collectors.toList());
    }
    
    if (author != null && !author.isEmpty()) {
        games = games.stream()
                .filter(g -> g.getAuthorUsername() != null && g.getAuthorUsername().toLowerCase().contains(author.toLowerCase()))
                .collect(java.util.stream.Collectors.toList());
    }
    
    return ResponseEntity.ok(games);
}

    @GetMapping("/{id}")
    public ResponseEntity<GameResponse> getGameById(@PathVariable String id) {
        Game game = gameService.getGameById(id);
        return ResponseEntity.ok(toResponse(game));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGame(@PathVariable String id) {
        gameService.deleteGame(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{gameId}/questions")
    public ResponseEntity<GameResponse> addQuestion(
            @PathVariable String gameId,
            @Valid @RequestBody AddQuestionRequest request) {
        Game game = gameService.addQuestion(
                gameId, request.getText(), request.getOptions(), request.getCorrectOptionIndex());
        return ResponseEntity.ok(toResponse(game));
    }

    @DeleteMapping("/{gameId}/questions/{questionId}")
    public ResponseEntity<GameResponse> removeQuestion(
            @PathVariable String gameId,
            @PathVariable String questionId) {
        Game game = gameService.removeQuestion(gameId, questionId);
        return ResponseEntity.ok(toResponse(game));
    }

    private GameResponse toResponse(Game game) {
        GameResponse response = new GameResponse();
        response.setId(game.getId());
        response.setName(game.getName());
        response.setJoinCode(game.getJoinCode());
        response.setAuthorUsername(game.getAuthorUsername());
        response.setCreatedAt(game.getCreatedAt());

        List<QuestionDTO> questionDTOs = game.getQuestions().stream()
                .map(q -> {
                    QuestionDTO dto = new QuestionDTO();
                    dto.setId(q.getId());
                    dto.setText(q.getText());
                    dto.setOptions(q.getOptions());
                    return dto;
                })
                .collect(Collectors.toList());
        response.setQuestions(questionDTOs);

        return response;
    }
}
