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
    public ResponseEntity<List<GameResponse>> getAllGames(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String author) {
        List<Game> games;
        if ((name != null && !name.isBlank()) || (author != null && !author.isBlank())) {
            games = gameService.searchGames(name, author);
        } else {
            games = gameService.getAllGames();
        }
        List<GameResponse> responses = games.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
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
