# CiteRight - Research Paper Insight Platform

A full-stack application that provides intelligent insights for research papers using AI-powered analysis. This platform allows users to upload PDF research papers and get meaningful insights, summaries, and answers to questions about the content.

## Features

- **PDF Upload & Processing**: Upload research papers in PDF format
- **AI-Powered Analysis**: Get intelligent insights using LangChain and embedding models
- **Interactive Chat**: Ask questions about uploaded papers and get relevant answers
- **Vector Database**: Efficient storage and retrieval using AstraDB
- **Modern UI**: Clean, responsive React frontend

## Tech Stack

### Backend
- **Node.js & Express**: Server framework
- **Python**: AI processing scripts
- **LangChain**: AI workflow orchestration
- **AstraDB**: Vector database for embeddings
- **PDF Processing**: Extract and process text from research papers

### Frontend
- **React**: Modern UI framework
- **CSS3**: Responsive styling
- **Axios**: API communication

## Project Structure

```
paper-insight/
├── backend/
│   ├── server.js              # Main Express server
│   ├── pdf_processor.py       # PDF text extraction
│   ├── embedding_generator.py # Generate embeddings
│   ├── astraDBClient.py      # Database operations
│   ├── LangflowClient.js     # AI workflow client
│   ├── package.json          # Node.js dependencies
│   └── requirements.txt      # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── LandingPage.js
│   │   │   └── ChatRoom.js
│   │   └── App.js           # Main React app
│   └── package.json         # Frontend dependencies
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- Python (v3.8 or higher)
- AstraDB account
- LangFlow setup

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
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   - Create a `.env` file with your AstraDB credentials
   - Add LangFlow configuration

5. Start the backend server:
   ```bash
   npm start
   ```

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

- `POST /upload` - Upload PDF files
- `POST /chat` - Send chat messages and get responses
- `GET /papers` - Retrieve uploaded papers list

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

