package com.quizgame.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateGameRequest {

    @NotBlank(message = "El nombre del juego es obligatorio")
    private String name;
}
