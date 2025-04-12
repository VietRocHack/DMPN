import os
import base64
import json
import openai
import logging
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from jinja2 import Environment, FileSystemLoader
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Allow CORS from all origins

env = Environment(loader=FileSystemLoader("templates"))
prompt_template = env.get_template("aura_prompt.jinja")

load_dotenv()

app = Flask(__name__)
openai.api_key = os.getenv("OPENAI_API_KEY")

# Configure logging
logging.basicConfig(level=logging.INFO)

# In-memory storage for previous analyses
history = []

def validate_base64_image(b64_string):
    try:
        base64.b64decode(b64_string)
        return True
    except Exception:
        return False

def safe_parse_json(content):
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        logging.warning("Failed to parse response as JSON.")
        return None

@app.route('/analyze_aura', methods=['POST'])
def analyze_aura():
    data = request.json

    webcam_image_b64 = data.get('webcam_image')
    screenshot_b64 = data.get('screenshot')
    current_score = data.get('current_score')

    # Basic data validation
    if not all([webcam_image_b64, screenshot_b64, current_score]):
        return jsonify({'error': 'Missing webcam image, screenshot, or current score.'}), 400

    # Base64 validation
    if not (validate_base64_image(webcam_image_b64) and validate_base64_image(screenshot_b64)):
        return jsonify({'error': 'One or both images are not valid base64-encoded data.'}), 400

    try:
        current_score = int(current_score)
    except ValueError:
        return jsonify({'error': 'Current score must be an integer.'}), 400

    # Prepare GPT-4o input
    webcam_image_data = {
        "type": "image_url",
        "image_url": {"url": f"data:image/jpeg;base64,{webcam_image_b64}"}
    }
    screenshot_image_data = {
        "type": "image_url",
        "image_url": {"url": f"data:image/jpeg;base64,{screenshot_b64}"}
    }

    system_prompt = prompt_template.render(
        current_score=current_score,
        history=json.dumps(history[-3:], indent=2) if history else ""
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": [
            {"type": "text", "text": f"Current aura score: {current_score}"},
            webcam_image_data,
            screenshot_image_data
        ]}
    ]

    if history:
        messages.insert(1, {"role": "system", "content": f"Previous analyses: {json.dumps(history[-3:])}"})

    try:
        logging.info("Sending images to GPT-4o...")
        response = openai.chat.completions.create(  # Ensure you're using correct method
            model="gpt-4o",
            messages=messages,
            max_tokens=500,
            temperature=0.7,
            response_format={"type": "json_object"}
        )

        reply = response.choices[0].message.content
        print(reply)
        result = safe_parse_json(reply)

        if not result:
            return jsonify({'error': 'Invalid JSON format returned by GPT-4o.'}), 500

        # Validate required keys
        required_keys = {"analysis", "score_change", "reason", "updated_score"}
        if not required_keys.issubset(result):
            return jsonify({'error': 'Missing fields in GPT response.'}), 500

        # Keep score in valid range (0–100)
        result['updated_score'] = max(0, min(100, result['updated_score']))

        history.append(result)
        logging.info("Aura analysis completed successfully.")
        return jsonify(result)

    except openai.OpenAIError as e:
        logging.error("OpenAI API error: %s", str(e))
        return jsonify({'error': 'OpenAI API error occurred.', 'details': str(e)}), 500

    except Exception as e:
        logging.exception("Unhandled error during aura analysis")
        return jsonify({'error': 'Unhandled server error.', 'details': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
