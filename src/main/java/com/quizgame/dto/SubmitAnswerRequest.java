package com.quizgame.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SubmitAnswerRequest {

    @NotBlank(message = "El ID del jugador es obligatorio")
    private String playerId;

    @NotBlank(message = "El ID de la pregunta es obligatorio")
    private String questionId;

    @NotNull(message = "Debe seleccionar una opción")
    private Integer selectedOptionIndex;
}
