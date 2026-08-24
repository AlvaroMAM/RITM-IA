SEED_VERSION = "mvp-recording-v1"
TEACHER_ID = "teacher-alvaro-aparicio"
TEACHER_EMAIL = "alvaroapamor@ritm-ia.edu.and"
DOMAIN = "@ritm-ia.edu.and"

CENTER_CONTEXT = {
    "centre": "IES Juan de la Cierva",
    "centre_display": "IES Juan de la Cierva · Vélez-Málaga",
    "locality": "Vélez-Málaga",
    "province": "Málaga",
    "region": "Andalucía",
    "family": "Informática y Comunicaciones",
    "cycle": "Técnico Superior en Administración de Sistemas Informáticos en Red",
    "cycle_short": "ASIR",
    "group": "2.º ASIR A",
    "academic_year": "2025/2026",
    "modality": "presencial",
}

MODULES = [
    {
        "id": "module-an4699-programacion",
        "code": "AN4699",
        "name": "Introducción a la programación",
        "short_name": "Programación",
        "hours": 96,
        "weekly_hours": 5,
        "source_document": "2025_2026_AS2_Introduccion_a_la_programacion.pdf",
    },
    {
        "id": "module-0377-asgbd",
        "code": "0377",
        "name": "Administración de Sistemas Gestores de Bases de Datos",
        "short_name": "ASGBD",
        "hours": 84,
        "weekly_hours": 4,
        "source_document": "2025_2026_AS2_Administracion_de_sistemas_gestores_de_bases_de_datos.pdf",
    },
    {
        "id": "module-0379-proyecto-intermodular",
        "code": "0379",
        "name": "Proyecto Intermodular",
        "short_name": "Proyecto Intermodular",
        "hours": 64,
        "weekly_hours": 3,
        "source_document": "2025_2026_AS2_Proyecto_intermodular_ASIR.pdf",
    },
]

STUDENTS = [
    ("student-laura-garcia-morales", "Laura García Morales", "standard", "Media", "Buen ritmo con práctica guiada inicial."),
    ("student-carmen-navarro-ruiz", "Carmen Navarro Ruiz", "standard", "Media", "Necesita consolidar vocabulario técnico."),
    ("student-nerea-santos-vega", "Nerea Santos Vega", "standard", "Media", "Trabaja bien con ejemplos breves."),
    ("student-paula-molina-castro", "Paula Molina Castro", "standard", "Media", "Requiere seguimiento ordinario."),
    ("student-ana-romero-perez", "Ana Romero Pérez", "standard", "Media", "Participa con regularidad."),
    ("student-elena-vargas-lopez", "Elena Vargas López", "standard", "Media", "Prefiere guías estructuradas."),
    ("student-sara-martin-soler", "Sara Martín Soler", "standard", "Media", "Aprende bien con ejercicios aplicados."),
    ("student-irene-cortes-ramos", "Irene Cortés Ramos", "standard", "Media", "Avance estable."),
    ("student-david-ruiz-ortega", "David Ruiz Ortega", "standard", "Media", "Necesita contrastar soluciones."),
    ("student-alvaro-sanchez-marin", "Álvaro Sánchez Marín", "standard", "Media", "Buen desempeño con apoyo puntual."),
    ("student-pablo-ferrer-munoz", "Pablo Ferrer Muñoz", "standard", "Media", "Mantiene un progreso ordinario."),
    ("student-javier-cano-nieto", "Javier Cano Nieto", "standard", "Media", "Consulta dudas concretas."),
    ("student-miguel-herrera-diaz", "Miguel Herrera Díaz", "standard", "Media", "Necesita revisar documentación técnica."),
    ("student-adrian-ramos-cabrera", "Adrián Ramos Cabrera", "standard", "Media", "Progresa con ejercicios de consolidación."),
    ("student-marta-lopez-romero", "Marta López Romero", "reinforcement", "Baja-media", "Necesita explicaciones paso a paso y menor carga inicial."),
    ("student-lucia-moreno-gil", "Lucía Moreno Gil", "reinforcement", "Baja-media", "Mejora con ejemplos resueltos y vocabulario sencillo."),
    ("student-claudia-ibanez-serrano", "Claudia Ibáñez Serrano", "reinforcement", "Baja-media", "Requiere tareas progresivas y apoyo visual."),
    ("student-daniel-gomez-leon", "Daniel Gómez León", "reinforcement", "Baja-media", "Necesita comprobar cada paso antes de avanzar."),
    ("student-ismael-torres-pardo", "Ismael Torres Pardo", "reinforcement", "Baja-media", "Necesita andamiaje inicial y revisión frecuente."),
    ("student-lucia-vega-ramirez", "Lucía Vega Ramírez", "extension", "Alta", "Prefiere retos abiertos y justificar decisiones."),
    ("student-sergio-lopez-campos", "Sergio López Campos", "extension", "Alta", "Puede optimizar soluciones y comparar alternativas."),
    ("student-hugo-prieto-arias", "Hugo Prieto Arias", "extension", "Alta", "Trabaja bien con investigación autónoma."),
]


def normalize_email_local(full_name: str) -> str:
    replacements = str.maketrans("áéíóúüñÁÉÍÓÚÜÑ", "aeiouunAEIOUUN")
    parts = full_name.translate(replacements).lower().split()
    first_name = parts[0]
    first_surname = parts[-2].replace(" ", "")
    second_surname = parts[-1].replace(" ", "")
    return f"{first_name}{first_surname[:3]}{second_surname[:3]}"


def student_email(full_name: str) -> str:
    return f"{normalize_email_local(full_name)}{DOMAIN}"


CURRICULUM = {
    "module-an4699-programacion": {
        "outcomes": [
            ("RA1", "Reconoce la estructura de un programa informático e identifica los elementos básicos del lenguaje.", 6),
            ("RA2", "Escribe y depura código utilizando estructuras de control del lenguaje.", 6),
            ("RA3", "Organiza programas mediante funciones, módulos y estructuras de datos sencillas.", 6),
            ("RA4", "Desarrolla soluciones básicas documentando pruebas y resultados.", 6),
        ],
        "templates": [
            ("UT1", "Entorno de trabajo y primeros programas", "RA1", 18),
            ("UT2", "Manipulación de datos con Python", "RA2", 26),
            ("UT3", "Funciones y modularización", "RA3", 24),
            ("UT4", "Proyecto guiado de programación", "RA4", 28),
        ],
    },
    "module-0377-asgbd": {
        "outcomes": [
            ("RA1", "Implanta sistemas gestores de bases de datos analizando sus características y ajustándose a los requerimientos del sistema.", 10),
            ("RA2", "Configura el sistema gestor de bases de datos interpretando especificaciones técnicas y requisitos de explotación.", 8),
            ("RA3", "Implanta métodos de control de acceso utilizando asistentes, herramientas gráficas y comandos del sistema gestor.", 8),
            ("RA4", "Automatiza tareas de administración del gestor describiéndolas y utilizando guiones de sentencias.", 8),
            ("RA5", "Optimiza el rendimiento del sistema aplicando técnicas de monitorización y realizando adaptaciones.", 8),
            ("RA6", "Aplica criterios de disponibilidad analizándolos y ajustando la configuración del sistema gestor.", 7),
        ],
        "templates": [
            ("UT1", "Instalación y configuración de un sistema gestor de base de datos", "RA1", 16),
            ("UT2", "Configuración de un sistema gestor de base de datos", "RA2", 14),
            ("UT3", "Acceso a la información y control de permisos", "RA3", 14),
            ("UT4", "Automatización de tareas administrativas", "RA4", 14),
            ("UT5", "Optimización y monitorización del rendimiento", "RA5", 14),
            ("UT6", "Disponibilidad, replicación y bases de datos distribuidas", "RA6", 12),
        ],
    },
    "module-0379-proyecto-intermodular": {
        "outcomes": [
            ("RA1", "Identifica necesidades del proyecto intermodular y define objetivos técnicos viables.", 8),
            ("RA2", "Diseña una solución integrada documentando requisitos, planificación y recursos.", 8),
            ("RA3", "Implementa y verifica una solución técnica coordinada con los módulos del ciclo.", 8),
            ("RA4", "Presenta, defiende y evalúa el proyecto aplicando criterios de calidad y mejora.", 9),
        ],
        "templates": [
            ("UT1", "Definición del reto y análisis de necesidades", "RA1", 14),
            ("UT2", "Diseño técnico y planificación", "RA2", 16),
            ("UT3", "Implementación, pruebas y documentación", "RA3", 22),
            ("UT4", "Presentación, defensa y evaluación", "RA4", 12),
        ],
    },
}


def criterion_text(outcome_code: str, index: int, subject_id: str) -> str:
    letters = "abcdefghijklmnopqrstuvwxyz"
    code = f"{outcome_code[-1]}.{letters[index]}"
    if subject_id == "module-0377-asgbd" and outcome_code == "RA1":
        specific = [
            "Se ha reconocido la utilidad y función de los elementos de un SGBD.",
            "Se han analizado las características de los principales SGBD.",
            "Se ha seleccionado el sistema gestor de bases de datos.",
            "Se ha identificado el software necesario para la instalación.",
            "Se ha verificado el cumplimiento de requisitos hardware.",
            "Se han instalado sistemas gestores de bases de datos.",
            "Se ha documentado el proceso de instalación.",
            "Se han interpretado mensajes de error y ficheros de registro.",
            "Se han resuelto incidencias de la instalación.",
            "Se ha verificado el funcionamiento del sistema gestor.",
        ]
        return f"{code}) {specific[index]}"
    return f"{code}) Criterio curricular {code} asociado a {outcome_code} para el entorno de demostración."


def template_contents(title: str) -> list[str]:
    return [
        f"Conceptos clave de {title.lower()}",
        "Procedimiento guiado",
        "Práctica aplicada",
        "Síntesis y comprobación",
    ]
