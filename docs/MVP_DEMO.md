# Guía de Demostración del MVP

## Fase A. Configuración Docente

1. Entrar en `/login` como `Docente`.
2. Abrir `Gestión de contenidos`.
3. Seleccionar el módulo `Introducción a la programación`.
4. Ver el contexto activo: `2º de ASIR · 2025/2026`.
5. Consultar UT1, UT2 y UT3.
6. Editar UT2 con título, descripción, RA, criterios y contenidos.
7. Guardar la UT como borrador.
8. Añadir un material base demo.
9. Asociarlo a UT2.
10. Publicar materiales base desde la API o seed.
11. Publicar la UT cuando no falten elementos obligatorios.

## Fase B. Material Estándar

1. Entrar como `Alumno`.
2. Abrir `Introducción a la programación`.
3. Abrir UT2.
4. Consultar `Material estándar publicado`.

## Fase C. Generación Adaptada

1. Volver al perfil docente.
2. Abrir `Generador adaptativo`.
3. Seleccionar primero el módulo.
4. Seleccionar una o varias UT.
5. Seleccionar uno o varios materiales base.
6. Elegir itinerario: Refuerzo, Estándar o Ampliación.
7. Elegir tipo de recurso.
8. Elegir alumnado concreto o itinerario completo.
9. Generar material adaptado.
10. Revisar el resultado.
11. Completar la validación DUA.
12. Publicar el recurso en las UT destino.

## Fase D. Alumna de Refuerzo

1. Entrar como Laura García.
2. Abrir UT2.
3. Ver material estándar.
4. Ver recursos de refuerzo publicados o asignados individualmente.
5. Abrir el asistente contextual.
6. Preguntar por condicionales anidados.
7. Registrar la explicación adaptada.
8. Valorar utilidad mediante el endpoint de feedback.

## Fase E. Alumno de Ampliación

1. Entrar como Sergio López.
2. Abrir UT2.
3. Ver material estándar.
4. Ver materiales de ampliación si existen.
5. Confirmar que no ve recursos de refuerzo no asignados.

## Fase F. Seguimiento Docente

1. Abrir `Alumnado y seguimiento`.
2. Seleccionar el módulo.
3. Abrir el perfil de Laura.
4. Revisar itinerario, materiales consultados, preguntas, progreso y alertas.
5. Registrar o simular una intervención.
6. Cambiar manualmente el itinerario con motivo documentado.
7. Abrir `Indicadores del proyecto`.
8. Revisar KPI, evidencias, periodo y observación docente.

## Comandos

```bash
docker compose up --build
docker compose exec server pytest
docker compose exec ai-service pytest
```

Frontend local:

```bash
npm install
npm run dev
npm run build
```

## Nota

Todos los datos son ficticios. Las alertas e indicadores son evidencias orientativas y no cambian itinerarios automáticamente.
