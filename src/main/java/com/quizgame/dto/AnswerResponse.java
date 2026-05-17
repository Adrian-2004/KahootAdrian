package com.quizgame.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AnswerResponse {

    private String id;
    private String playerId;
    private String questionId;
    private String gameId;
    private Integer selectedOptionIndex;
    private Boolean correct;
    private String correctOptionText;
    private LocalDateTime answeredAt;
}
