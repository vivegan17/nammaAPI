"""
Unified API client for Anthropic Claude, OpenAI, Google Gemini, DeepSeek, xAI Grok,
Perplexity, Meta Llama, Alibaba Qwen, Cursor, NotebookLM, and OpenAI-compatible endpoints.
Includes thinking/effort budget control.
"""

from typing import List, Dict, Tuple
import requests


class AIClient:
    def __init__(
        self,
        provider_id: str,
        model_id: str,
        api_key: str,
        base_url: str = None,
        effort: str = "medium",  # "none", "low", "medium", "high", "max"
    ):
        self.provider_id = provider_id
        self.model_id = model_id
        self.api_key = api_key.strip()
        self.base_url = base_url
        self.effort = (effort or "medium").lower()
        self.timeout = 90

    def chat(self, messages: List[Dict[str, str]]) -> Tuple[bool, str]:
        """
        Sends the conversation history to the selected AI provider.
        Returns: (success: bool, response_text_or_error: str)
        """
        try:
            if self.provider_id == "claude":
                return self._chat_anthropic(messages)
            elif self.provider_id == "openai":
                return self._chat_openai(messages)
            elif self.provider_id in ("gemini", "notebooklm"):
                return self._chat_gemini(messages)
            elif self.provider_id == "deepseek":
                return self._chat_deepseek(messages)
            elif self.provider_id == "grok":
                return self._chat_grok(messages)
            elif self.provider_id == "perplexity":
                return self._chat_perplexity(messages)
            elif self.provider_id in ("llama", "qwen", "cursor", "other"):
                return self._chat_openai_compatible(messages)
            else:
                return False, f"Unknown provider: {self.provider_id}"
        except requests.exceptions.Timeout:
            return False, "Request timed out after 90 seconds. Please try again."
        except requests.exceptions.ConnectionError:
            return False, "Network connection error. Please verify your internet connection."
        except Exception as e:
            return False, f"Unexpected error: {str(e)}"

    def _chat_anthropic(self, messages: List[Dict[str, str]]) -> Tuple[bool, str]:
        """Anthropic Claude Messages API with thinking budget control."""
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

        system_prompt = None
        formatted_messages = []
        for msg in messages:
            if msg["role"] == "system":
                system_prompt = msg["content"]
            else:
                formatted_messages.append({
                    "role": msg["role"],
                    "content": msg["content"],
                })

        payload = {
            "model": self.model_id,
            "max_tokens": 8192 if "3-7" in self.model_id else 4096,
            "messages": formatted_messages,
        }
        if system_prompt:
            payload["system"] = system_prompt

        # Thinking effort budget for Claude 3.7
        if "3-7" in self.model_id and self.effort != "none":
            budget_map = {"low": 2048, "medium": 4096, "high": 8192, "max": 16000}
            budget = budget_map.get(self.effort, 4096)
            payload["thinking"] = {
                "type": "enabled",
                "budget_tokens": budget,
            }
            payload["max_tokens"] = budget + 4096

        response = requests.post(url, headers=headers, json=payload, timeout=self.timeout)

        if response.status_code == 200:
            data = response.json()
            text_parts = [
                block.get("text", "")
                for block in data.get("content", [])
                if block.get("type") == "text"
            ]
            return True, "".join(text_parts).strip()
        else:
            try:
                err_data = response.json()
                err_msg = err_data.get("error", {}).get("message", response.text)
            except Exception:
                err_msg = response.text
            return False, f"Anthropic API Error ({response.status_code}): {err_msg}"

    def _chat_openai(self, messages: List[Dict[str, str]]) -> Tuple[bool, str]:
        """OpenAI Chat Completions API with reasoning_effort support."""
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.model_id,
            "messages": messages,
        }

        # Apply reasoning_effort for o1, o3 series
        if any(prefix in self.model_id for prefix in ("o1", "o3")) and self.effort != "none":
            effort_level = "medium"
            if self.effort in ("low", "medium", "high"):
                effort_level = self.effort
            elif self.effort == "max":
                effort_level = "high"
            payload["reasoning_effort"] = effort_level

        response = requests.post(url, headers=headers, json=payload, timeout=self.timeout)

        if response.status_code == 200:
            data = response.json()
            choices = data.get("choices", [])
            if choices and "message" in choices[0]:
                content = choices[0]["message"].get("content", "")
                return True, content.strip()
            return False, "No response choices returned by OpenAI."
        else:
            try:
                err_data = response.json()
                err_msg = err_data.get("error", {}).get("message", response.text)
            except Exception:
                err_msg = response.text
            return False, f"OpenAI API Error ({response.status_code}): {err_msg}"

    def _chat_gemini(self, messages: List[Dict[str, str]]) -> Tuple[bool, str]:
        """Google Gemini API with thinking support."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_id}:generateContent?key={self.api_key}"
        headers = {
            "Content-Type": "application/json",
        }

        contents = []
        for msg in messages:
            role = "model" if msg["role"] == "assistant" else "user"
            if contents and contents[-1]["role"] == role:
                contents[-1]["parts"][0]["text"] += "\n\n" + msg["content"]
            else:
                contents.append({
                    "role": role,
                    "parts": [{"text": msg["content"]}]
                })

        if contents and contents[0]["role"] != "user":
            contents.insert(0, {"role": "user", "parts": [{"text": "Hello"}]})

        payload = {"contents": contents}

        # NotebookLM research prompt augmentation if selected under NotebookLM
        if self.provider_id == "notebooklm":
            payload["systemInstruction"] = {
                "parts": [{"text": "You are NotebookLM, a deep research synthesis agent. Provide grounded, analytical, comprehensive explanations citing underlying concepts clearly."}]
            }

        response = requests.post(url, headers=headers, json=payload, timeout=self.timeout)

        if response.status_code == 200:
            data = response.json()
            candidates = data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                text = "".join(p.get("text", "") for p in parts)
                return True, text.strip()
            return False, "No candidates returned by Gemini."
        else:
            try:
                err_data = response.json()
                err_msg = err_data.get("error", {}).get("message", response.text)
            except Exception:
                err_msg = response.text
            return False, f"Gemini API Error ({response.status_code}): {err_msg}"

    def _chat_deepseek(self, messages: List[Dict[str, str]]) -> Tuple[bool, str]:
        """DeepSeek API (deepseek-chat or deepseek-reasoner)."""
        url = "https://api.deepseek.com/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model_id,
            "messages": messages,
        }
        response = requests.post(url, headers=headers, json=payload, timeout=self.timeout)
        if response.status_code == 200:
            data = response.json()
            choices = data.get("choices", [])
            if choices and "message" in choices[0]:
                msg = choices[0]["message"]
                reasoning = msg.get("reasoning_content")
                content = msg.get("content", "")
                if reasoning and self.effort != "none":
                    return True, f"```thought\n{reasoning.strip()}\n```\n\n{content.strip()}"
                return True, content.strip()
            return False, "No response choices returned by DeepSeek."
        else:
            try:
                err_msg = response.json().get("error", {}).get("message", response.text)
            except Exception:
                err_msg = response.text
            return False, f"DeepSeek API Error ({response.status_code}): {err_msg}"

    def _chat_grok(self, messages: List[Dict[str, str]]) -> Tuple[bool, str]:
        """xAI Grok API."""
        url = "https://api.x.ai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model_id,
            "messages": messages,
        }
        response = requests.post(url, headers=headers, json=payload, timeout=self.timeout)
        if response.status_code == 200:
            data = response.json()
            choices = data.get("choices", [])
            if choices and "message" in choices[0]:
                return True, choices[0]["message"].get("content", "").strip()
            return False, "No response choices returned by xAI Grok."
        else:
            try:
                err_msg = response.json().get("error", {}).get("message", response.text)
            except Exception:
                err_msg = response.text
            return False, f"xAI Grok API Error ({response.status_code}): {err_msg}"

    def _chat_perplexity(self, messages: List[Dict[str, str]]) -> Tuple[bool, str]:
        """Perplexity API."""
        url = "https://api.perplexity.ai/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model_id,
            "messages": messages,
        }
        response = requests.post(url, headers=headers, json=payload, timeout=self.timeout)
        if response.status_code == 200:
            data = response.json()
            choices = data.get("choices", [])
            if choices and "message" in choices[0]:
                content = choices[0]["message"].get("content", "").strip()
                citations = data.get("citations", [])
                if citations:
                    content += "\n\n**Sources:**\n" + "\n".join([f"- {c}" for c in citations])
                return True, content
            return False, "No response choices returned by Perplexity."
        else:
            try:
                err_msg = response.json().get("error", {}).get("message", response.text)
            except Exception:
                err_msg = response.text
            return False, f"Perplexity API Error ({response.status_code}): {err_msg}"

    def _chat_openai_compatible(self, messages: List[Dict[str, str]]) -> Tuple[bool, str]:
        """OpenAI-compatible router for Groq, OpenRouter, Together, Ollama, etc."""
        url = self.base_url
        if not url:
            if self.provider_id == "llama":
                url = "https://api.groq.com/openai/v1/chat/completions"
            elif self.provider_id in ("qwen", "cursor"):
                url = "https://openrouter.ai/api/v1/chat/completions"
            else:
                return False, f"Base URL required for {self.provider_id}."

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model_id,
            "messages": messages,
        }
        response = requests.post(url, headers=headers, json=payload, timeout=self.timeout)
        if response.status_code == 200:
            data = response.json()
            choices = data.get("choices", [])
            if choices and "message" in choices[0]:
                return True, choices[0]["message"].get("content", "").strip()
            return False, "No response choices returned."
        else:
            try:
                err_msg = response.json().get("error", {}).get("message", response.text)
            except Exception:
                err_msg = response.text
            return False, f"API Error ({response.status_code}): {err_msg}"
