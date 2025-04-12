import unittest
import os
import base64
import json
from app import app, socketio
from flask_socketio import SocketIOTestClient

class TestAuraAnalyzer(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = app.test_client()
        cls.data_dir = os.path.join(os.path.dirname(__file__), 'data')
        cls.socketio_client = SocketIOTestClient(app, socketio)

    def encode_image(self, filename):
        path = os.path.join(self.data_dir, filename)
        with open(path, 'rb') as f:
            return base64.b64encode(f.read()).decode('utf-8')

    def post_aura(self, webcam_img, screenshot_img, current_score):
        payload = {
            'webcam_image': self.encode_image(webcam_img),
            'screenshot': self.encode_image(screenshot_img),
            'current_score': current_score
        }
        return self.client.post('/analyze_aura', json=payload)

    def test_websocket_connection(self):
        """Ensure WebSocket connects and listens properly."""
        self.assertTrue(self.socketio_client.is_connected())

    def test_coding_analysis_and_ws_broadcast(self):
        """Test that a coding image triggers a score increase and emits a WebSocket event with images."""

        self.socketio_client.get_received()  # Clear the queue before sending the request

        # Send a POST request with a coding image
        webcam_image_base64 = self.encode_image('coding_webcam.jpg')
        screenshot_image_base64 = self.encode_image('coding_screenshot.png')
        response = self.post_aura('coding_webcam.jpg', 'coding_screenshot.png', 42)
        self.assertEqual(response.status_code, 200)

        # Get the result from the API response
        result = response.get_json()

        # Ensure that the result contains the necessary fields
        self.assertIn('score_change', result)
        self.assertIn('updated_score', result)
        self.assertIn('analysis', result)
        self.assertIn('tips', result)

        # Check WebSocket broadcast for aura_update
        received = self.socketio_client.get_received()
        aura_events = [msg for msg in received if msg['name'] == 'aura_update']
        
        # Ensure that at least one aura_update event was received
        self.assertGreater(len(aura_events), 0, "Expected at least one aura_update WebSocket event.")

        # Extract the first aura_update event
        aura_payload = aura_events[0]['args'][0]

        # Check that the WebSocket payload contains the correct updated score and score change
        self.assertEqual(aura_payload['updated_score'], result['updated_score'])
        self.assertEqual(aura_payload['score_change'], result['score_change'])

        # Ensure that the WebSocket message contains the actual base64-encoded images sent in the request
        self.assertEqual(aura_payload['webcam_image'], webcam_image_base64)
        self.assertEqual(aura_payload['screenshot_image'], screenshot_image_base64)

    def test_slacking_analysis_decrease(self):
        """Test that slacking images should reduce the aura score and emit a WebSocket event with images."""

        self.socketio_client.get_received()  # Clear events

        # Send a POST request with a slacking image
        webcam_image_base64 = self.encode_image('slacking_webcam.jpg')
        screenshot_image_base64 = self.encode_image('slacking_screenshot.png')
        response = self.post_aura('slacking_webcam.jpg', 'slacking_screenshot.png', 100)
        self.assertEqual(response.status_code, 200)
        result = response.get_json()

        # Ensure that the result contains the necessary fields
        self.assertIn('score_change', result)
        self.assertLess(result['score_change'], 0, "Expected score to decrease for slacking images.")

        # Check WebSocket broadcast for aura_update
        received = self.socketio_client.get_received()
        aura_events = [msg for msg in received if msg['name'] == 'aura_update']
        
        # Ensure that the aura_update event is received
        self.assertTrue(any(aura_events), "Expected aura_update broadcast on slacking analysis.")

        # Extract the first aura_update event
        aura_payload = aura_events[0]['args'][0]

        # Ensure the WebSocket message contains the actual base64-encoded images sent in the request
        self.assertEqual(aura_payload['webcam_image'], webcam_image_base64)
        self.assertEqual(aura_payload['screenshot_image'], screenshot_image_base64)

    @classmethod
    def tearDownClass(cls):
        cls.socketio_client.disconnect()

if __name__ == '__main__':
    unittest.main()
