"""
Flask Web Server hosting the Multi-Model AI Assistant Web UI.
"""

from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from config import PROVIDERS
from ai_client import AIClient
import os

base_dir = os.path.dirname(os.path.abspath(__file__))
template_dir = os.path.join(base_dir, "templates")
static_dir = os.path.join(base_dir, "static")

app = Flask(
    __name__,
    template_folder=template_dir,
    static_folder=static_dir,
    static_url_path="/static"
)
CORS(app)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/config", methods=["GET"])
def get_config():
    """Returns the providers and models list to the frontend."""
    return jsonify({"providers": PROVIDERS})


@app.route("/api/share-info", methods=["GET"])
def get_share_info():
    """Returns shareable URLs for public internet and local network access."""
    import socket
    local_ip = "127.0.0.1"
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        pass

    port = int(os.environ.get("PORT", 5000))
    public_url = os.environ.get(
        "PUBLIC_URL",
        "https://relationship-creatures-denied-mozilla.trycloudflare.com"
    )

    return jsonify({
        "public_url": public_url,
        "lan_url": f"http://{local_ip}:{port}",
        "localhost_url": f"http://localhost:{port}",
        "local_ip": local_ip,
        "port": port
    })


@app.route("/api/chat", methods=["POST"])
def chat():
    """Proxies chat requests to the selected AI provider."""
    data = request.get_json() or {}
    provider_id = data.get("provider_id")
    model_id = data.get("model_id")
    api_key = data.get("api_key", "").strip()
    base_url = data.get("base_url")
    messages = data.get("messages", [])

    if not provider_id or not model_id:
        return jsonify({"success": False, "error": "Provider and Model must be selected."}), 400

    if not api_key:
        # Fallback to server env var if available
        env_map = {
            "openai": "OPENAI_API_KEY",
            "gemini": "GEMINI_API_KEY",
            "claude": "ANTHROPIC_API_KEY",
        }
        env_var = env_map.get(provider_id)
        if env_var and os.getenv(env_var):
            api_key = os.getenv(env_var)
        else:
            return jsonify({"success": False, "error": "Please provide a valid API key."}), 400

    if not messages:
        return jsonify({"success": False, "error": "Message history cannot be empty."}), 400

    client = AIClient(
        provider_id=provider_id,
        model_id=model_id,
        api_key=api_key,
        base_url=base_url,
    )

    success, response_text = client.chat(messages)

    if success:
        return jsonify({"success": True, "reply": response_text})
    else:
        return jsonify({"success": False, "error": response_text}), 502


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"[*] nammaAPI Web App starting on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
