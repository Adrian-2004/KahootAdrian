package com.quizgame.repository;

import com.quizgame.entity.Player;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PlayerRepository extends MongoRepository<Player, String> {

    List<Player> findByGameId(String gameId);
}
