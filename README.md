# CiteRight - Research Paper Insight Platform

A full-stack application that provides intelligent insights for research papers using AI-powered analysis. This platform allows users to upload PDF research papers and get meaningful insights, summaries, and answers to questions about the content.

## Features

- **PDF Upload & Processing**: Upload research papers in PDF format
- **AI-Powered Analysis**: Get intelligent insights using local LLM (Ollama) and embedding models
- **Interactive Chat**: Ask questions about uploaded papers and get relevant answers
- **Local Vector Store**: Efficient storage and retrieval using JSON-based vector database
- **Modern UI**: Clean, responsive React frontend with typing animations
- **Fully Offline**: Works completely offline without cloud dependencies

## Tech Stack

### Backend
- **Node.js & Express**: Server framework
- **Python**: Embedding generation scripts
- **Ollama**: Local LLM inference (no cloud dependencies)
- **Sentence Transformers**: Generate document embeddings
- **Local JSON Store**: Vector database for embeddings and documents
- **PDF.js**: Extract and process text from research papers

### Frontend
- **React**: Modern UI framework
- **CSS3**: Responsive styling with Roboto font
- **Fetch API**: Communication with backend

## Project Structure

```
paper-insight/
├── backend/
│   ├── server.js              # Main Express server
│   ├── embedding_generator.py # Generate embeddings using sentence-transformers
│   ├── vector_store.json      # Local JSON-based vector database (created at runtime)
│   ├── .env.example           # Environment variables template
│   ├── README_LOCAL.md        # Local setup documentation
│   ├── package.json           # Node.js dependencies
│   └── requirements.txt       # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── LandingPage.js
│   │   │   └── ChatRoom.js
│   │   └── App.js            # Main React app
│   └── package.json          # Frontend dependencies
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- Python (v3.8 or higher)
- Ollama installed and running locally ([Download Ollama](https://ollama.ai))

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Install Python dependencies:
   ```bash
   pip install sentence-transformers torch
   ```

4. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Configure Ollama settings:
     ```
     OLLAMA_BASE_URL=http://localhost:11434
     OLLAMA_MODEL=llama3.1:8b
     PORT=3001
     ```

5. Ensure Ollama is running and has the model:
   ```bash
   ollama pull llama3.1:8b
   ```

6. Start the backend server:
   ```bash
   npm start
   ```

For detailed local setup instructions, see `backend/README_LOCAL.md`.

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

## Usage

1. **Upload Papers**: Use the landing page to upload PDF research papers
2. **Processing**: The system extracts text and generates embeddings
3. **Chat Interface**: Ask questions about the uploaded papers
4. **Get Insights**: Receive AI-powered answers and analysis

## API Endpoints

- `POST /api/upload` - Upload PDF files and generate embeddings
- `POST /api/chat` - Send chat messages with documentId and get AI-powered responses

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request
 
## Local-only / Offline mode

This project supports a local-first mode that avoids AstraDB and LangFlow by using a local LLM runtime (Ollama) and a simple JSON-backed vector store. This is useful when you want to run the project fully offline or avoid cloud dependencies.

Quick notes:
- See `backend/README_LOCAL.md` for detailed local setup steps (Ollama, Python embedding requirements, and running the backend in local mode).
- Environment variables: the backend reads `OLLAMA_BASE_URL` and `OLLAMA_MODEL` from `backend/.env` when using local mode.
- Embeddings are generated using `backend/embedding_generator.py` (requires `sentence-transformers`).

Last updated: 2025-11-04

