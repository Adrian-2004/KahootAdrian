package com.quizgame.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class RankingEntry {

    private String playerId;
    private String playerName;
    private int score;
}
