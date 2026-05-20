package com.quizgame.service;

import com.quizgame.entity.Game;
import com.quizgame.entity.Question;
import com.quizgame.exception.GameNotFoundException;
import com.quizgame.repository.GameRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class GameService {

    private final GameRepository gameRepository;
    private final MongoTemplate mongoTemplate;

    public Game createGame(String name, String authorUsername) {
        Game game = new Game();
        game.setName(name);
        game.setAuthorUsername(authorUsername);
        game.setJoinCode(generateJoinCode());
        game.setCreatedAt(LocalDateTime.now());
        return gameRepository.save(game);
    }

    public List<Game> getAllGames() {
        return gameRepository.findAll();
    }

    public List<Game> searchGames(String name, String author) {
        List<Criteria> criteriaList = new ArrayList<>();

        if (name != null && !name.isBlank()) {
            criteriaList.add(Criteria.where("name").regex(".*" + java.util.regex.Pattern.quote(name) + ".*", "i"));
        }
        if (author != null && !author.isBlank()) {
            criteriaList.add(Criteria.where("authorUsername").regex(".*" + java.util.regex.Pattern.quote(author) + ".*", "i"));
        }

        if (criteriaList.isEmpty()) {
            return gameRepository.findAll();
        }

        Query query = new Query();
        query.addCriteria(new Criteria().andOperator(criteriaList.toArray(new Criteria[0])));
        return mongoTemplate.find(query, Game.class);
    }

    public Game getGameById(String id) {
        return gameRepository.findById(id)
                .orElseThrow(() -> new GameNotFoundException("Juego no encontrado con ID: " + id));
    }

    public Game getGameByJoinCode(String joinCode) {
        return gameRepository.findByJoinCode(joinCode)
                .orElseThrow(() -> new GameNotFoundException("Codigo de union invalido: " + joinCode));
    }

    public void deleteGame(String id) {
        if (!gameRepository.existsById(id)) {
            throw new GameNotFoundException("Juego no encontrado con ID: " + id);
        }
        gameRepository.deleteById(id);
    }

    public Game addQuestion(String gameId, String text, List<String> options, int correctOptionIndex) {
        Game game = getGameById(gameId);

        if (correctOptionIndex < 0 || correctOptionIndex >= options.size()) {
            throw new IllegalArgumentException(
                    "El indice de la opcion correcta debe estar entre 0 y " + (options.size() - 1));
        }

        Question question = new Question();
        question.setText(text);
        question.setOptions(options);
        question.setCorrectOptionIndex(correctOptionIndex);

        game.getQuestions().add(question);
        return gameRepository.save(game);
    }

    public Game removeQuestion(String gameId, String questionId) {
        Game game = getGameById(gameId);

        boolean removed = game.getQuestions().removeIf(q -> q.getId().equals(questionId));
        if (!removed) {
            throw new IllegalArgumentException("Pregunta no encontrada con ID: " + questionId);
        }

        return gameRepository.save(game);
    }

    private String generateJoinCode() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        Random random = new Random();
        String code;
        do {
            StringBuilder sb = new StringBuilder(6);
            for (int i = 0; i < 6; i++) {
                sb.append(chars.charAt(random.nextInt(chars.length())));
            }
            code = sb.toString();
        } while (gameRepository.existsByJoinCode(code));
        return code;
    }
}
