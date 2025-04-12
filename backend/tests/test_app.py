import unittest
import os
import base64
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
        """Test that a coding image triggers a score increase and emits a WebSocket event."""
        self.socketio_client.get_received()  # clear queue

        response = self.post_aura('coding_webcam.jpg', 'coding_screenshot.png', 42)
        self.assertEqual(response.status_code, 200)

        result = response.get_json()
        self.assertIn('score_change', result)
        self.assertIn('updated_score', result)
        self.assertIn('analysis', result)
        self.assertIn('tips_for_improvement', result)

        # Check WebSocket broadcast
        received = self.socketio_client.get_received()
        aura_events = [msg for msg in received if msg['name'] == 'aura_update']
        self.assertGreater(len(aura_events), 0, "Expected at least one aura_update WebSocket event.")
        aura_payload = aura_events[0]['args'][0]

        self.assertEqual(aura_payload['updated_score'], result['updated_score'])
        self.assertEqual(aura_payload['score_change'], result['score_change'])

    def test_slacking_analysis_decrease(self):
        """Slacking images should reduce score and emit event."""
        self.socketio_client.get_received()  # Clear events

        response = self.post_aura('slacking_webcam.jpg', 'slacking_screenshot.png', 100)
        self.assertEqual(response.status_code, 200)
        result = response.get_json()

        self.assertIn('score_change', result)
        self.assertLess(result['score_change'], 0)

        received = self.socketio_client.get_received()
        aura_events = [msg for msg in received if msg['name'] == 'aura_update']
        self.assertTrue(any(aura_events), "Expected aura_update broadcast on slacking analysis.")

    @classmethod
    def tearDownClass(cls):
        cls.socketio_client.disconnect()

if __name__ == '__main__':
    unittest.main()
