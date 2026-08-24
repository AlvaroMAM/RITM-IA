# RITM-IA MVP

MVP funcional de RITM-IA para demostrar un ciclo pedagógico completo en Formación Profesional: gestión de unidades de trabajo, materiales base, generación adaptativa, publicación al alumnado, seguimiento e indicadores.

## Arquitectura

- `client`: React, Vite, TypeScript, React Router y Tailwind CSS.
- `server`: FastAPI, SQLAlchemy, Alembic, Pydantic v2, httpx y PostgreSQL.
- `db`: PostgreSQL con volumen persistente.
- `ai-service`: FastAPI interno que media entre RITM-IA y el proveedor IA configurado para generar respuestas y recursos con contexto educativo. Por defecto usa Ollama en local.

El navegador solo habla con `server` a través de `/api`. No accede directamente ni a `db`, ni a `ai-service`, ni a Ollama.

## Docker

```bash
docker compose up --build
```

Servicios:

- Cliente: `http://localhost:5173`
- API interna: `server:8000`
- IA interna: `ai-service:8001`, conectada a Ollama en el equipo anfitrión.
- Base de datos: `db:5432`

Volúmenes:

- `postgres_data`: datos de PostgreSQL.
- `uploads_data`: archivos subidos por el servidor en `/app/uploads`.

No uses `docker compose down -v` para repetir la grabación: eliminaría volúmenes persistentes. Usa el reset seguro del MVP.

## Entorno De Grabación

Versión del seed: `mvp-recording-v1`.

Reset seguro:

```bash
docker compose exec server python -m app.scripts.reset_mvp_demo --confirm
```

Atajo:

```bash
make demo-reset
```

Verificación:

```bash
docker compose exec server python -m app.scripts.verify_mvp_demo
```

Atajo:

```bash
make demo-verify
```

El reset rechaza `APP_ENV=production`, exige `DEMO_RESET_ENABLED=true`, crea copia de seguridad previa en `backups/pre-mvp-recording`, limpia datos funcionales anteriores y conserva esquema, migraciones, configuración y volúmenes Docker.

El reset no instala, descarga, elimina ni reconfigura Ollama o `gemma3:4b`, y no modifica `OLLAMA_BASE_URL`.

## Ollama

Antes de generar con IA local, Ollama debe estar arrancado en el equipo:

```bash
ollama run gemma3:4b
```

Para comprobar que `gemma3:4b` ya está disponible sin descargarlo de nuevo:

```bash
ollama list
```

Variables principales con Ollama local:

```env
AI_PROVIDER=ollama
AI_TIMEOUT_SECONDS=300
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=gemma3:4b
OLLAMA_TIMEOUT_SECONDS=300
AI_SERVICE_TIMEOUT_SECONDS=300
```

`ai-service` no expone acciones cerradas. Recibe la petición del alumno o docente, añade el contexto de módulo, UT, RA, CE, contenidos, materiales, audiencia, contexto del alumno e itinerario, y envía la solicitud contextualizada al modelo.

Para migrar posteriormente a Gemini sin cambiar el frontend ni el backend, cambia el proveedor del `ai-service`:

```env
AI_PROVIDER=gemini
GEMINI_API_URL=
GEMINI_API_KEY=tu_clave
GEMINI_MODEL=gemini-1.5-flash
```

Si `GEMINI_API_URL` queda vacío, `ai-service` usa el endpoint `generateContent` del modelo indicado en `GEMINI_MODEL`.

## Frontend Local

```bash
npm install
npm run dev
npm run build
```

El flujo del alumno consulta el backend para módulos, UT publicadas, materiales visibles, historial de preguntas, asistente contextual y materiales generados por el alumno.

## Rutas Principales

- `/login`: entrada demo.
- `/docente/inicio`: inicio docente.
- `/docente/asignaturas`: mis módulos.
- `/docente/contenidos`: selección obligatoria de módulo para gestión de contenidos.
- `/docente/modulos/:moduleId/contenidos`: UT, elementos curriculares y biblioteca de materiales base.
- `/docente/generador`: generador adaptativo jerárquico.
- `/docente/recursos`: recursos generados, validación y publicación.
- `/docente/seguimiento`: alumnado, contexto, histórico de itinerarios y alertas.
- `/docente/indicadores`: indicadores del proyecto.
- `/alumno`: panel del alumno.
- `/alumno/modulos/:moduloId`: vista de módulo.
- `/alumno/unidades/:unidadId`: unidad, material estándar y recursos adaptados visibles.
- `/alumno/unidades/:unidadId/asistente`: asistente contextual del alumno.
- `/accesibilidad`: ajustes persistentes.

## Backend Implementado

- API jerárquica `/api/modules/...`.
- CRUD básico de UT.
- Validación de publicación de UT.
- Materiales base de texto, URL y archivo.
- Relación UT-material.
- Volumen de uploads y endpoint de descarga.
- Generación adaptativa con Ollama y trazabilidad de módulo, UT, materiales y audiencia.
- Validación docente con lista DUA.
- Publicación solo tras validar.
- Reglas de visibilidad por itinerario en endpoints de alumnado.
- Seguimiento de alumnado, consultas, feedback, histórico de itinerarios, alertas, intervenciones e indicadores.

## Simulado

- Autenticación demo.
- Datos ficticios de alumnado, consultas, progreso e indicadores.
- Las respuestas dependen del modelo local configurado en Ollama.
- No hay RAG, embeddings, Moodle ni analítica predictiva.

## Pruebas

```bash
npm run build
docker compose up --build
docker compose exec server pytest
docker compose exec ai-service pytest
```

En esta fase no se generan calificaciones ni cambios automáticos de itinerario.
