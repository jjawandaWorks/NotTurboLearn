
# NotTurboLearn

NotTurboLearn is an open-source web application that helps students transform lecture recordings into clear, exam-ready notes and interact with their notes using an AI-powered chat assistant. Built with Flask, Whisper AI, and Ollama LLM, it streamlines the process of audio transcription, note generation, and contextual Q&A for deeper learning.

## Features

- **Audio Transcription**: Upload lecture recordings and get accurate transcripts using Whisper AI.
- **Automated Note Generation**: Convert transcripts into well-structured, Markdown-formatted notes with headings, bullet points, definitions, formulas, and more using Ollama LLM.
- **Interactive Chat Assistant**: Ask questions about your notes and transcripts; get answers grounded in your own content.
- **Session Management**: Organize multiple transcripts and notes, edit session names, and delete sessions securely.
- **RESTful API Endpoints**: Manage transcripts, notes, and chat history via robust API routes.
- **Secure File Handling**: Upload and delete audio files with session-based access control and file validation.
- **Modern UI**: Responsive, user-friendly interface for easy navigation and review.

## Technology Stack

- **Backend**: Python, Flask, Whisper AI, Ollama LLM
- **Frontend**: HTML, CSS, JavaScript
- **Database**: SQLite

## Installation & Setup

1. **Clone the repository**
	```powershell
	git clone https://github.com/JaspreetJ117/NotTurboLearn.git
	cd NotTurboLearn
	```

2. **Create a Python environment and install dependencies**
	```powershell
	python -m venv venv
	.\venv\Scripts\activate
	pip install flask torch requests whisper
	```

3. **Install and run Ollama**
	- Download and install Ollama from [https://ollama.com/](https://ollama.com/)
	- Start the Ollama server locally (default: `http://localhost:11434`)

4. **Run the application**
	```powershell
	python scripts/app.py
	```

5. **Access the app**
	- Open your browser and go to [http://localhost:5000](http://localhost:5000)

## Usage

1. **Upload an audio file**: Use the web interface to upload a lecture recording (WAV format recommended).
2. **Transcription & Notes**: The app transcribes the audio and generates detailed notes in Markdown.
3. **Chat with your notes**: Ask questions about the lecture; the AI assistant answers based on your notes and transcript.
4. **Session Management**: View, edit, or delete previous sessions from the sidebar.

## File Structure

- `scripts/app.py` — Main Flask application and API routes
- `scripts/database.py` — Database initialization and management
- `scripts/static/` — Frontend assets (JS, CSS)
- `templates/` — HTML templates
- `uploads/` — Uploaded audio files

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Author

Jaspreet Jawanda  
Email: jaspreet@jjawanda.me
