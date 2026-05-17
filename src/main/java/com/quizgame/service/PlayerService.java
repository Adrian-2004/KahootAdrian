package com.quizgame.service;

import com.quizgame.entity.Game;
import com.quizgame.entity.Player;
import com.quizgame.exception.PlayerNotFoundException;
import com.quizgame.repository.PlayerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PlayerService {

    private final PlayerRepository playerRepository;
    private final GameService gameService;

    public Player joinGame(String joinCode, String playerName) {
        Game game = gameService.getGameByJoinCode(joinCode);

        Player player = new Player();
        player.setName(playerName);
        player.setGameId(game.getId());

        return playerRepository.save(player);
    }

    public Player getPlayerById(String id) {
        return playerRepository.findById(id)
                .orElseThrow(() -> new PlayerNotFoundException("Jugador no encontrado con ID: " + id));
    }
}
