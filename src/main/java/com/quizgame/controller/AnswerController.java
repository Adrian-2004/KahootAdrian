package com.quizgame.controller;

import com.quizgame.dto.AnswerResponse;
import com.quizgame.dto.RankingEntry;
import com.quizgame.dto.SubmitAnswerRequest;
import com.quizgame.entity.Answer;
import com.quizgame.entity.Game;
import com.quizgame.entity.Question;
import com.quizgame.service.AnswerService;
import com.quizgame.service.GameService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/games/{gameId}")
@RequiredArgsConstructor
public class AnswerController {

    private final AnswerService answerService;
    private final GameService gameService;

    @PostMapping("/answers")
    public ResponseEntity<AnswerResponse> submitAnswer(
            @PathVariable String gameId,
            @Valid @RequestBody SubmitAnswerRequest request) {
        Answer answer = answerService.submitAnswer(
                gameId, request.getPlayerId(), request.getQuestionId(), request.getSelectedOptionIndex());

        Game game = gameService.getGameById(gameId);
        String correctOptionText = game.getQuestions().stream()
                .filter(q -> q.getId().equals(request.getQuestionId()))
                .findFirst()
                .map(q -> q.getOptions().get(q.getCorrectOptionIndex()))
                .orElse(null);

        AnswerResponse response = new AnswerResponse();
        response.setId(answer.getId());
        response.setPlayerId(answer.getPlayerId());
        response.setQuestionId(answer.getQuestionId());
        response.setGameId(answer.getGameId());
        response.setSelectedOptionIndex(answer.getSelectedOptionIndex());
        response.setCorrect(answer.getCorrect());
        response.setCorrectOptionText(correctOptionText);
        response.setAnsweredAt(answer.getAnsweredAt());

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/ranking")
    public ResponseEntity<List<RankingEntry>> getRanking(@PathVariable String gameId) {
        List<RankingEntry> ranking = answerService.getRanking(gameId);
        return ResponseEntity.ok(ranking);
    }
}
