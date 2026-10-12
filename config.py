"""
Configuration and model definitions for the Multi-Model AI CLI application.
"""

PROVIDERS = {
    "1": {
        "id": "openai",
        "name": "OpenAI",
        "env_key": "OPENAI_API_KEY",
        "description": "GPT-4o, GPT-4o-mini, o1 reasoning models",
        "models": [
            {
                "id": "gpt-4o",
                "name": "GPT-4o",
                "desc": "Flagship multimodal, high-intelligence model",
            },
            {
                "id": "gpt-4o-mini",
                "name": "GPT-4o Mini",
                "desc": "Fast, cost-effective, high performance",
            },
            {
                "id": "o1-mini",
                "name": "o1-mini",
                "desc": "Specialized reasoning model for coding & math",
            },
            {
                "id": "gpt-4-turbo",
                "name": "GPT-4 Turbo",
                "desc": "High accuracy with wide knowledge cutoff",
            },
        ],
    },
    "2": {
        "id": "gemini",
        "name": "Google Gemini",
        "env_key": "GEMINI_API_KEY",
        "description": "Gemini 1.5 Pro, 1.5 Flash, 2.0 Flash",
        "models": [
            {
                "id": "gemini-1.5-flash",
                "name": "Gemini 1.5 Flash",
                "desc": "Fastest and most cost-effective Gemini model",
            },
            {
                "id": "gemini-1.5-pro",
                "name": "Gemini 1.5 Pro",
                "desc": "Highly capable model for complex reasoning",
            },
            {
                "id": "gemini-2.0-flash",
                "name": "Gemini 2.0 Flash",
                "desc": "Next-generation fast multimodal model",
            },
            {
                "id": "gemini-1.5-flash-8b",
                "name": "Gemini 1.5 Flash-8B",
                "desc": "Ultralight high-throughput model",
            },
        ],
    },
    "3": {
        "id": "claude",
        "name": "Anthropic Claude",
        "env_key": "ANTHROPIC_API_KEY",
        "description": "Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus",
        "models": [
            {
                "id": "claude-3-5-sonnet-20241022",
                "name": "Claude 3.5 Sonnet",
                "desc": "Anthropic's smartest model, best for coding & nuance",
            },
            {
                "id": "claude-3-5-haiku-20241022",
                "name": "Claude 3.5 Haiku",
                "desc": "Ultra-fast response with high intelligence",
            },
            {
                "id": "claude-3-opus-20240229",
                "name": "Claude 3 Opus",
                "desc": "Deep reasoning for complex open-ended tasks",
            },
        ],
    },
    "4": {
        "id": "other",
        "name": "Other models",
        "description": "DeepSeek, Groq, OpenRouter, Mistral, Local / Ollama",
        "sub_providers": {
            "1": {
                "name": "DeepSeek",
                "base_url": "https://api.deepseek.com/chat/completions",
                "env_key": "DEEPSEEK_API_KEY",
                "models": [
                    {
                        "id": "deepseek-chat",
                        "name": "DeepSeek-V3 (deepseek-chat)",
                        "desc": "General conversational and coding model",
                    },
                    {
                        "id": "deepseek-reasoner",
                        "name": "DeepSeek-R1 (deepseek-reasoner)",
                        "desc": "Advanced reasoning with thought-chain",
                    },
                ],
            },
            "2": {
                "name": "Groq",
                "base_url": "https://api.groq.com/openai/v1/chat/completions",
                "env_key": "GROQ_API_KEY",
                "models": [
                    {
                        "id": "llama-3.3-70b-versatile",
                        "name": "Llama 3.3 70B (Versatile)",
                        "desc": "Ultra-fast open weights flagship",
                    },
                    {
                        "id": "deepseek-r1-distill-llama-70b",
                        "name": "DeepSeek R1 Distill 70B",
                        "desc": "Fast reasoning on Groq LPU hardware",
                    },
                    {
                        "id": "mixtral-8x7b-32768",
                        "name": "Mixtral 8x7B",
                        "desc": "Balanced MoE model with 32k context",
                    },
                ],
            },
            "3": {
                "name": "OpenRouter",
                "base_url": "https://openrouter.ai/api/v1/chat/completions",
                "env_key": "OPENROUTER_API_KEY",
                "models": [
                    {
                        "id": "openai/gpt-4o-mini",
                        "name": "GPT-4o Mini (OpenRouter)",
                        "desc": "Fast & low-cost multi-model routing",
                    },
                    {
                        "id": "meta-llama/llama-3.3-70b-instruct",
                        "name": "Llama 3.3 70B Instruct",
                        "desc": "Leading open-weight model",
                    },
                    {
                        "id": "deepseek/deepseek-chat",
                        "name": "DeepSeek V3 (OpenRouter)",
                        "desc": "DeepSeek routed via OpenRouter",
                    },
                ],
            },
            "4": {
                "name": "Custom OpenAI-Compatible API",
                "base_url": "custom",
                "env_key": "CUSTOM_API_KEY",
                "models": [],
            },
        },
    },
}
