import os
import base64
import json
import openai
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv
from jinja2 import Environment, FileSystemLoader

# Load env vars
load_dotenv()

# Flask and SocketIO setup
app = Flask(__name__)
CORS(app)  # Enable CORS for all origins
socketio = SocketIO(app, cors_allowed_origins="*")

# Load OpenAI key
openai.api_key = os.getenv("OPENAI_API_KEY")

# Jinja2 for prompt rendering
env = Environment(loader=FileSystemLoader("templates"))
prompt_template = env.get_template("aura_prompt.jinja")

# Logging setup
logging.basicConfig(level=logging.INFO)

# In-memory aura history
history = []

# WebSocket client tracking
connected_clients = set()

@socketio.on('connect')
def on_connect():
    connected_clients.add(request.sid)
    logging.info(f"Client connected: {request.sid}. Total clients: {len(connected_clients)}")

@socketio.on('disconnect')
def on_disconnect():
    connected_clients.discard(request.sid)
    logging.info(f"Client disconnected: {request.sid}. Total clients: {len(connected_clients)}")

def broadcast_aura_update(result, webcam_image_b64, screenshot_b64):
    """Emit aura update along with images to all connected WebSocket clients."""
    # Ensure tips is always an array
    tips = result.get('tips', [])
    if not isinstance(tips, list):
        if isinstance(tips, str):
            # Try to parse JSON string
            try:
                parsed_tips = json.loads(tips)
                if isinstance(parsed_tips, list):
                    tips = parsed_tips
                else:
                    tips = [tips]
            except json.JSONDecodeError:
                tips = [tips]
        else:
            # Convert to string and use as single tip
            tips = [str(tips)]
    
    payload = {
        'analysis': result['analysis'],
        'score_change': result['score_change'],
        'updated_score': result['updated_score'],
        'reason': result['reason'],
        'tips': tips,
        'webcam_image': webcam_image_b64,
        'screenshot_image': screenshot_b64
    }
    logging.info(f"Broadcasting aura update to {len(connected_clients)} clients with score_change: {result['score_change']}")
    
    # Check if there are any connected clients
    if not connected_clients:
        logging.warning("No connected WebSocket clients to broadcast to.")
    
    socketio.emit('aura_update', payload)
    logging.info("Aura update broadcasted via WebSocket.")

def validate_base64_image(b64_string):
    try:
        base64.b64decode(b64_string)
        return True
    except Exception as e:
        logging.error(f"Invalid base64 image data: {e}")
        return False

def safe_parse_json(content):
    try:
        return json.loads(content)
    except json.JSONDecodeError as e:
        logging.warning(f"Failed to parse JSON response: {e}")
        return None

@app.route('/analyze_aura', methods=['POST'])
def analyze_aura():
    try:
        data = request.json
        if not data:
            logging.error("Empty request body.")
            return jsonify({'error': 'No JSON data provided in the request.'}), 400

        # print(data)

        webcam_image_b64 = data.get('webcam_image')
        screenshot_b64 = data.get('screenshot')
        current_score = data.get('current_score')

        # print(bool(webcam_image_b64))
        # print(bool(screenshot_b64))
        # print(current_score)

        # Validation
        if not all([webcam_image_b64, screenshot_b64]):
            logging.error("Missing webcam image, screenshot, or current score.")
            return jsonify({'error': 'Missing webcam image, screenshot, or current score.'}), 400

        if not (validate_base64_image(webcam_image_b64) and validate_base64_image(screenshot_b64)):
            logging.error("Invalid base64-encoded image data.")
            return jsonify({'error': 'Invalid base64 image data.'}), 400

        try:
            current_score = int(current_score)
        except ValueError as e:
            logging.error(f"Invalid current_score value: {e}")
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

        # Call OpenAI API to get analysis
        try:
            logging.info("Sending images to GPT-4o...")
            response = openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                max_tokens=500,
                temperature=0.7,
                response_format={"type": "json_object"}
            )

            reply = response.choices[0].message.content
            result = safe_parse_json(reply)

            if not result:
                logging.error("Invalid JSON format returned by GPT-4o.")
                return jsonify({'error': 'Invalid JSON format returned by GPT-4o.'}), 500

            # Validate response contains required keys
            required_keys = {"analysis", "score_change", "reason", "updated_score", "tips"}
            if not required_keys.issubset(result):
                logging.error(f"Missing fields in GPT response: {required_keys.difference(result)}")
                return jsonify({'error': 'Missing fields in GPT response.'}), 500

            # Infinite aura: No clamping
            result['updated_score'] = current_score + result['score_change']

            # Store result and broadcast
            history.append(result)
            broadcast_aura_update(result, webcam_image_b64, screenshot_b64)

            logging.info("Aura analysis completed and broadcasted.")
            return jsonify(result)

        except openai.OpenAIError as e:
            logging.error(f"OpenAI API error: {e}")
            return jsonify({'error': 'OpenAI API error occurred.', 'details': str(e)}), 500

        except Exception as e:
            logging.exception("Unhandled error during aura analysis")
            return jsonify({'error': 'Unhandled server error.', 'details': str(e)}), 500

    except Exception as e:
        logging.exception("Error handling the request")
        return jsonify({'error': 'Failed to process the request.', 'details': str(e)}), 500

def validate_and_normalize_message(message_data):
    """
    Ensure all fields in the message payload are properly formatted.
    - tips field should always be an array
    - score_change should be a number
    - updated_score should be a number
    """
    normalized = {}
    
    # Copy all original fields
    for key, value in message_data.items():
        normalized[key] = value
    
    # Ensure tips is an array
    if 'tips' in normalized:
        tips = normalized['tips']
        if not isinstance(tips, list):
            if isinstance(tips, str):
                try:
                    parsed = json.loads(tips)
                    if isinstance(parsed, list):
                        normalized['tips'] = parsed
                    else:
                        normalized['tips'] = [tips]
                except json.JSONDecodeError:
                    normalized['tips'] = [tips]
            else:
                normalized['tips'] = [str(tips)]
    else:
        normalized['tips'] = []  # Default empty array
    
    # Ensure numeric fields
    for field in ['score_change', 'updated_score']:
        if field in normalized and not isinstance(normalized[field], (int, float)):
            try:
                normalized[field] = float(normalized[field])
            except (ValueError, TypeError):
                normalized[field] = 0
    
    return normalized

@app.route('/test_broadcast', methods=['GET'])
def test_broadcast():
    """Test endpoint to verify WebSocket broadcasting is working."""
    try:
        # Create a test message with simple data
        test_message = {
            'analysis': "This is a test broadcast message.",
            'score_change': 5,
            'updated_score': 100,
            'reason': "Test broadcast from server.",
            'tips': ["Test tip 1", "Test tip 2", "Remember to stay hydrated"],
            'webcam_image': "test_image_data",
            'screenshot_image': "test_screenshot_data"
        }
        
        # Normalize the message to ensure proper format
        normalized_message = validate_and_normalize_message(test_message)
        
        logging.info(f"Broadcasting test message to {len(connected_clients)} clients")
        logging.info(f"Tips data format: {type(normalized_message['tips'])}, length: {len(normalized_message['tips'])}")
        
        # Broadcast the test message
        socketio.emit('aura_update', normalized_message)
        
        return jsonify({
            'success': True,
            'message': "Test broadcast sent",
            'connected_clients': len(connected_clients),
            'normalized_message': normalized_message
        })
    except Exception as e:
        logging.exception("Error sending test broadcast")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    socketio.run(app, debug=True)
