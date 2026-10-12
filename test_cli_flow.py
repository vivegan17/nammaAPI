"""
Test CLI flow with simulated user input.
"""

import unittest
from unittest.mock import patch, MagicMock
from io import StringIO
import cli
from config import PROVIDERS


class TestCLIFlow(unittest.TestCase):

    @patch("cli.Prompt.ask")
    def test_step_choose_provider_claude(self, mock_ask):
        # User enters '3' for Anthropic Claude
        mock_ask.return_value = "3"
        choice, data = cli.step_choose_provider()
        self.assertEqual(choice, "3")
        self.assertEqual(data["name"], "Anthropic Claude")

    @patch("cli.Prompt.ask")
    def test_step_choose_model_claude_preset(self, mock_ask):
        # User selects '1' (Claude 3.5 Sonnet)
        mock_ask.return_value = "1"
        provider_data = PROVIDERS["3"]
        provider_id, model_id, base_url, display_name, env_key = cli.step_choose_model(provider_data)

        self.assertEqual(provider_id, "claude")
        self.assertEqual(model_id, "claude-3-5-sonnet-20241022")
        self.assertEqual(display_name, "Anthropic Claude")

    @patch("cli.Prompt.ask")
    def test_step_choose_model_claude_custom(self, mock_ask):
        # User selects custom option ('4'), then types 'claude-next-gen'
        mock_ask.side_effect = ["4", "claude-next-gen"]
        provider_data = PROVIDERS["3"]
        provider_id, model_id, base_url, display_name, env_key = cli.step_choose_model(provider_data)

        self.assertEqual(provider_id, "claude")
        self.assertEqual(model_id, "claude-next-gen")

    @patch("cli.Prompt.ask")
    def test_step_choose_model_other_groq(self, mock_ask):
        # User selects Groq ('2'), then model '1' (llama-3.3-70b-versatile)
        mock_ask.side_effect = ["2", "1"]
        provider_data = PROVIDERS["4"]
        provider_id, model_id, base_url, display_name, env_key = cli.step_choose_model(provider_data)

        self.assertEqual(provider_id, "other")
        self.assertEqual(model_id, "llama-3.3-70b-versatile")
        self.assertIn("groq.com", base_url)
        self.assertEqual(display_name, "Groq")

    @patch("cli.Prompt.ask")
    def test_step_enter_api_key(self, mock_ask):
        mock_ask.return_value = "sk-ant-test-key-12345"
        key = cli.step_enter_api_key("Anthropic Claude", "claude-3-5-sonnet-20241022", "ANTHROPIC_API_KEY")
        self.assertEqual(key, "sk-ant-test-key-12345")


if __name__ == "__main__":
    unittest.main()
