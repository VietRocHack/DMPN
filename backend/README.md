# Developer Monitoring & Productivity App

## Overview

This application is a developer monitoring and productivity tool that analyzes a developer's "aura" based on their webcam and screen images. The "aura" score is a fun, meme-inspired metric that reflects a developer's productivity during their coding sessions. It calculates the aura score by analyzing the images and sends the results back through a Flask API, as well as broadcasting updates via WebSocket to connected clients.

### Key Features:
- Analyzes webcam and screenshot images to calculate a developer's "aura" score.
- Provides a humorous analysis and tips for improving productivity.
- Real-time updates via WebSocket to notify subscribers of aura score changes.
- Integration with GPT-4o for generating analysis and reasons for score changes.

---

## Prerequisites

- Python 3.x
- `pip` package manager
- OpenAI API key (GPT-4o)
- Flask
- Flask-SocketIO
- Flask-CORS
- WebSocket client (for testing)
  
---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/dev-monitoring-productivity.git
cd dev-monitoring-productivity
```

### 2. Install the dependencies

```bash
pip install -r requirements.txt
```

### 3. Set up the environment variables

Create a `.env` file in the root directory of the project and add the following environment variables:

```bash
OPENAI_API_KEY=your-openai-api-key
```

### 4. Create `requirements.txt`

```bash
Flask==2.1.2
Flask-SocketIO==5.3.0
flask-cors==3.1.1
openai==0.27.0
python-dotenv==0.19.2
jinja2==3.0.3
```

---

## Running the Application

### 1. Start the Flask server

You can run the Flask app locally with the following command:

```bash
python app.py
```

By default, the app will run on `http://127.0.0.1:5000`.

### 2. WebSocket communication

The application also supports WebSocket for real-time updates. Make sure your WebSocket client is connected when testing or using the application.

---

## Endpoints

### `/analyze_aura` (POST)

This endpoint accepts POST requests to analyze a developer's "aura" based on their webcam and screenshot images.

**Request Payload:**

```json
{
    "webcam_image": "base64_encoded_string_of_webcam_image",
    "screenshot": "base64_encoded_string_of_screenshot_image",
    "current_score": 42
}
```

**Response:**

```json
{
    "analysis": "Analysis of the images goes here",
    "score_change": 5,
    "reason": "A meme-style reason for the change in score",
    "updated_score": 47,
    "tips": "Tips to improve developer productivity"
}
```

### WebSocket Events

The application broadcasts updates via WebSocket to notify connected clients when the aura score changes. The following event is broadcast:

- `aura_update`: Contains information on the aura score change and the images.

Example of received WebSocket message:

```json
{
    "name": "aura_update",
    "args": [
        {
            "updated_score": 47,
            "score_change": 5,
            "webcam_image": "base64_encoded_string_of_webcam_image",
            "screenshot_image": "base64_encoded_string_of_screenshot_image"
        }
    ]
}
```

---

## Testing

### Unit Tests

The project includes a set of unit tests using `unittest`. To run the tests, use the following command:

```bash
python -m unittest discover
```

This will automatically run the test suite and report results.

### WebSocket Tests

The tests also include WebSocket tests to verify that aura updates are properly broadcasted to clients. The tests use `SocketIOTestClient` to simulate WebSocket clients and check for the correct WebSocket events.

---

## Troubleshooting

- **Missing dependencies**: Ensure all dependencies are installed correctly by running `pip install -r requirements.txt`.
- **Invalid API Key**: If you encounter issues related to OpenAI, double-check that your OpenAI API key is correctly added to the `.env` file.
- **WebSocket Connection Issues**: Make sure you are using a compatible WebSocket client and that the server is running.

---

## Contributing

Contributions are welcome! If you have suggestions, bug fixes, or improvements, feel free to open a pull request.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```

### Key Sections:
- **Overview**: Describes the app and its main features.
- **Installation**: Lists the steps to install dependencies and set up the environment.
- **Running the Application**: Instructions for running the Flask app and WebSocket communication.
- **Endpoints**: Details the `/analyze_aura` POST endpoint and WebSocket events.
- **Testing**: Instructions on running unit tests, including WebSocket tests.
- **Troubleshooting**: Helps resolve common issues.
- **Contributing**: Encourages contributions from other developers.
