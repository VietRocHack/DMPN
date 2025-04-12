## 📡 Endpoint: `POST /analyze_aura`

Analyzes a developer’s current *aura* (aka productivity vibe) based on a webcam image, a screenshot, and their current aura score.

---

### 🔐 Authentication
None (by default). You can add an API key header later if needed.

---

### 📥 Request Body (JSON)

```json
{
  "webcam_image": "<base64-encoded image (jpg/png)>",
  "screenshot": "<base64-encoded image (jpg/png)>",
  "current_score": 73
}
```

#### Field Descriptions:

| Field           | Type   | Required | Description |
|----------------|--------|----------|-------------|
| `webcam_image` | string | ✅ yes   | Base64-encoded JPEG/PNG of webcam snapshot |
| `screenshot`   | string | ✅ yes   | Base64-encoded JPEG/PNG of current screen |
| `current_score`| int    | ✅ yes   | Current aura score (0–100) |

---

### 📤 Response Body (JSON)

On success (`200 OK`):

```json
{
  "analysis": "The dev is in full-on hyperfocus mode. Multiple terminals, hoodie on, and caffeine in hand.",
  "score_change": 7,
  "reason": "Aura boosted by hoodie + terminal combo. Real 10x energy detected.",
  "updated_score": 80
}
```

| Field           | Type   | Description |
|----------------|--------|-------------|
| `analysis`     | string | Humorous breakdown of productivity |
| `score_change` | int    | Change applied to aura score (-10 to +10) |
| `reason`       | string | Meme-style reason for the score shift |
| `updated_score`| int    | Final aura score (clamped between 0 and 100) |

---

### ❌ Error Responses

- **`400 Bad Request`**  
  - Missing or invalid inputs:
    ```json
    { "error": "Missing webcam image, screenshot, or current score." }
    ```
  - Invalid base64:
    ```json
    { "error": "One or both images are not valid base64-encoded data." }
    ```

- **`500 Internal Server Error`**  
  - GPT response failure:
    ```json
    { "error": "Invalid JSON format returned by GPT-4o." }
    ```
  - OpenAI API error:
    ```json
    { "error": "OpenAI API error occurred.", "details": "<error message>" }
    ```

---

### 📸 Example Curl Request

```bash
curl -X POST http://localhost:5000/analyze_aura \
  -H "Content-Type: application/json" \
  -d '{
    "webcam_image": "'"$(base64 -w 0 tests/data/coding_webcam.jpg)"'",
    "screenshot": "'"$(base64 -w 0 tests/data/coding_screenshot.png)"'",
    "current_score": 72
  }'
```

---

Let me know if you want an OpenAPI/Swagger version of this spec, or Postman/exported testing collection!