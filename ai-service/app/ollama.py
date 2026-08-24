from __future__ import annotations

import json
import os
import re
from base64 import b64encode
from typing import Any

import httpx
from fastapi import HTTPException

from .schemas import GenerateRequest, GenerateResponse, LearningPath


AI_PROVIDER = os.getenv("AI_PROVIDER", "ollama").strip().lower()
AI_TIMEOUT_SECONDS = float(os.getenv("AI_TIMEOUT_SECONDS", os.getenv("OLLAMA_TIMEOUT_SECONDS", "90")))
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:4b")
GEMINI_API_URL = os.getenv("GEMINI_API_URL", "").rstrip("/")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
PIPER_BASE_URL = os.getenv("PIPER_BASE_URL", "").rstrip("/")
PIPER_TTS_URL = os.getenv("PIPER_TTS_URL", "").rstrip("/")
PIPER_VOICE = os.getenv("PIPER_VOICE", "es_ES-sharvard-medium")
MERMAID_RENDER_URL = os.getenv("MERMAID_RENDER_URL", "").rstrip("/")
FLUX_API_URL = os.getenv("FLUX_API_URL", "").rstrip("/")
COMFYUI_BASE_URL = os.getenv("COMFYUI_BASE_URL", "").rstrip("/")
COMFYUI_PROMPT_URL = os.getenv("COMFYUI_PROMPT_URL", "").rstrip("/")
COMFYUI_WORKFLOW_JSON = os.getenv("COMFYUI_WORKFLOW_JSON", "")

PATH_LABELS: dict[LearningPath, str] = {
    "reinforcement": "Refuerzo",
    "standard": "Estándar",
    "extension": "Ampliación",
}

RESOURCE_TYPE_LABELS = {
    "explanation": "texto explicativo",
    "summary": "resumen de estudio",
    "guided_exercise": "ejercicio guiado",
    "practical_activity": "actividad práctica",
    "extension_challenge": "reto de ampliación",
    "audio": "podcast y guion de audio educativo DUA",
    "podcast_dua": "podcast y guion de audio educativo DUA",
    "mind_map": "mapa mental y esquema visual textual",
    "mapa_mental": "mapa mental y esquema visual textual",
    "image": "imagen educativa generada con IA",
    "study_guide": "guía de estudio",
}


def _compact(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2)


def _safe_mermaid_label(value: str) -> str:
    return value.replace('"', "'").replace("[", "(").replace("]", ")").strip()[:120]


def _mermaid_from_response(response: GenerateResponse) -> str:
    nodes = response.key_points or [response.summary]
    lines = ["flowchart TD", f'  root["{_safe_mermaid_label(response.title)}"]']
    for index, item in enumerate(nodes[:8], start=1):
        node_id = f"n{index}"
        lines.append(f'  {node_id}["{_safe_mermaid_label(str(item))}"]')
        lines.append(f"  root --> {node_id}")
    return "\n".join(lines)


def _visual_prompt_from_response(response: GenerateResponse, request: GenerateRequest) -> str:
    unit_context = ", ".join(f"{unit.get('code', '')} {unit.get('title', '')}".strip() for unit in _unit_context(request))
    return (
        "Imagen educativa clara y accesible para Formacion Profesional. "
        f"Tema: {response.title}. Modulo y unidades: {unit_context}. "
        f"Objetivo: {response.summary}. "
        "Estilo: infografia limpia, alto contraste, sin texto pequeno, apta para alumnado."
    )


def _replace_placeholders(value: Any, prompt: str, title: str) -> Any:
    if isinstance(value, str):
        return value.replace("{{prompt}}", prompt).replace("{{title}}", title)
    if isinstance(value, list):
        return [_replace_placeholders(item, prompt, title) for item in value]
    if isinstance(value, dict):
        return {key: _replace_placeholders(item, prompt, title) for key, item in value.items()}
    return value


def _post_optional_json(url: str, payload: dict[str, Any], service_name: str) -> dict[str, Any]:
    if not url:
        return {"status": "not_configured"}

    try:
        with httpx.Client(timeout=AI_TIMEOUT_SECONDS) as client:
            response = client.post(url, json=payload)
            response.raise_for_status()
            content_type = response.headers.get("content-type", "")
            if "application/json" in content_type:
                return {"status": "ok", "response": response.json()}
            media_type = "audio/wav" if service_name == "Piper" else (content_type or "application/octet-stream")
            return {
                "status": "ok",
                "content_type": media_type,
                "bytes": len(response.content),
                "data_url": f"data:{media_type};base64,{b64encode(response.content).decode('ascii')}",
                "note": "El servicio respondio con contenido binario o no JSON. Configura almacenamiento si necesitas guardar el archivo.",
            }
    except httpx.HTTPError as exc:
        return {"status": "unavailable", "detail": f"{service_name} no disponible: {exc}"}


def _call_piper(response: GenerateResponse) -> dict[str, Any]:
    url = PIPER_TTS_URL or (f"{PIPER_BASE_URL}/synthesize" if PIPER_BASE_URL else "")
    return _post_optional_json(
        url,
        {"text": response.generated_content, "voice": PIPER_VOICE},
        "Piper",
    )


def _call_mermaid(response: GenerateResponse) -> dict[str, Any]:
    code = _mermaid_from_response(response)
    result: dict[str, Any] = {"status": "code_generated", "code": code}
    if MERMAID_RENDER_URL:
        result["render"] = _post_optional_json(MERMAID_RENDER_URL, {"code": code, "format": "svg"}, "Mermaid")
    return result


def _call_flux(response: GenerateResponse, request: GenerateRequest) -> dict[str, Any]:
    prompt = _visual_prompt_from_response(response, request)
    if FLUX_API_URL:
        result = _post_optional_json(FLUX_API_URL, {"prompt": prompt, "title": response.title}, "FLUX")
        result["prompt"] = prompt
        return result

    prompt_url = COMFYUI_PROMPT_URL or (f"{COMFYUI_BASE_URL}/prompt" if COMFYUI_BASE_URL and COMFYUI_WORKFLOW_JSON else "")
    if prompt_url and COMFYUI_WORKFLOW_JSON:
        try:
            workflow = _replace_placeholders(json.loads(COMFYUI_WORKFLOW_JSON), prompt, response.title)
        except json.JSONDecodeError as exc:
            return {"status": "invalid_workflow", "prompt": prompt, "detail": str(exc)}
        result = _post_optional_json(prompt_url, {"prompt": workflow}, "ComfyUI")
        result["prompt"] = prompt
        return result

    if prompt_url and not COMFYUI_WORKFLOW_JSON:
        return {
            "status": "workflow_required",
            "endpoint": prompt_url,
            "prompt": prompt,
            "detail": "ComfyUI esta configurado, pero falta COMFYUI_WORKFLOW_JSON con un workflow que incluya {{prompt}}.",
        }

    return {"status": "prompt_generated", "prompt": prompt}


def _enrich_with_modal_service(result: GenerateResponse, request: GenerateRequest) -> GenerateResponse:
    resource_type = (request.resource_type or "").strip()
    media: dict[str, Any] = {"resource_type": resource_type}

    if resource_type in {"audio", "podcast_dua"}:
        media["audio"] = _call_piper(result)
    elif resource_type in {"mind_map", "mapa_mental"}:
        media["diagram"] = _call_mermaid(result)
    elif resource_type in {"image", "visual", "illustration"}:
        media["image"] = _call_flux(result, request)

    if len(media) > 1:
        result.adaptations["media_generation"] = media
    return result



def _unit_context(request: GenerateRequest) -> list[dict[str, Any]]:
    if request.units:
        return request.units
    return [
        {
            "id": request.unit.id,
            "code": request.unit.code,
            "title": request.unit.title,
            "learning_outcomes": [request.unit.learning_outcome] if request.unit.learning_outcome else [],
            "evaluation_criteria": request.unit.evaluation_criteria,
            "contents": request.unit.contents,
        }
    ]


def _base_context(request: GenerateRequest) -> dict[str, Any]:
    path = request.learning_path or request.student_context.recommended_path
    return {
        "subject": request.subject.model_dump(),
        "active_unit": request.unit.model_dump(),
        "selected_units": _unit_context(request),
        "student_context": request.student_context.model_dump(),
        "learning_path": {
            "code": path,
            "label": PATH_LABELS[path],
        },
        "topic": request.topic,
        "base_content": request.base_content,
        "base_materials": request.base_materials,
        "visible_materials": request.visible_materials,
        "source_materials": request.source_materials,
        "audience": request.audience,
    }


def _student_prompt(request: GenerateRequest) -> str:
    context = _base_context(request)
    return f"""
Eres el asistente educativo contextual de RITM-IA para alumnado de Formación Profesional.
No eres una IA generalista. Responde únicamente con el contexto proporcionado.

Objetivo:
- Resolver la duda real del alumno sin salir del módulo ni de las unidades indicadas.
- Adaptar la respuesta al ritmo de aprendizaje, autonomía, necesidades de apoyo, preferencias y notas docentes.
- No inventar normativa, datos personales ni contenidos no incluidos.
- No resolver entregas evaluables completas: guía, explica, da pistas y comprueba comprensión.

Pregunta literal del alumno:
{request.question or ""}

Contexto pedagógico disponible:
{_compact(context)}

Devuelve exclusivamente un JSON válido con esta forma:
{{
  "title": "título breve y específico",
  "summary": "resumen de una o dos frases",
  "generated_content": "respuesta principal en español, clara y acotada",
  "key_points": ["idea clave 1", "idea clave 2", "idea clave 3"],
  "worked_example": "ejemplo breve si procede",
  "comprehension_question": "pregunta para comprobar comprensión",
  "detected_topic": "tema detectado en snake_case",
  "adaptations": {{
    "learning_path": "{context["learning_path"]["code"]}",
    "scope": "módulo y UT seleccionadas",
    "pedagogical_notes": ["adaptación aplicada"]
  }}
}}
""".strip()


def _teacher_prompt(request: GenerateRequest) -> str:
    context = _base_context(request)
    path = request.learning_path or request.student_context.recommended_path
    resource_type = request.resource_type or "practical_activity"
    return f"""
Eres el servicio de generación pedagógica de RITM-IA para profesorado de Formación Profesional.
No generes una respuesta conversacional: genera un recurso docente listo para revisión.

Objetivo:
- Crear un {RESOURCE_TYPE_LABELS.get(resource_type, resource_type)} para el ritmo {PATH_LABELS[path]}.
- Usar el módulo, UT, resultados de aprendizaje, criterios de evaluación, contenidos y materiales base proporcionados.
- Incorporar las instrucciones libres del docente sin salirse del alcance educativo.
- Si la audiencia es alumnado concreto, adaptar también a su contexto educativo.
- Si la audiencia es un itinerario, generar un recurso publicable para todo el alumnado de ese ritmo.
- Incluir estructura, contenido, actividad o guía según el tipo de recurso solicitado.
- No citar URLs como verificadas si solo aparecen como referencia; preséntalas como recurso aportado por el docente.

Instrucciones literales del docente:
{request.teacher_instructions or "Sin instrucciones adicionales."}

Contexto pedagógico disponible:
{_compact(context)}

Devuelve exclusivamente un JSON válido con esta forma:
{{
  "title": "nombre del recurso",
  "summary": "qué aporta el recurso y para quién está adaptado",
  "generated_content": "recurso completo en español con apartados claros",
  "key_points": ["alineación RA/CE", "adaptación al ritmo", "uso del material base"],
  "worked_example": "ejemplo resuelto si procede",
  "comprehension_question": "pregunta o criterio de comprobación",
  "detected_topic": "tema principal en snake_case",
  "adaptations": {{
    "learning_path": "{path}",
    "resource_type": "{resource_type}",
    "audience": {request.audience or {}},
    "pedagogical_notes": ["decisión de adaptación aplicada"]
  }}
}}
""".strip()


def _student_resource_prompt(request: GenerateRequest) -> str:
    context = _base_context(request)
    path = request.learning_path or request.student_context.recommended_path
    resource_type = request.resource_type or "explanation"
    return f"""
Eres el servicio de generación de materiales de estudio de RITM-IA para alumnado de Formación Profesional.
Genera un recurso de apoyo solicitado por el alumno, no una charla abierta.

Objetivo:
- Crear un {RESOURCE_TYPE_LABELS.get(resource_type, resource_type)} para ayudar a comprender las UT seleccionadas.
- Usar exclusivamente el módulo, UT, resultados de aprendizaje, criterios de evaluación, contenidos, materiales visibles y contexto educativo proporcionados.
- Adaptar el nivel, vocabulario y ayudas al ritmo {PATH_LABELS[path]} y al contexto del alumno.
- Si el recurso es audio, entrega un guion claro con pausas y bloques, no un archivo real.
- Si el recurso es mapa mental, entrega una estructura jerárquica textual con nodos y relaciones.
- Si el recurso es explicación, resumen o guía, entrega apartados claros y accionables.
- No inventes datos personales ni contenidos fuera del contexto.

Solicitud literal del alumno:
{request.question or request.teacher_instructions or ""}

Contexto pedagógico disponible:
{_compact(context)}

Devuelve exclusivamente un JSON válido con esta forma:
{{
  "title": "nombre del recurso generado",
  "summary": "qué contiene el recurso y para qué ayuda",
  "generated_content": "recurso completo en español con estructura clara",
  "key_points": ["idea clave 1", "idea clave 2", "idea clave 3"],
  "worked_example": "ejemplo breve si procede",
  "comprehension_question": "pregunta para comprobar comprensión",
  "detected_topic": "tema principal en snake_case",
  "adaptations": {{
    "learning_path": "{path}",
    "resource_type": "{resource_type}",
    "scope": "módulo y UT seleccionadas",
    "generated_for": "student",
    "pedagogical_notes": ["adaptación aplicada"]
  }}
}}
""".strip()


def build_prompt(request: GenerateRequest) -> str:
    if request.request_mode == "teacher_resource":
        return _teacher_prompt(request)
    if request.request_mode == "student_resource":
        return _student_resource_prompt(request)
    return _student_prompt(request)


def _extract_json(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
      cleaned = cleaned.strip("`").strip()
      if cleaned.lower().startswith("json"):
          cleaned = cleaned[4:].strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start >= 0 and end > start:
            return json.loads(cleaned[start : end + 1])
        raise


def _decode_jsonish_string(value: str) -> str:
    candidate = value.strip()
    try:
        return json.loads(f'"{candidate}"')
    except json.JSONDecodeError:
        return candidate.replace("\\n", "\n").replace("\\t", "\t").replace('\\"', '"').strip()


def _extract_json_string_field(text: str, field: str) -> str:
    match = re.search(rf'"{re.escape(field)}"\s*:\s*"', text)
    if not match:
        return ""

    chars: list[str] = []
    escaped = False
    for char in text[match.end() :]:
        if escaped:
            chars.append("\\")
            chars.append(char)
            escaped = False
            continue
        if char == "\\":
            escaped = True
            continue
        if char == '"':
            return _decode_jsonish_string("".join(chars))
        chars.append(char)

    return _decode_jsonish_string("".join(chars).rstrip(" \n\r\t,}"))


def _fallback_raw_response(text: str, request: GenerateRequest, parse_error: Exception) -> dict[str, Any]:
    resource_type = request.resource_type or "explanation"
    path = request.learning_path or request.student_context.recommended_path
    unit_codes = ", ".join(unit.get("code", "") for unit in _unit_context(request) if unit.get("code"))
    cleaned = text.strip()
    if not cleaned:
        cleaned = (
            "El modelo local no ha devuelto contenido suficiente. "
            "Reformula la solicitud indicando el formato, el material de partida y la unidad de trabajo."
        )
    extracted_content = _extract_json_string_field(cleaned, "generated_content")
    extracted_title = _extract_json_string_field(cleaned, "title")
    extracted_summary = _extract_json_string_field(cleaned, "summary")

    return {
        "title": extracted_title or request.topic or f"{RESOURCE_TYPE_LABELS.get(resource_type, resource_type).title()} RITM-IA",
        "summary": extracted_summary or (
            "Contenido recuperado de una respuesta del modelo local que no cumplia el JSON estricto. "
            "Se conserva para no interrumpir la generacion del recurso."
        ),
        "generated_content": extracted_content or cleaned,
        "key_points": [
            "Respuesta acotada al modulo y unidades seleccionadas",
            f"Unidades: {unit_codes or request.unit.code}",
            f"Ritmo: {PATH_LABELS[path]}",
        ],
        "worked_example": "",
        "comprehension_question": "",
        "detected_topic": request.topic or "recurso_estudio",
        "adaptations": {
            "learning_path": path,
            "resource_type": resource_type,
            "scope": "modulo y UT seleccionadas",
            "parse_recovered": True,
            "parse_warning": str(parse_error),
        },
    }


def _model_response_to_generate_response(text: str, request: GenerateRequest, provider: str, model: str) -> GenerateResponse:
    try:
        raw = _extract_json(text)
    except json.JSONDecodeError as exc:
        raw = _fallback_raw_response(text, request, exc)
    return _normalise_response(raw, request, provider, model)


def _normalise_response(raw: dict[str, Any], request: GenerateRequest, provider: str, model: str) -> GenerateResponse:
    path = request.learning_path or request.student_context.recommended_path
    title = str(raw.get("title") or "Respuesta contextualizada RITM-IA")
    summary = str(raw.get("summary") or "Respuesta generada con el modelo local y acotada al contexto educativo.")
    generated_content = str(raw.get("generated_content") or raw.get("content") or "")
    if not generated_content.strip():
        generated_content = "No se ha podido extraer contenido estructurado del modelo. Reintenta la petición con más contexto."

    adaptations = raw.get("adaptations") if isinstance(raw.get("adaptations"), dict) else {}
    adaptations.setdefault("learning_path", path)
    adaptations.setdefault("model", model)
    adaptations.setdefault("provider", provider)

    key_points = raw.get("key_points") if isinstance(raw.get("key_points"), list) else []
    return GenerateResponse(
        title=title,
        summary=summary,
        generated_content=generated_content,
        adaptations=adaptations,
        key_points=[str(item) for item in key_points],
        worked_example=str(raw.get("worked_example") or "") or None,
        comprehension_question=str(raw.get("comprehension_question") or "") or None,
        detected_topic=str(raw.get("detected_topic") or request.topic or "contextual_query"),
    )


def _generate_with_ollama(prompt: str, request: GenerateRequest) -> GenerateResponse:
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.25,
            "top_p": 0.9,
        },
    }

    try:
        with httpx.Client(timeout=AI_TIMEOUT_SECONDS) as client:
            response = client.post(f"{OLLAMA_BASE_URL}/api/generate", json=payload)
            response.raise_for_status()
            data = response.json()
            return _model_response_to_generate_response(data.get("response", ""), request, "ollama", OLLAMA_MODEL)
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(status_code=503, detail=f"Ollama no pudo generar una respuesta válida: {exc}") from exc


def _gemini_endpoint() -> str:
    if GEMINI_API_URL:
        return GEMINI_API_URL
    return f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"


def _generate_with_gemini(prompt: str, request: GenerateRequest) -> GenerateResponse:
    if not GEMINI_API_KEY or not GEMINI_API_KEY.strip():
        raise HTTPException(
            status_code=503,
            detail=(
                "AI_PROVIDER está configurado como 'gemini', pero GEMINI_API_KEY no se ha definido en el entorno. "
                "Por favor, añade tu clave GEMINI_API_KEY en el archivo .env o en las variables de entorno."
            ),
        )

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.25,
            "topP": 0.9,
        },
    }
    params = {"key": GEMINI_API_KEY.strip()}

    try:
        with httpx.Client(timeout=AI_TIMEOUT_SECONDS) as client:
            response = client.post(_gemini_endpoint(), params=params, json=payload)
            response.raise_for_status()
            data = response.json()
            candidates = data.get("candidates") if isinstance(data, dict) else []
            first_candidate = candidates[0] if candidates else {}
            parts = first_candidate.get("content", {}).get("parts", []) if isinstance(first_candidate, dict) else []
            text = "\n".join(str(part.get("text", "")) for part in parts if isinstance(part, dict))
            return _model_response_to_generate_response(text, request, "gemini", GEMINI_MODEL)
    except (httpx.HTTPError, ValueError, KeyError, IndexError) as exc:
        raise HTTPException(status_code=503, detail=f"Gemini no pudo generar una respuesta válida: {exc}") from exc



def generate_with_ollama(request: GenerateRequest) -> GenerateResponse:
    prompt = build_prompt(request)
    if AI_PROVIDER == "gemini":
        return _enrich_with_modal_service(_generate_with_gemini(prompt, request), request)
    if AI_PROVIDER == "ollama":
        return _enrich_with_modal_service(_generate_with_ollama(prompt, request), request)
    raise HTTPException(status_code=503, detail=f"Proveedor de IA no soportado: {AI_PROVIDER}")
