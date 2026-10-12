"""
Command-Line Interface for Multi-Model AI Chat.
Implements the 4-step workflow:
  Step 1: Start application
  Step 2: Choose AI provider & Model
  Step 3: Enter API Key
  Step 4: Start chatting (multi-turn conversation loop)
"""

import os
import sys
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.markdown import Markdown
from rich.prompt import Prompt
from rich.text import Text

from config import PROVIDERS
from ai_client import AIClient

console = Console()


def clear_screen():
    os.system("cls" if os.name == "nt" else "clear")


def render_header():
    header_text = Text()
    header_text.append("nammaAPI - MULTI-MODEL AI HUB\n", style="bold cyan")
    header_text.append("Connect to OpenAI, Google Gemini, Anthropic Claude, & Other Models", style="dim")
    console.print(Panel(header_text, border_style="cyan", expand=False))


def step_choose_provider():
    """Step 2: Choose an AI provider."""
    console.print()
    table = Table(
        title="[bold yellow]Step 2: Choose an AI Provider[/bold yellow]",
        show_header=True,
        header_style="bold magenta",
        border_style="dim",
    )
    table.add_column("Option", style="bold cyan", width=8, justify="center")
    table.add_column("AI Provider", style="bold white", width=22)
    table.add_column("Supported Models / Details", style="dim")

    for key, data in PROVIDERS.items():
        table.add_row(f"[{key}]", data["name"], data.get("description", ""))

    console.print(table)

    while True:
        choice = Prompt.ask(
            "[bold green]Select AI provider[/bold green]",
            choices=list(PROVIDERS.keys()) + ["exit"],
            default="1",
        ).strip().lower()

        if choice == "exit":
            console.print("[dim]Goodbye![/dim]")
            sys.exit(0)

        if choice in PROVIDERS:
            return choice, PROVIDERS[choice]
        console.print("[red]Invalid selection. Please choose an option from the list.[/red]")


def step_choose_model(provider_data):
    """Sub-step: Choose specific model for the selected provider."""
    console.print()
    provider_id = provider_data["id"]

    # Special flow for "Other models" (DeepSeek, Groq, OpenRouter, Custom)
    if provider_id == "other":
        sub_providers = provider_data["sub_providers"]
        sub_table = Table(
            title="[bold yellow]Choose Service / Platform[/bold yellow]",
            show_header=True,
            header_style="bold magenta",
            border_style="dim",
        )
        sub_table.add_column("Option", style="bold cyan", width=8, justify="center")
        sub_table.add_column("Platform", style="bold white", width=30)
        sub_table.add_column("Base Endpoint", style="dim")

        for s_key, s_data in sub_providers.items():
            sub_table.add_row(f"[{s_key}]", s_data["name"], s_data["base_url"])

        console.print(sub_table)

        sub_choice = Prompt.ask(
            "[bold green]Select platform[/bold green]",
            choices=list(sub_providers.keys()),
            default="1",
        )
        selected_sub = sub_providers[sub_choice]

        # Handle custom base URL
        base_url = selected_sub["base_url"]
        if base_url == "custom":
            base_url = Prompt.ask(
                "[bold cyan]Enter custom OpenAI-compatible endpoint URL[/bold cyan]",
                default="http://localhost:11434/v1/chat/completions",
            ).strip()

        # Choose model for this sub provider
        models = selected_sub.get("models", [])
        if models:
            model_table = Table(
                title=f"[bold yellow]Choose Model for {selected_sub['name']}[/bold yellow]",
                show_header=True,
                header_style="bold magenta",
                border_style="dim",
            )
            model_table.add_column("Option", style="bold cyan", width=8, justify="center")
            model_table.add_column("Model Name", style="bold white", width=32)
            model_table.add_column("Description", style="dim")

            for idx, m in enumerate(models, 1):
                model_table.add_row(f"[{idx}]", m["name"], m["desc"])
            custom_opt = len(models) + 1
            model_table.add_row(f"[{custom_opt}]", "Custom Model", "Enter any custom model identifier")

            console.print(model_table)

            valid_choices = [str(i) for i in range(1, custom_opt + 1)]
            m_choice = Prompt.ask(
                "[bold green]Choose model[/bold green]",
                choices=valid_choices,
                default="1",
            )

            if int(m_choice) <= len(models):
                selected_model = models[int(m_choice) - 1]["id"]
            else:
                selected_model = Prompt.ask("[bold cyan]Enter model ID/name[/bold cyan]").strip()
        else:
            selected_model = Prompt.ask(
                "[bold cyan]Enter model name[/bold cyan]",
                default="llama3.2",
            ).strip()

        return provider_id, selected_model, base_url, selected_sub["name"], selected_sub.get("env_key")

    # Flow for standard providers: OpenAI, Google Gemini, Anthropic Claude
    models = provider_data["models"]
    model_table = Table(
        title=f"[bold yellow]Choose Model for {provider_data['name']}[/bold yellow]",
        show_header=True,
        header_style="bold magenta",
        border_style="dim",
    )
    model_table.add_column("Option", style="bold cyan", width=8, justify="center")
    model_table.add_column("Model Name", style="bold white", width=28)
    model_table.add_column("Description", style="dim")

    for idx, m in enumerate(models, 1):
        model_table.add_row(f"[{idx}]", m["name"], m["desc"])
    custom_opt = len(models) + 1
    model_table.add_row(f"[{custom_opt}]", "Custom Model", "Enter a custom model name manually")

    console.print(model_table)

    valid_choices = [str(i) for i in range(1, custom_opt + 1)]
    m_choice = Prompt.ask(
        "[bold green]Choose model[/bold green]",
        choices=valid_choices,
        default="1",
    )

    if int(m_choice) <= len(models):
        selected_model = models[int(m_choice) - 1]["id"]
    else:
        selected_model = Prompt.ask(
            f"[bold cyan]Enter custom {provider_data['name']} model name[/bold cyan]"
        ).strip()

    return provider_id, selected_model, None, provider_data["name"], provider_data.get("env_key")


def step_enter_api_key(provider_name: str, model_id: str, env_key: str):
    """Step 3: Enter the API key."""
    console.print()
    panel_content = Text()
    panel_content.append(f"Step 3: Enter API Key\n", style="bold yellow")
    panel_content.append(f"Selected Provider: {provider_name}\n", style="bold white")
    panel_content.append(f"Selected Model: {model_id}\n", style="cyan")

    existing_env_val = os.getenv(env_key) if env_key else None
    if existing_env_val:
        masked_env = existing_env_val[:4] + "..." + existing_env_val[-4:] if len(existing_env_val) > 8 else "***"
        panel_content.append(f"\n[Found environment variable {env_key}: {masked_env}]\n", style="green")

    console.print(Panel(panel_content, border_style="yellow", expand=False))

    while True:
        prompt_label = f"Enter {provider_name} API Key"
        if existing_env_val:
            prompt_label += " (press Enter to use detected key)"

        api_key = Prompt.ask(
            f"[bold green]{prompt_label}[/bold green]",
            password=True,
            default=existing_env_val if existing_env_val else "",
        ).strip()

        if api_key:
            return api_key
        console.print("[red]API key cannot be empty. Please provide a valid key.[/red]")


def step_chat_loop(client: AIClient, provider_name: str, model_id: str):
    """Step 4: Start chatting repeatedly until exit."""
    clear_screen()
    render_header()

    status_table = Table(show_header=False, box=None)
    status_table.add_row("[bold cyan]Active Provider:[/bold cyan]", f"[bold white]{provider_name}[/bold white]")
    status_table.add_row("[bold cyan]Active Model:[/bold cyan]", f"[bold green]{model_id}[/bold green]")
    status_table.add_row("[bold cyan]Special Commands:[/bold cyan]", "[dim]'exit' or 'quit' to end | 'switch' to change model | 'clear' to reset chat[/dim]")

    console.print(Panel(status_table, title="[bold green]Step 4: Start Chatting[/bold green]", border_style="green"))
    console.print("[dim]Ask any question below. The conversation context will be preserved across turns.[/dim]\n")

    conversation_history = []

    while True:
        try:
            user_input = Prompt.ask("[bold blue]You[/bold blue]").strip()
        except (KeyboardInterrupt, EOFError):
            console.print("\n[dim]Session closed. Goodbye![/dim]")
            break

        if not user_input:
            continue

        cmd = user_input.lower()
        if cmd in ["exit", "quit"]:
            console.print("[bold cyan]Thank you for chatting! Goodbye![/bold cyan]")
            break
        elif cmd == "switch":
            return "switch"
        elif cmd == "clear":
            conversation_history = []
            console.print("[italic yellow]Chat history cleared.[/italic yellow]\n")
            continue
        elif cmd == "help":
            console.print(
                "[dim]Commands:\n"
                " - exit / quit: Exit the application\n"
                " - switch: Change AI provider or model\n"
                " - clear: Clear previous conversation history\n"
                " - help: Show this message\n[/dim]"
            )
            continue

        # Add user message to history
        conversation_history.append({"role": "user", "content": user_input})

        with console.status(f"[bold cyan]Waiting for {model_id}...[/bold cyan]", spinner="dots"):
            success, response_text = client.chat(conversation_history)

        console.print()
        if success:
            console.print(f"[bold green]{model_id}[/bold green]:")
            console.print(Markdown(response_text))
            console.print()
            conversation_history.append({"role": "assistant", "content": response_text})
        else:
            console.print(Panel(
                f"[bold red]API Error:[/bold red]\n{response_text}",
                border_style="red",
                title="Error",
            ))
            # Remove the last user message so history doesn't become invalid
            conversation_history.pop()

            retry_choice = Prompt.ask(
                "[yellow]Would you like to (r)etry, (s)witch model/key, or (c)ontinue?[/yellow]",
                choices=["r", "s", "c"],
                default="r",
            )
            if retry_choice == "s":
                return "switch"
            elif retry_choice == "r":
                conversation_history.append({"role": "user", "content": user_input})
                with console.status(f"[bold cyan]Retrying with {model_id}...[/bold cyan]", spinner="dots"):
                    retry_success, retry_resp = client.chat(conversation_history)
                if retry_success:
                    console.print(f"[bold green]{model_id}[/bold green]:")
                    console.print(Markdown(retry_resp))
                    console.print()
                    conversation_history.append({"role": "assistant", "content": retry_resp})
                else:
                    console.print(Panel(f"[bold red]Retry failed:[/bold red]\n{retry_resp}", border_style="red"))
                    conversation_history.pop()

    return "exit"


def main():
    while True:
        clear_screen()
        render_header()

        # Step 2: Choose AI Provider
        _, provider_data = step_choose_provider()

        # Step 2b: Choose Model
        provider_id, model_id, base_url, display_provider_name, env_key = step_choose_model(provider_data)

        # Step 3: Enter API Key
        api_key = step_enter_api_key(display_provider_name, model_id, env_key)

        # Initialize Client
        client = AIClient(
            provider_id=provider_id,
            model_id=model_id,
            api_key=api_key,
            base_url=base_url,
        )

        # Step 4: Chat Loop
        action = step_chat_loop(client, display_provider_name, model_id)
        if action == "exit":
            break


if __name__ == "__main__":
    try:
        main()
    except (KeyboardInterrupt, EOFError):
        console.print("\n[dim]Process terminated. Bye![/dim]")
