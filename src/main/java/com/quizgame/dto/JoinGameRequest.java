package com.quizgame.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class JoinGameRequest {

    @NotBlank(message = "El código de unión es obligatorio")
    private String joinCode;

    @NotBlank(message = "El nombre del jugador es obligatorio")
    private String name;
}
