import unittest
import os
import base64
import json
from app import app  # Ensure your Flask app is in app.py

class TestAnalyzeAura(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = app.test_client()
        cls.data_dir = os.path.join(os.path.dirname(__file__), 'data')

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

    def test_coding_increases_aura(self):
        """Test that coding images increase the aura score."""
        response = self.post_aura('coding_webcam.jpg', 'coding_screenshot.png', 50)
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn('score_change', data)
        self.assertGreater(data['score_change'], 0, "Expected aura score to increase for coding images.")
        self.assertEqual(data['updated_score'], 50 + data['score_change'])

    def test_slacking_decreases_aura(self):
        """Test that slacking images decrease the aura score."""
        response = self.post_aura('slacking_webcam.jpg', 'slacking_screenshot.png', 80)
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn('score_change', data)
        self.assertLess(data['score_change'], 0, "Expected aura score to decrease for slacking images.")
        self.assertEqual(data['updated_score'], 80 + data['score_change'])

if __name__ == '__main__':
    unittest.main()
