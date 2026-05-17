package com.quizgame.dto;

import lombok.Data;

import java.util.List;

@Data
public class QuestionDTO {

    private String id;
    private String text;
    private List<String> options;
}
