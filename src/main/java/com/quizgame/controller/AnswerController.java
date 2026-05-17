package com.quizgame.controller;

import com.quizgame.dto.RankingEntry;
import com.quizgame.dto.SubmitAnswerRequest;
import com.quizgame.entity.Answer;
import com.quizgame.service.AnswerService;
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

    @PostMapping("/answers")
    public ResponseEntity<Answer> submitAnswer(
            @PathVariable String gameId,
            @Valid @RequestBody SubmitAnswerRequest request) {
        Answer answer = answerService.submitAnswer(
                gameId, request.getPlayerId(), request.getQuestionId(), request.getSelectedOptionIndex());
        return ResponseEntity.status(HttpStatus.CREATED).body(answer);
    }

    @GetMapping("/ranking")
    public ResponseEntity<List<RankingEntry>> getRanking(@PathVariable String gameId) {
        List<RankingEntry> ranking = answerService.getRanking(gameId);
        return ResponseEntity.ok(ranking);
    }
}
