package com.quizgame.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class GameResponse {

    private String id;
    private String name;
    private String joinCode;
    private String authorUsername;
    private LocalDateTime createdAt;
    private List<QuestionDTO> questions;
}
