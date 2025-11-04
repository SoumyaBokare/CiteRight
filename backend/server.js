import dotenv from 'dotenv';
import express from "express";
import bodyParser from "body-parser";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import pkg from "pdfjs-dist";
import { v4 as uuidv4 } from 'uuid';

const { getDocument } = pkg;

// Load environment variables
dotenv.config();

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama2';
const CHROMA_PATH = process.env.CHROMA_PATH || './chroma_db';
const PORT = process.env.PORT || 3001;

const app = express();

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(cors());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`);
  next();
});

// Create uploads directory
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Initialize multer
const upload = multer({ dest: uploadsDir });

// Simple in-memory vector store (replaces ChromaDB for simplicity)
const vectorStore = {
  documents: new Map(), // documentId -> { text, metadata, embeddings }
  
  async add(id, text, metadata, embeddings) {
    this.documents.set(id, { text, metadata, embeddings });
    // Persist to disk for durability
    await this.save();
  },
  
  async get(id) {
    return this.documents.get(id);
  },
  
  async getAll() {
    return Array.from(this.documents.entries()).map(([id, data]) => ({
      id,
      ...data
    }));
  },
  
  async save() {
    const dataPath = path.join(__dirname, 'vector_store.json');
    const data = Array.from(this.documents.entries());
    await fs.promises.writeFile(dataPath, JSON.stringify(data, null, 2));
  },
  
  async load() {
    try {
      const dataPath = path.join(__dirname, 'vector_store.json');
      const content = await fs.promises.readFile(dataPath, 'utf8');
      const data = JSON.parse(content);
      this.documents = new Map(data);
      console.log(`✅ Loaded ${this.documents.size} documents from vector store`);
    } catch (error) {
      console.log('ℹ️ No existing vector store found, starting fresh');
    }
  }
};

async function initializeVectorStore() {
  await vectorStore.load();
  console.log('✅ Vector store initialized');
}

// Extract text from PDF using pdfjs-dist
async function extractTextWithPdfjs(filePath) {
  try {
    const data = new Uint8Array(await fs.promises.readFile(filePath));
    const pdf = await getDocument({ 
      data,
      standardFontDataUrl: 'node_modules/pdfjs-dist/standard_fonts/' 
    }).promise;

    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map(item => item.str).join(" ");
      fullText += strings + "\n";
    }

    return fullText;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw error;
  }
}

// Generate embeddings using Python script
function generateEmbeddings(textFilePath) {
  return new Promise((resolve, reject) => {
    const pythonScript = process.env.EMBEDDING_SCRIPT_PATH || path.join(__dirname, 'embedding_generator.py');
    
    exec(`python "${pythonScript}" "${textFilePath}"`, (err, stdout, stderr) => {
      if (err) {
        console.error(`❌ Error generating embeddings:\n${stderr}`);
        reject(new Error("Failed to generate embeddings"));
        return;
      }

      try {
        const embeddings = JSON.parse(stdout);
        resolve(embeddings);
      } catch (parseErr) {
        console.error("❌ Failed to parse embeddings JSON:", parseErr);
        reject(new Error("Invalid embeddings format"));
      }
    });
  });
}

// Call Ollama API for chat completion
async function callOllama(prompt) {
  try {
    console.log(`🔄 Calling Ollama API at ${OLLAMA_BASE_URL}/api/generate`);
    console.log(`📝 Using model: ${OLLAMA_MODEL}`);
    console.log(`📄 Prompt length: ${prompt.length} characters`);
    
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false,
        options: {
          num_predict: 2048,  // Increased max tokens from default (~512) to 2048
          temperature: 0.7,    // Balanced creativity
          top_p: 0.9,          // Nucleus sampling for quality
          top_k: 40            // Limit vocabulary for coherence
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Ollama API returned error status ${response.status}:`, errorText);
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`✅ Ollama responded with ${result.response?.length || 0} characters`);
    
    if (!result.response) {
      console.error('❌ Ollama returned no response:', result);
      return "Error: Ollama did not generate a response. Please try again.";
    }
    
    return result.response;
  } catch (error) {
    console.error('❌ Ollama API error:', error);
    console.error('Error details:', error.message);
    throw error;
  }
}

// Root route
app.get("/", (req, res) => {
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      return res.status(500).send("Unable to scan uploads directory");
    }
    res.send(`📄 Research Paper Chatbot Backend (Ollama + ChromaDB) is Running!<br>Files in uploads folder:<br>${files.join("<br>")}`);
  });
});

// Upload PDF route
app.post("/api/upload", upload.single("paper"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    console.log(`📄 Processing file: ${fileName}`);

    // Extract text from PDF
    const extractedText = await extractTextWithPdfjs(filePath);
    
    // Save text to temp file for embedding generation
    const tempTextFilePath = path.join(uploadsDir, `${fileName}.txt`);
    fs.writeFileSync(tempTextFilePath, extractedText);

    console.log(`Generating embeddings...`);
    
    // Generate embeddings
    const embeddings = await generateEmbeddings(tempTextFilePath);
    
    console.log(`✅ Embeddings generated successfully`);

    // Generate document ID
    const documentId = uuidv4().replace(/-/g, '');

    // Store in vector store
    await vectorStore.add(documentId, extractedText, {
      fileName: fileName,
      title: fileName,
      upload_date: new Date().toISOString()
    }, embeddings);

    console.log(`✅ Document stored with ID: ${documentId}`);

    res.json({
      success: true,
      message: "Paper uploaded and processed successfully",
      documentId: documentId
    });

  } catch (error) {
    console.error("❌ Error uploading research paper:", error);
    res.status(500).json({ 
      error: "Failed to process the research paper", 
      details: error.message 
    });
  }
});

// Chat route - RAG with Ollama
app.post("/api/chat", async (req, res) => {
  try {
    const { input, documentId } = req.body;

    if (!input || !documentId) {
      return res.status(400).json({ 
        error: "Missing required fields: input and documentId" 
      });
    }

    console.log(`💬 User Query: ${input}`);

    // Retrieve document from vector store
    const docData = await vectorStore.get(documentId);

    if (!docData) {
      return res.status(404).json({ error: "Document not found" });
    }

    const documentText = docData.text;
    const metadata = docData.metadata;

    console.log(`📖 Retrieved document: ${metadata.fileName}`);
    console.log(`📏 Document text length: ${documentText?.length || 0} characters`);
    console.log(`📄 First 200 chars of document: ${documentText?.slice(0, 200) || 'NO TEXT FOUND'}...`);

    // Increase context length for more detailed answers (llama3.1:8b supports ~8k tokens)
    const MAX_CONTEXT_LENGTH = 12000; // Increased from 4000 to 12000
    const context = documentText.length > MAX_CONTEXT_LENGTH 
      ? documentText.slice(0, MAX_CONTEXT_LENGTH) + "..."
      : documentText;

    console.log(`📋 Context length being sent to Ollama: ${context.length} characters`);

    // Build RAG prompt with instructions for detailed responses
    const prompt = `You are an expert research assistant with deep knowledge of academic papers. Your task is to provide comprehensive, detailed, and well-structured answers based ONLY on the research paper content provided below.

INSTRUCTIONS:
- Provide thorough, detailed explanations (minimum 3-4 paragraphs)
- Break down complex concepts into clear sections
- Include specific examples, data, or findings from the paper
- Cite relevant sections or page references when possible
- Use bullet points or numbered lists for clarity when appropriate
- If multiple aspects exist, cover all of them comprehensively
- Only say "I cannot find this information" if the paper truly doesn't contain relevant content

RESEARCH PAPER CONTENT:
${context}

USER QUESTION: ${input}

DETAILED ANSWER (provide a comprehensive response):`;

    console.log(`🤖 Calling Ollama with model: ${OLLAMA_MODEL}`);

    // Call Ollama
    const answer = await callOllama(prompt);

    console.log(`✅ Response generated`);

    res.json({ 
      message: answer,
      metadata: {
        documentName: metadata.fileName,
        model: OLLAMA_MODEL
      }
    });

  } catch (error) {
    console.error("❌ Error in chat:", error);
    res.status(500).json({ 
      error: "Failed to generate response", 
      details: error.message 
    });
  }
});

// List papers route
app.get("/api/papers", async (req, res) => {
  try {
    // Get all documents from vector store
    const allDocs = await vectorStore.getAll();

    const papers = allDocs.map(doc => ({
      id: doc.id,
      name: doc.metadata.fileName || doc.metadata.title || 'Unknown'
    }));

    res.json({ papers });
  } catch (error) {
    console.error("❌ Error retrieving papers:", error);
    res.status(500).json({ 
      error: "Failed to retrieve papers", 
      details: error.message 
    });
  }
});

// Start server
initializeVectorStore().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📦 Using Ollama model: ${OLLAMA_MODEL}`);
    console.log(`💾 Vector store: local JSON file`);
  });
}).catch(err => {
  console.error("Failed to initialize server:", err);
  process.exit(1);
});
