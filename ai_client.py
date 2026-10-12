"""
Unified API client for Anthropic Claude, OpenAI, Google Gemini, and OpenAI-compatible providers.
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
    ):
        self.provider_id = provider_id
        self.model_id = model_id
        self.api_key = api_key.strip()
        self.base_url = base_url
        self.timeout = 60

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
            elif self.provider_id == "gemini":
                return self._chat_gemini(messages)
            elif self.provider_id == "other":
                return self._chat_openai_compatible(messages)
            else:
                return False, f"Unknown provider: {self.provider_id}"
        except requests.exceptions.Timeout:
            return False, "Request timed out after 60 seconds. Please try again."
        except requests.exceptions.ConnectionError:
            return False, "Network connection error. Please check your internet connection."
        except Exception as e:
            return False, f"Unexpected error: {str(e)}"

    def _chat_anthropic(self, messages: List[Dict[str, str]]) -> Tuple[bool, str]:
        """Anthropic Claude Messages API."""
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

        # Filter out system messages or separate system prompt if needed
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
            "max_tokens": 4096,
            "messages": formatted_messages,
        }
        if system_prompt:
            payload["system"] = system_prompt

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
        """OpenAI Chat Completions API."""
        url = "https://api.openai.com/v1/chat/completions"
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
        """Google Gemini generateContent API."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_id}:generateContent?key={self.api_key}"
        headers = {
            "Content-Type": "application/json",
        }

        # Convert standard messages to Gemini format:
        # role 'assistant' is mapped to 'model'
        # role 'user' stays 'user'
        contents = []
        for msg in messages:
            role = "model" if msg["role"] == "assistant" else "user"
            if contents and contents[-1]["role"] == role:
                # Merge consecutive same-role turns for Gemini API compliance
                contents[-1]["parts"][0]["text"] += "\n\n" + msg["content"]
            else:
                contents.append({
                    "role": role,
                    "parts": [{"text": msg["content"]}]
                })

        # Ensure first message is from 'user'
        if contents and contents[0]["role"] != "user":
            contents.insert(0, {"role": "user", "parts": [{"text": "Hello"}]})

        payload = {"contents": contents}

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

    def _chat_openai_compatible(self, messages: List[Dict[str, str]]) -> Tuple[bool, str]:
        """OpenAI-compatible API for DeepSeek, Groq, OpenRouter, Mistral, Local."""
        if not self.base_url:
            return False, "Base URL is required for OpenAI-compatible provider."

        url = self.base_url
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
                content = choices[0]["message"].get("content", "")
                return True, content.strip()
            return False, "No response choices returned."
        else:
            try:
                err_data = response.json()
                err_msg = err_data.get("error", {}).get("message", response.text)
            except Exception:
                err_msg = response.text
            return False, f"API Error ({response.status_code}): {err_msg}"
