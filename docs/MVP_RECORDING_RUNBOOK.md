# RITM-IA MVP Recording Runbook

Entorno objetivo: `mvp-recording-v1`.

Aviso visible del entorno: "Entorno de demostración. Los datos del alumnado y sus interacciones son ficticios."

## Fase 0. Preparación

1. Iniciar Ollama nativo en el equipo anfitrión.
2. Comprobar que el modelo ya existe, sin descargarlo de nuevo:
   ```bash
   ollama list
   ```
3. Levantar servicios:
   ```bash
   docker compose up -d --build
   ```
4. Ejecutar reset seguro:
   ```bash
   docker compose exec server python -m app.scripts.reset_mvp_demo --confirm
   ```
5. Verificar seed:
   ```bash
   docker compose exec server python -m app.scripts.verify_mvp_demo
   ```

Resultado esperado: 1 docente, 3 módulos, 20 estudiantes, 60 matrículas, 14 RA, 106 CE, 14 plantillas de UT, 0 UT reales, 0 materiales y 0 interacciones.

## Fase 1. Docente y Módulos

1. Entrar en `/login` como Docente.
2. Mostrar `Álvaro Manuel Aparicio Morales`.
3. Abrir `Mis módulos`.
4. Confirmar los módulos:
   - `AN4699 · Introducción a la programación`.
   - `0377 · Administración de Sistemas Gestores de Bases de Datos`.
   - `0379 · Proyecto Intermodular`.
5. Abrir gestión de contenidos y seleccionar `0377`.
6. Confirmar estado vacío: todavía no hay UT reales ni materiales.

Pausa recomendada: tras mostrar los tres módulos y el estado vacío.

## Fase 2. Crear UT1

1. Crear `UT1`.
2. Título: `Instalación y configuración de un sistema gestor de base de datos`.
3. RA: `RA1`.
4. CE: `1.a` a `1.j`.
5. Contenidos:
   - Instalación de MariaDB.
   - Configuración inicial.
   - Comprobación del servicio.
   - Registro de incidencias.
6. Guardar borrador.

Resultado esperado: el contador pasa de 0 a 1 UT real.

## Fase 3. Materiales

1. Subir `ut1_practica_estandar_instalacion_sgbd.pdf`.
2. Añadir `ut1_conceptos_sgbd.md` como texto.
3. Crear un recurso tipo debate: `¿MariaDB o PostgreSQL para un servicio con muchas conexiones?`.
4. Publicar materiales.
5. Publicar UT1.

## Fase 4. Alumna Estándar

1. Entrar como Laura García Morales.
2. Abrir módulo `0377`.
3. Abrir UT1.
4. Consultar material estándar.
5. Preguntar: `¿Qué diferencia hay entre instalar MariaDB y configurarlo después?`
6. Valorar la respuesta como útil.

## Fase 5. Generación Docente

1. Volver al docente.
2. Abrir `Generador`.
3. Seleccionar módulo `0377`.
4. Seleccionar UT1.
5. Seleccionar material base.
6. Generar recurso de refuerzo.
7. Validar y publicar.
8. Generar recurso de ampliación.
9. Validar y publicar.

## Fase 6. Refuerzo

1. Entrar como Marta López Romero.
2. Abrir módulo `0377`.
3. Comprobar que ve estándar y refuerzo.
4. Preguntar: `¿Qué puedo revisar si MariaDB no arranca después de la instalación?`
5. Activar accesibilidad: texto grande, mayor espaciado y modo concentración.

## Fase 7. Ampliación

1. Entrar como Lucía Vega Ramírez.
2. Abrir módulo `0377`.
3. Comprobar que ve estándar y ampliación.
4. Preguntar: `¿Qué criterios utilizarías para comparar MariaDB y PostgreSQL?`

## Fase 8. Seguimiento

1. Volver al docente.
2. Abrir `Alumnado y seguimiento`.
3. Seleccionar módulo `0377`.
4. Abrir Laura, Marta y Lucía.
5. Mostrar contexto educativo, materiales consultados, preguntas, fuentes y actividad.
6. Abrir indicadores.

## Fase 9. Accesibilidad

Mostrar:

- Tamaño de texto.
- Contraste.
- Espaciado.
- Tema.
- Modo concentración.
- Persistencia al cambiar de pantalla.

Tiempo total recomendado: 18-25 minutos, con pausas tras Fase 1, Fase 3, Fase 5 y Fase 8.
