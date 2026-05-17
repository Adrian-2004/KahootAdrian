package com.quizgame.repository;

import com.quizgame.entity.Answer;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnswerRepository extends MongoRepository<Answer, String> {

    List<Answer> findByGameId(String gameId);

    List<Answer> findByPlayerId(String playerId);

    boolean existsByPlayerIdAndQuestionId(String playerId, String questionId);
}
