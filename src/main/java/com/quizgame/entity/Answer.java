package com.quizgame.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "answers")
public class Answer {

    @Id
    private String id;

    private String playerId;

    private String questionId;

    private String gameId;

    private Integer selectedOptionIndex;

    private Boolean correct;

    private LocalDateTime answeredAt;
}
