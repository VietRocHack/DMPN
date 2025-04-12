# DMPN - Developer Monitoring & Productivity Nexus

DMPN is a playful application that analyzes your webcam and screen data to generate "aura" points measuring how good of a developer you are.

## Project Overview

This joke app monitors your development activity through your webcam and screen sharing, analyzing your posture, focus, and coding habits to assign you an "aura score."

Key features:
- User dashboard with webcam and screen recording
- Real-time aura score updates based on your activity
- Admin dashboard showing snapshots and productivity tips

## Project Structure

The project consists of two main parts:

### 1. Frontend (Next.js)
- `frontend/src/app/page.tsx` - Landing page
- `frontend/src/app/dashboard/page.tsx` - User dashboard for capturing webcam and screen
- `frontend/src/app/admin/page.tsx` - Admin dashboard for viewing analyze results

### 2. Backend (Flask)
- `backend/app.py` - Core server implementation with API endpoints and WebSocket support
- `backend/templates/` - Templates for the GPT prompts
- Uses OpenAI's GPT-4o for image analysis

## Setup Guide

### Prerequisites
- Node.js (v16+) for the frontend
- Python (v3.9+) for the backend
- OpenAI API key for image analysis

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - Windows:
     ```bash
     venv\Scripts\activate
     ```
   - macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

4. Install the required packages:
   ```bash
   pip install -r requirements.txt
   ```

5. Create a `.env` file in the backend directory with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

6. Start the backend server:
   ```bash
   python app.py
   ```
   The backend will run on `http://127.0.0.1:5000`.

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will run on `http://localhost:3000`.

## Usage Guide

### Testing Mode vs API Mode

Both the user dashboard and admin dashboard have an "Use API" toggle:
- When OFF (default): The app operates in demo mode with dummy data
- When ON: The app connects to the backend API to process real webcam and screen data

### User Dashboard

1. Visit `http://localhost:3000/dashboard`
2. Grant webcam and screen sharing permissions
3. Adjust the capture interval if desired (default: 5 seconds)
4. Click "Start Capturing" to begin monitoring
5. Your aura score will update based on the analysis

### Admin Dashboard

1. Visit `http://localhost:3000/admin`
2. Toggle "Use API" to switch between dummy data and real WebSocket data
3. View the timeline of captured images and aura point changes
4. The central display shows the total aura score and level
5. The right panel shows productivity tips

## Troubleshooting

### WebSocket Connection Issues
- Ensure the backend server is running
- Check that WebSocket URL in `admin/page.tsx` matches your backend URL
- By default, it uses `ws://127.0.0.1:5000`

### Permission Issues
- Make sure to grant webcam and screen sharing permissions in your browser
- Some browsers may need additional permissions for screen capture

### OpenAI API Issues
- Verify your API key is valid and has enough quota
- Check the backend console for detailed error messages

## Notes for Developers

- Both frontend components can work independently using dummy data
- The API toggle makes it easy to develop and test without the backend
- For a production deployment, set `USE_REAL_API: true` in the configuration

## License

This project is created for demonstration purposes as part of BitCamp 2025.
