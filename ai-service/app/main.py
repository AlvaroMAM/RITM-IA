from html import escape

from fastapi import FastAPI
from pydantic import BaseModel

from .schemas import GenerateRequest, GenerateResponse
from .ollama import (
    AI_PROVIDER,
    COMFYUI_BASE_URL,
    COMFYUI_PROMPT_URL,
    COMFYUI_WORKFLOW_JSON,
    FLUX_API_URL,
    GEMINI_API_URL,
    GEMINI_MODEL,
    MERMAID_RENDER_URL,
    OLLAMA_BASE_URL,
    OLLAMA_MODEL,
    PIPER_BASE_URL,
    PIPER_TTS_URL,
    generate_with_ollama,
)

app = FastAPI(title="RITM-IA AI service")


class MermaidRenderRequest(BaseModel):
    code: str
    format: str = "svg"


def _svg_from_mermaid_code(code: str) -> str:
    lines = [line.strip() for line in code.splitlines() if line.strip()]
    width = 960
    row_height = 42
    height = max(180, 52 + len(lines) * row_height)
    text_rows = "\n".join(
        f'<text x="28" y="{48 + index * row_height}" font-family="Atkinson Hyperlegible, Arial, sans-serif" font-size="18" fill="#0b2f2a">{escape(line)}</text>'
        for index, line in enumerate(lines)
    )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" '
        f'aria-label="Mapa visual Mermaid generado por RITM-IA">'
        '<rect width="100%" height="100%" rx="12" fill="#f7f4ec"/>'
        '<rect x="16" y="16" width="928" height="'
        f'{height - 32}" rx="8" fill="#ffffff" stroke="#b8c9c1"/>'
        f"{text_rows}</svg>"
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "ai-service",
        "provider": AI_PROVIDER,
        "model": GEMINI_MODEL if AI_PROVIDER == "gemini" else OLLAMA_MODEL,
        "ollama_base_url": OLLAMA_BASE_URL,
        "gemini_api_url": GEMINI_API_URL,
        "piper_configured": str(bool(PIPER_TTS_URL or PIPER_BASE_URL)).lower(),
        "mermaid_configured": str(bool(MERMAID_RENDER_URL)).lower(),
        "flux_configured": str(bool(FLUX_API_URL or (COMFYUI_BASE_URL and COMFYUI_WORKFLOW_JSON) or COMFYUI_PROMPT_URL)).lower(),
    }


@app.post("/render/mermaid")
def render_mermaid(request: MermaidRenderRequest) -> dict[str, str]:
    return {
        "status": "ok",
        "format": request.format,
        "code": request.code,
        "svg": _svg_from_mermaid_code(request.code),
    }


@app.post("/generate", response_model=GenerateResponse)
def generate(request: GenerateRequest) -> GenerateResponse:
    return generate_with_ollama(request)
