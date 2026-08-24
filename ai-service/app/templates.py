from __future__ import annotations

from .schemas import GenerateRequest, GenerateResponse, LearningPath


PATH_LABELS: dict[LearningPath, str] = {
    "reinforcement": "Refuerzo",
    "standard": "Estándar",
    "extension": "Ampliación",
}


def detect_topic(question: str, explicit_topic: str | None = None) -> str:
    if explicit_topic:
        return explicit_topic
    text = question.lower()
    if "anidado" in text or "dentro de otro if" in text:
        return "nested_conditionals"
    if any(token in text for token in ["if", "else", "condición", "condicion", "condicional"]):
        return "conditionals"
    if any(token in text for token in ["for", "recorrer", "range", "rango"]):
        return "for_loop"
    if "while" in text or "mientras" in text:
        return "while_loop"
    if any(token in text for token in ["break", "continue", "salir del bucle"]):
        return "jump_statements"
    if any(token in text for token in ["error", "depurar", "no funciona", "fallo"]):
        return "debugging"
    if any(token in text for token in ["repetición", "repeticion", "diferencia entre if", "bucle"]):
        return "condition_vs_loop"
    return "ut2_general"


def teacher_resource(request: GenerateRequest) -> GenerateResponse:
    path = request.learning_path or request.student_context.recommended_path
    label = PATH_LABELS[path]
    resource_type = request.resource_type or "practical_activity"
    unit_title = request.unit.title

    variants = {
        "reinforcement": {
            "summary": "Actividad fragmentada, con lenguaje sencillo, pistas explícitas y menor carga inicial.",
            "content": (
                "1. Lee el enunciado con calma.\n"
                "2. Identifica un único dato de entrada.\n"
                "3. Usa un if sencillo para decidir el mensaje.\n"
                "4. Repite el proceso con un while solo cuando el primer paso funcione.\n\n"
                "Ejemplo resuelto:\n"
                "nota = float(input('Nota: '))\n"
                "if nota >= 5:\n"
                "    print('Has superado la actividad')\n"
                "else:\n"
                "    print('Necesitas repasar')\n\n"
                "Ejercicio guiado: añade una comprobación para que la nota esté entre 0 y 10."
            ),
            "adaptations": ["paso a paso", "ejemplo resuelto", "pistas explícitas", "problema fragmentado"],
        },
        "standard": {
            "summary": "Actividad práctica de dificultad media con aplicación directa de condicionales y bucles.",
            "content": (
                "Diseña un programa que solicite calificaciones hasta que el usuario escriba -1. "
                "El programa debe validar cada nota, contar cuántas son aptas y mostrar la media final.\n\n"
                "Requisitos: usar if/elif/else para validar, un while para repetir la entrada y mensajes claros de finalización."
            ),
            "adaptations": ["terminología básica", "ayuda limitada", "criterios de finalización claros"],
        },
        "extension": {
            "summary": "Reto abierto con más condiciones, combinación de estructuras y justificación de decisiones.",
            "content": (
                "Crea un menú de consola para gestionar calificaciones: añadir, listar, calcular media, detectar extremos y salir. "
                "Valida entradas, usa break o continue cuando esté justificado y separa la lógica en funciones.\n\n"
                "Entrega además una breve justificación: por qué has usado while, dónde has aplicado condicionales anidados y qué optimización propondrías."
            ),
            "adaptations": ["reto abierto", "menor andamiaje", "optimización", "justificación técnica"],
        },
    }
    selected = variants[path]
    instructions = f"\n\nInstrucciones docentes incorporadas: {request.teacher_instructions}" if request.teacher_instructions else ""
    base = f"\n\nContenido base usado como referencia: {request.base_content}" if request.base_content else ""

    return GenerateResponse(
        title=f"{resource_type.replace('_', ' ').title()} - {label} - {unit_title}",
        summary=selected["summary"],
        generated_content=f"{selected['content']}{instructions}{base}",
        adaptations={"learning_path": path, "items": selected["adaptations"]},
    )


TOPIC_TITLES = {
    "conditionals": "Estructuras condicionales",
    "nested_conditionals": "Condicionales anidados",
    "for_loop": "Bucles for",
    "while_loop": "Bucles while",
    "jump_statements": "Sentencias break y continue",
    "debugging": "Depuración básica",
    "condition_vs_loop": "Diferencia entre condición y repetición",
    "ut2_general": "Manipulación de datos con Python",
}


def student_explanation(request: GenerateRequest) -> GenerateResponse:
    path = request.student_context.recommended_path
    question = request.question or ""
    topic = detect_topic(question, request.topic)
    title = TOPIC_TITLES.get(topic, TOPIC_TITLES["ut2_general"])

    variants = {
        "reinforcement": {
            "summary": "Explicación breve, paso a paso y con ejemplo completamente resuelto.",
            "content": (
                "Vamos por partes. Primero identifica la pregunta que debe responder el programa. "
                "Después escribe una condición. Si la condición se cumple, se ejecuta un bloque; si no, otro. "
                "Trabaja con un caso sencillo antes de añadir más condiciones."
            ),
            "key_points": ["Una condición responde verdadero o falso.", "Cada bloque debe estar indentado.", "Prueba un caso cada vez."],
            "example": "edad = 17\nif edad >= 18:\n    print('Puede acceder')\nelse:\n    print('Necesita autorización')",
            "question": "Si nota vale 4, ¿qué rama se ejecuta en un if nota >= 5?",
        },
        "standard": {
            "summary": "Explicación directa con terminología básica y ejemplo práctico.",
            "content": (
                "Una estructura de control decide el flujo del programa. En UT2 usamos condicionales para elegir ramas "
                "y bucles para repetir instrucciones mientras se cumple una condición o mientras recorremos una secuencia."
            ),
            "key_points": ["if selecciona ramas.", "while repite mientras una condición sea cierta.", "for recorre una secuencia."],
            "example": "for intento in range(3):\n    clave = input('Clave: ')\n    if clave == 'python':\n        print('Correcto')\n        break",
            "question": "¿Cuándo elegirías while en lugar de for?",
        },
        "extension": {
            "summary": "Explicación concisa con casos límite y comparación de alternativas.",
            "content": (
                "Elige la estructura según el control que necesites. Si conoces el recorrido, for suele ser más claro. "
                "Si dependes de un estado que cambia, while expresa mejor la condición de parada. En problemas reales conviene "
                "separar validación, cálculo y salida para evitar condicionales difíciles de mantener."
            ),
            "key_points": ["Valida los límites.", "Evita anidamientos innecesarios.", "Extrae funciones cuando la lógica crece."],
            "example": "def es_valida(nota):\n    return 0 <= nota <= 10\n\nwhile True:\n    valor = float(input('Nota: '))\n    if es_valida(valor):\n        break",
            "question": "¿Cómo reducirías un condicional anidado sin cambiar el resultado?",
        },
    }
    selected = variants[path]
    return GenerateResponse(
        title=f"{title} adaptado",
        summary=selected["summary"],
        generated_content=selected["content"],
        key_points=selected["key_points"],
        worked_example=selected["example"],
        comprehension_question=selected["question"],
        detected_topic=topic,
        adaptations={"learning_path": path, "question": question},
    )
