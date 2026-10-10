import httpx
from typing import Optional, Dict, Any
from backend.app.config import settings

def call_ollama(prompt: str, system_prompt: Optional[str] = None, timeout: float = 30.0) -> Optional[str]:
    """
    Calls the local Ollama API running gpt-oss:120b-cloud.
    """
    url = f"{settings.ollama_base_url.rstrip('/')}/api/generate"
    payload: Dict[str, Any] = {
        "model": settings.ollama_model,
        "prompt": prompt,
        "stream": False
    }
    if system_prompt:
        payload["system"] = system_prompt

    try:
        with httpx.Client(timeout=timeout) as client:
            resp = client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("response", "").strip()
    except Exception as e:
        print(f"[Ollama LLM Error] {e}")
        return None
    return None

def ask_engineering_llm(project_context: Dict[str, Any], question: str) -> Optional[str]:
    """
    Uses gpt-oss:120b-cloud to reason about project requirements, architecture, pinouts, and decisions.
    """
    system_prompt = (
        "You are CircuitMind's Lead AI Hardware & Embedded Systems Engineer. "
        "You analyze structured electronics project models (microcontrollers, pin mappings, sensors, actuators, firmware, verification tests). "
        "Answer the user's question accurately based on the provided project specification and engineering best practices. "
        "Keep answers concise, technical, and directly referencing physical pinouts and electrical characteristics."
    )

    proj_summary = (
        f"Project Title: {project_context.get('title')}\n"
        f"Microcontroller: {project_context.get('board', {}).get('display_name')} ({project_context.get('board', {}).get('architecture')})\n"
        f"Logic Voltage: {project_context.get('board', {}).get('voltage_logic')}V\n"
        f"Components: {', '.join([c.get('name', '') for c in project_context.get('components', [])])}\n"
        f"Pin Assignments:\n" +
        "\n".join([f" - {pa.get('component_id')}:{pa.get('component_pin')} -> Board Pin {pa.get('board_pin')} ({pa.get('signal_type')})" for pa in project_context.get('pin_assignments', [])]) +
        f"\nRequirements:\n" +
        "\n".join([f" - [{r.get('id')}] {r.get('description')}" for r in project_context.get('requirements', [])])
    )

    user_prompt = f"Project Context:\n{proj_summary}\n\nQuestion: {question}"
    return call_ollama(prompt=user_prompt, system_prompt=system_prompt)
