# CiteRight Backend - Local Setup (Ollama + Local Vector Store)

## Overview
The backend has been updated to run completely locally without cloud dependencies:
- ❌ Removed: AstraDB, Langflow
- ✅ Added: Ollama (local LLM), Local JSON vector store

## Architecture

### RAG Flow
1. **Upload PDF** → Extract text → Generate embeddings → Store in local JSON file
2. **Chat Query** → Retrieve document → Build RAG prompt → Call Ollama → Return answer

### Components
- **Vector Store**: Simple JSON file (`vector_store.json`) storing documents, metadata, and embeddings
- **LLM**: Ollama running locally (default: llama2 model)
- **Embeddings**: Python script (`embedding_generator.py`)

## Prerequisites

### 1. Install Ollama
```bash
# Download from: https://ollama.ai
# After installation, pull a model:
ollama pull llama2
# Or try other models:
ollama pull mistral
ollama pull llama3
```

### 2. Start Ollama Server
```bash
ollama serve
# Should run on http://localhost:11434
```

### 3. Python Environment
```bash
# Make sure Python is installed and embedding_generator.py dependencies are available
pip install -r requirements.txt
```

## Configuration

Edit `backend/.env`:
```env
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2  # Change to mistral, llama3, etc.

# Server Configuration
PORT=3001
```

## Running the Server

```bash
cd backend
npm install
npm start
```

Expected output:
```
ℹ️ No existing vector store found, starting fresh
✅ Vector store initialized
🚀 Server running at http://localhost:3001
📦 Using Ollama model: llama2
💾 Vector store: local JSON file
```

## API Endpoints

### Upload PDF
```http
POST /api/upload
Content-Type: multipart/form-data

Body: paper=<PDF file>

Response:
{
  "success": true,
  "message": "Paper uploaded and processed successfully",
  "documentId": "abc123..."
}
```

### Chat with Document
```http
POST /api/chat
Content-Type: application/json

Body:
{
  "input": "What is the main finding?",
  "documentId": "abc123..."
}

Response:
{
  "message": "Based on the paper...",
  "metadata": {
    "documentName": "research.pdf",
    "model": "llama2"
  }
}
```

### List Papers
```http
GET /api/papers

Response:
{
  "papers": [
    { "id": "abc123...", "name": "research.pdf" }
  ]
}
```

## Testing

1. Start backend: `npm start`
2. Upload a PDF via the frontend or curl:
```bash
curl -X POST http://localhost:3001/api/upload \
  -F "paper=@test.pdf"
```
3. Chat with the document:
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"input":"What is this paper about?","documentId":"YOUR_DOC_ID"}'
```

## Data Storage

All data is stored locally:
- **PDFs**: `backend/uploads/`
- **Extracted text**: `backend/uploads/*.pdf.txt`
- **Vector store**: `backend/vector_store.json`

## Troubleshooting

### "Failed to connect to Ollama"
- Make sure Ollama is running: `ollama serve`
- Check the URL in `.env` matches Ollama's address

### "Embedding generation failed"
- Verify Python is installed and on PATH
- Check `embedding_generator.py` exists
- Install Python dependencies: `pip install -r requirements.txt`

### "Document not found"
- Check that the documentId returned from upload matches the one used in chat
- Verify `vector_store.json` exists and contains your document

## Next Steps / Improvements

1. **Vector Search**: Currently using full document text as context. Could add:
   - Chunking: Split documents into smaller passages
   - Vector similarity search: Find most relevant chunks for the query
   
2. **Better Models**: Try different Ollama models:
   ```bash
   ollama pull mistral  # Faster
   ollama pull llama3   # More capable
   ```

3. **Streaming**: Add streaming responses for better UX:
   ```javascript
   // In Ollama call, set stream: true
   ```

4. **Citations**: Extract and highlight specific passages used in answers

## Comparison: Old vs New

| Feature | Old (AstraDB + Langflow) | New (Local) |
|---------|-------------------------|-------------|
| Database | AstraDB (cloud) | JSON file (local) |
| LLM | Langflow (orchestration) | Ollama (direct) |
| Cost | Paid (cloud) | Free (local) |
| Setup | Complex (tokens, API keys) | Simple (just Ollama) |
| Performance | Network latency | Local (faster) |
| Privacy | Data sent to cloud | All data stays local |
