package com.quizgame.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class AddQuestionRequest {

    @NotBlank(message = "El texto de la pregunta es obligatorio")
    private String text;

    @NotEmpty(message = "Debe haber al menos 2 opciones")
    private List<String> options;

    @NotNull(message = "Debe indicar el índice de la opción correcta")
    private Integer correctOptionIndex;
}
