# Quiz Game API

## Stack
- Spring Boot 3.2.5
- Spring Web
- Spring Data MongoDB
- Lombok
- MongoDB Local (puerto 27017)
- Java 17
- Maven

## Comandos
- `mvn spring-boot:run` — Iniciar la aplicación
- `mvn clean compile` — Compilar
- `mvn test` — Ejecutar tests

## Endpoints
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/games` | Crear juego |
| GET | `/api/games` | Listar juegos |
| GET | `/api/games/{id}` | Obtener juego por ID |
| DELETE | `/api/games/{id}` | Eliminar juego |
| POST | `/api/games/{id}/questions` | Añadir pregunta |
| DELETE | `/api/games/{id}/questions/{qid}` | Borrar pregunta |
| POST | `/api/games/join` | Unirse a juego (body: joinCode, name) |
| POST | `/api/games/{id}/answers` | Enviar respuesta |
| GET | `/api/games/{id}/ranking` | Clasificación |

## Arquitectura
controller -> service -> repository -> MongoDB

## Notas
- Las preguntas están embebidas dentro del documento Game
- La puntuación se calcula en Java (service layer)
- Cada acierto suma 100 puntos
- Código de unión: 6 caracteres alfanuméricos (generado automáticamente)
