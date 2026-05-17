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
- `mvn clean package -DskipTests` — Generar JAR para deploy

## Deploy en Render.com
1. Crear cluster gratis en MongoDB Atlas
2. Obtener connection string y ponerlo como `MONGODB_URI` en Render
3. Conectar repo de GitHub a Render
4. Render build command: `mvn clean package -DskipTests`
5. Render start command: `java -jar target/*.jar --server.port=$PORT`

## Variables de entorno
- `MONGODB_URI` — URI de MongoDB (local por defecto)
- `PORT` — Puerto del servidor (8080 por defecto)

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
