import contextlib
import json
import sys


with contextlib.redirect_stdout(sys.stderr):
    from train_model import model

print(json.dumps({"ready": True}), flush=True)

for line in sys.stdin:
    try:
        request = json.loads(line)
        message = request.get("message") if isinstance(request, dict) else None
        if not isinstance(message, str) or not message.strip():
            raise ValueError("message debe ser una cadena no vacía")

        with contextlib.redirect_stdout(sys.stderr):
            category = str(model.predict([message])[0])
        print(json.dumps({"category": category}), flush=True)
    except Exception as error:
        print(json.dumps({"error": str(error)}), flush=True)