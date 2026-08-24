# RITM-IA MVP Demo Data

Versión del seed: `mvp-recording-v1`.

## Contexto

- Centro: IES Juan de la Cierva.
- Localidad: Vélez-Málaga.
- Provincia: Málaga.
- Comunidad autónoma: Andalucía.
- Ciclo: Técnico Superior en Administración de Sistemas Informáticos en Red.
- Grupo: 2.º ASIR A.
- Curso académico: 2025/2026.

Los únicos datos reales autorizados son el nombre del docente, el centro y la localidad. El alumnado, correos e interacciones son sintéticos.

## Docente

- Álvaro Manuel Aparicio Morales.
- Correo sintético: `alvaroapamor@ritm-ia.edu.and`.
- Rol: docente.
- Departamento: Informática.

## Convención De Correos

Dominio único: `@ritm-ia.edu.and`.

Formato: primer nombre + tres primeras letras del primer apellido + tres primeras letras del segundo apellido, en minúsculas, sin tildes ni espacios.

Ejemplo: `Laura García Morales` -> `lauragarmor@ritm-ia.edu.and`.

## Módulos

- `AN4699 · Introducción a la programación`.
- `0377 · Administración de Sistemas Gestores de Bases de Datos`.
- `0379 · Proyecto Intermodular`.

No existe el módulo `0369` en el seed definitivo.

## Catálogo Curricular

- AN4699: 4 RA, 24 CE, 4 plantillas de UT.
- 0377: 6 RA, 49 CE, 6 plantillas de UT.
- 0379: 4 RA, 33 CE, 4 plantillas de UT.

Total: 14 RA, 106 CE, 14 plantillas de UT.

Las plantillas curriculares no son UT reales y no incrementan el contador de unidades creadas.

## Alumnado

20 estudiantes ficticios:

- 13 estándar.
- 4 refuerzo.
- 3 ampliación.

Perfiles destacados para la grabación:

- Laura García Morales: estándar.
- Marta López Romero: refuerzo.
- Lucía Vega Ramírez: ampliación.

Cada estudiante está matriculado en los tres módulos y tiene contexto educativo sintético por módulo.

## Estado Inicial Tras Reset

Debe existir:

- 1 docente.
- 3 módulos.
- 20 estudiantes.
- 60 matrículas.
- 60 contextos educativos/asignaciones iniciales.
- Catálogo curricular completo.

No debe existir:

- UT reales.
- Materiales base.
- Recursos generados.
- Preguntas al asistente.
- Consultas.
- Feedback.
- Métricas de actividad.
- Archivos subidos de pruebas.

## UT1 De Grabación

La primera UT real se crea durante la grabación en el módulo `0377`.

Título recomendado: `Instalación y configuración de un sistema gestor de base de datos`.

RA recomendado: `RA1`.

CE recomendados: `1.a` a `1.j`.

Materiales de grabación:

- `ut1_practica_estandar_instalacion_sgbd.pdf`.
- `ut1_conceptos_sgbd.md`.
- Debate: `¿MariaDB o PostgreSQL para un servicio con muchas conexiones?`.

## Reglas De Visibilidad

- Estándar ve materiales estándar.
- Refuerzo ve estándar y refuerzo.
- Ampliación ve estándar y ampliación.
- Refuerzo no ve ampliación.
- Ampliación no ve refuerzo.
- Los recursos generados deben validarse antes de publicarse.
