package com.quizgame.repository;

import com.quizgame.entity.Game;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GameRepository extends MongoRepository<Game, String> {

    Optional<Game> findByJoinCode(String joinCode);

    boolean existsByJoinCode(String joinCode);
}
