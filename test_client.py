"""
Unit tests for AIClient verifying Anthropic, OpenAI, Gemini, and Other providers.
"""

import unittest
from unittest.mock import patch, MagicMock
from ai_client import AIClient


class TestAIClient(unittest.TestCase):

    @patch("requests.post")
    def test_anthropic_chat_success(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "content": [{"type": "text", "text": "Hello from Claude!"}]
        }
        mock_post.return_value = mock_response

        client = AIClient(
            provider_id="claude",
            model_id="claude-3-5-sonnet-20241022",
            api_key="sk-ant-test-key",
        )
        success, text = client.chat([{"role": "user", "content": "Hi"}])

        self.assertTrue(success)
        self.assertEqual(text, "Hello from Claude!")
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        self.assertEqual(args[0], "https://api.anthropic.com/v1/messages")
        self.assertEqual(kwargs["headers"]["x-api-key"], "sk-ant-test-key")

    @patch("requests.post")
    def test_openai_chat_success(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [{"message": {"content": "Hello from OpenAI!"}}]
        }
        mock_post.return_value = mock_response

        client = AIClient(
            provider_id="openai",
            model_id="gpt-4o",
            api_key="sk-openai-test-key",
        )
        success, text = client.chat([{"role": "user", "content": "Hi"}])

        self.assertTrue(success)
        self.assertEqual(text, "Hello from OpenAI!")
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        self.assertEqual(args[0], "https://api.openai.com/v1/chat/completions")
        self.assertEqual(kwargs["headers"]["Authorization"], "Bearer sk-openai-test-key")

    @patch("requests.post")
    def test_gemini_chat_success(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "candidates": [
                {
                    "content": {
                        "parts": [{"text": "Hello from Gemini!"}]
                    }
                }
            ]
        }
        mock_post.return_value = mock_response

        client = AIClient(
            provider_id="gemini",
            model_id="gemini-1.5-flash",
            api_key="AIzaSy-test-key",
        )
        success, text = client.chat([{"role": "user", "content": "Hi"}])

        self.assertTrue(success)
        self.assertEqual(text, "Hello from Gemini!")
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        self.assertIn("gemini-1.5-flash:generateContent?key=AIzaSy-test-key", args[0])

    @patch("requests.post")
    def test_other_provider_chat_success(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [{"message": {"content": "Hello from DeepSeek/Groq!"}}]
        }
        mock_post.return_value = mock_response

        client = AIClient(
            provider_id="other",
            model_id="deepseek-chat",
            api_key="sk-deepseek-test",
            base_url="https://api.deepseek.com/chat/completions",
        )
        success, text = client.chat([{"role": "user", "content": "Hi"}])

        self.assertTrue(success)
        self.assertEqual(text, "Hello from DeepSeek/Groq!")
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        self.assertEqual(args[0], "https://api.deepseek.com/chat/completions")

    @patch("requests.post")
    def test_api_error_handling(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.json.return_value = {
            "error": {"message": "Invalid API Key provided"}
        }
        mock_post.return_value = mock_response

        client = AIClient(
            provider_id="claude",
            model_id="claude-3-5-sonnet-20241022",
            api_key="invalid-key",
        )
        success, error_msg = client.chat([{"role": "user", "content": "Hi"}])

        self.assertFalse(success)
        self.assertIn("Invalid API Key provided", error_msg)


if __name__ == "__main__":
    unittest.main()
