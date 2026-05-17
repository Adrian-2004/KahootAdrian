package com.quizgame.service;

import com.quizgame.dto.RankingEntry;
import com.quizgame.entity.Answer;
import com.quizgame.entity.Game;
import com.quizgame.entity.Player;
import com.quizgame.entity.Question;
import com.quizgame.exception.PlayerNotFoundException;
import com.quizgame.repository.AnswerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnswerService {

    private final AnswerRepository answerRepository;
    private final GameService gameService;
    private final PlayerService playerService;

    public Answer submitAnswer(String gameId, String playerId, String questionId, int selectedOptionIndex) {
        Game game = gameService.getGameById(gameId);
        Player player = playerService.getPlayerById(playerId);

        if (!player.getGameId().equals(gameId)) {
            throw new IllegalArgumentException("El jugador no pertenece a este juego");
        }

        Question question = game.getQuestions().stream()
                .filter(q -> q.getId().equals(questionId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Pregunta no encontrada en este juego"));

        if (answerRepository.existsByPlayerIdAndQuestionId(playerId, questionId)) {
            throw new IllegalArgumentException("El jugador ya respondió esta pregunta");
        }

        boolean correct = question.getCorrectOptionIndex().equals(selectedOptionIndex);

        Answer answer = new Answer();
        answer.setPlayerId(playerId);
        answer.setQuestionId(questionId);
        answer.setGameId(gameId);
        answer.setSelectedOptionIndex(selectedOptionIndex);
        answer.setCorrect(correct);
        answer.setAnsweredAt(LocalDateTime.now());

        return answerRepository.save(answer);
    }

    public List<RankingEntry> getRanking(String gameId) {
        gameService.getGameById(gameId);

        List<Answer> answers = answerRepository.findByGameId(gameId);

        Map<String, Integer> scores = new HashMap<>();
        Map<String, String> playerNames = new HashMap<>();

        for (Answer answer : answers) {
            if (Boolean.TRUE.equals(answer.getCorrect())) {
                scores.merge(answer.getPlayerId(), 100, Integer::sum);
            }
            if (!playerNames.containsKey(answer.getPlayerId())) {
                try {
                    Player player = playerService.getPlayerById(answer.getPlayerId());
                    playerNames.put(answer.getPlayerId(), player.getName());
                } catch (PlayerNotFoundException e) {
                    playerNames.put(answer.getPlayerId(), "Unknown");
                }
            }
        }

        return scores.entrySet().stream()
                .map(entry -> new RankingEntry(
                        entry.getKey(),
                        playerNames.getOrDefault(entry.getKey(), "Unknown"),
                        entry.getValue()))
                .sorted(Comparator.comparingInt(RankingEntry::getScore).reversed())
                .collect(Collectors.toList());
    }
}
