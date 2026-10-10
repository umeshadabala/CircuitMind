import httpx
import time
import uuid
from typing import Optional, Dict, Any
from backend.app.config import settings

class ProjectGenerationError(Exception):
    """Raised when LLM provider generation or schema parsing fails."""
    pass

def execute_llm_generation(
    prompt: str,
    system_prompt: Optional[str] = None,
    timeout: Optional[float] = None,
    format_json: bool = True
) -> Dict[str, Any]:
    """
    Executes an instrumented call to the configured LLM provider.
    Records Request ID, configured provider, model, HTTP status, and timings.
    Never silently substitutes a canned response if the provider fails.
    """
    req_id = f"req-{uuid.uuid4().hex[:8]}"
    effective_timeout = timeout or settings.llm_timeout_seconds
    start_time = time.time()

    sanitized_summary = prompt.strip().replace("\n", " ")
    if len(sanitized_summary) > 120:
        sanitized_summary = sanitized_summary[:117] + "..."

    audit: Dict[str, Any] = {
        "request_id": req_id,
        "provider": settings.llm_provider,
        "model": settings.ollama_model if settings.llm_provider == "ollama" else settings.llm_provider,
        "input_summary": sanitized_summary,
        "request_sent": False,
        "provider_status": None,
        "response_text": "",
        "response_parsed": False,
        "schema_validated": False,
        "persisted": False,
        "error": None,
        "duration_ms": 0
    }

    if settings.llm_provider == "ollama":
        url = f"{settings.ollama_base_url.rstrip('/')}/api/generate"
        payload: Dict[str, Any] = {
            "model": settings.ollama_model,
            "prompt": prompt,
            "stream": False
        }
        if system_prompt:
            payload["system"] = system_prompt
        if format_json:
            payload["format"] = "json"

        try:
            audit["request_sent"] = True
            with httpx.Client(timeout=effective_timeout) as client:
                resp = client.post(url, json=payload)
                audit["provider_status"] = resp.status_code
                audit["duration_ms"] = int((time.time() - start_time) * 1000)

                if resp.status_code == 200:
                    data = resp.json()
                    resp_text = data.get("response", "").strip()
                    audit["response_text"] = resp_text
                    return audit
                else:
                    err_msg = f"HTTP {resp.status_code}: {resp.text}"
                    audit["error"] = err_msg
                    raise ProjectGenerationError(
                        f"LLM Provider '{settings.llm_provider}' failed with status {resp.status_code}: {resp.text}"
                    )
        except httpx.TimeoutException as e:
            audit["duration_ms"] = int((time.time() - start_time) * 1000)
            audit["error"] = f"Request timed out after {effective_timeout}s: {e}"
            raise ProjectGenerationError(
                f"LLM Provider '{settings.llm_provider}' ({settings.ollama_model}) timed out after {effective_timeout}s."
            ) from e
        except httpx.RequestError as e:
            audit["duration_ms"] = int((time.time() - start_time) * 1000)
            audit["error"] = f"Connection failed to {url}: {e}"
            raise ProjectGenerationError(
                f"LLM Provider '{settings.llm_provider}' unavailable at {url}: {e}"
            ) from e
        except ProjectGenerationError:
            raise
        except Exception as e:
            audit["duration_ms"] = int((time.time() - start_time) * 1000)
            audit["error"] = str(e)
            raise ProjectGenerationError(
                f"Unexpected error calling LLM Provider '{settings.llm_provider}': {e}"
            ) from e

    elif settings.llm_provider == "gemini" and settings.gemini_api_key:
        # Cloud Gemini Provider with multi-model fallback chain (gemini-3.8-flash -> gemini-3.5-flash -> gemini-2.5-flash)
        audit["request_sent"] = True
        candidate_models = [settings.gemini_model, "gemini-3.8-flash", "gemini-3.5-flash", "gemini-2.5-flash"]
        models_to_try = list(dict.fromkeys([m for m in candidate_models if m]))

        payload = {
            "contents": [{"parts": [{"text": f"{system_prompt}\n\n{prompt}" if system_prompt else prompt}]}]
        }
        if format_json:
            payload["generationConfig"] = {"response_mime_type": "application/json"}

        model_errors = []
        with httpx.Client(timeout=effective_timeout) as client:
            for model_name in models_to_try:
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={settings.gemini_api_key}"
                    resp = client.post(url, json=payload)
                    audit["provider_status"] = resp.status_code
                    audit["duration_ms"] = int((time.time() - start_time) * 1000)

                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates and "content" in candidates[0]:
                            parts = candidates[0]["content"].get("parts", [])
                            # Extract clean text, separating any thinking/thought reasoning parts
                            text_parts = [
                                p.get("text", "") for p in parts
                                if p.get("text") and not p.get("thought", False)
                            ]
                            if not text_parts:
                                text_parts = [p.get("text", "") for p in parts if p.get("text")]
                            audit["response_text"] = "".join(text_parts).strip()
                            audit["resolved_model"] = model_name
                            audit["model"] = model_name
                            return audit

                    err_msg = f"{model_name} (HTTP {resp.status_code}: {resp.text[:180]})"
                    model_errors.append(err_msg)
                except httpx.RequestError as e:
                    model_errors.append(f"{model_name} (network error: {e})")
                except Exception as e:
                    model_errors.append(f"{model_name} ({e})")

        audit["duration_ms"] = int((time.time() - start_time) * 1000)
        failure_summary = "; ".join(model_errors) or "No models succeeded"
        audit["error"] = f"Gemini models failed: {failure_summary}"
        raise ProjectGenerationError(f"Gemini API call failed across models: {failure_summary}")

    elif settings.llm_provider == "openai" and settings.openai_api_key:
        audit["request_sent"] = True
        try:
            url = "https://api.openai.com/v1/chat/completions"
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            payload = {
                "model": "gpt-4o",
                "messages": messages,
            }
            if format_json:
                payload["response_format"] = {"type": "json_object"}

            headers = {
                "Authorization": f"Bearer {settings.openai_api_key}",
                "Content-Type": "application/json"
            }

            with httpx.Client(timeout=effective_timeout) as client:
                resp = client.post(url, json=payload, headers=headers)
                audit["provider_status"] = resp.status_code
                audit["duration_ms"] = int((time.time() - start_time) * 1000)
                if resp.status_code == 200:
                    data = resp.json()
                    choices = data.get("choices", [])
                    if choices and "message" in choices[0]:
                        audit["response_text"] = choices[0]["message"].get("content", "").strip()
                        return audit
                err_msg = f"HTTP {resp.status_code}: {resp.text}"
                audit["error"] = err_msg
                raise ProjectGenerationError(f"OpenAI API failed: {err_msg}")
        except Exception as e:
            audit["duration_ms"] = int((time.time() - start_time) * 1000)
            audit["error"] = str(e)
            raise ProjectGenerationError(f"OpenAI API call failed: {e}") from e

    else:
        audit["error"] = f"Unsupported or unconfigured LLM provider: '{settings.llm_provider}'"
        raise ProjectGenerationError(audit["error"])

def call_ollama(prompt: str, system_prompt: Optional[str] = None, timeout: Optional[float] = None) -> Optional[str]:
    """
    Calls the local Ollama API running the configured model.
    """
    effective_timeout = timeout or settings.llm_timeout_seconds
    try:
        audit = execute_llm_generation(
            prompt=prompt,
            system_prompt=system_prompt,
            timeout=effective_timeout,
            format_json=False
        )
        return audit.get("response_text", "").strip() or None
    except Exception as e:
        print(f"[Ollama LLM Warning] {e}")
        return None

def ask_engineering_llm(project_context: Dict[str, Any], question: str) -> Optional[str]:
    """
    Uses the configured model to reason about project requirements, architecture, pinouts, and decisions.
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
