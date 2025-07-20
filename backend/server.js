import dotenv from 'dotenv';
import { createClient } from '@astrajs/rest';
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

// Load environment variables from .env
dotenv.config();

// Define __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load credentials from .env
const ASTRA_DB_ID = process.env.ASTRA_DB_ID;
const ASTRA_DB_REGION = process.env.ASTRA_DB_REGION;
const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN;
const KEYSPACE_NAME = process.env.KEYSPACE_NAME || "default_keyspace";

// Define the baseUrl globally so it is accessible everywhere in the code
const baseUrl = `https://${ASTRA_DB_ID}-${ASTRA_DB_REGION}.apps.astra.datastax.com/api/rest/v2`;

const app = express();
const port = process.env.PORT || 3001;

// Middleware setup
app.use(bodyParser.json({ limit: '50mb' }));
app.use(cors());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Initialize the multer upload middleware
const upload = multer({ dest: uploadsDir });

// Initialize AstraDB client
let astraClient;

async function initializeAstraDB() {
  try {
    astraClient = await createClient({
      astraDatabaseId: ASTRA_DB_ID,
      astraDatabaseRegion: ASTRA_DB_REGION,
      applicationToken: ASTRA_DB_APPLICATION_TOKEN,
    });
    
    console.log("✅ AstraDB connected successfully");
  } catch (error) {
    console.error("❌ AstraDB Connection Error:", error);
    process.exit(1);
  }
}

// Route for checking the status of the server
app.get("/", (req, res) => {
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      return res.status(500).send("Unable to scan uploads directory");
    }
    res.send(`📄 Research Paper Chatbot Backend is Running!<br>Files in uploads folder:<br>${files.join("<br>")}`);
  });
});

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

// Helper function to format UUID for AstraDB
function formatUuid(uuid) {
  return uuid.replace(/-/g, '');
}

// Route for uploading PDF papers
app.post("/api/upload", upload.single("paper"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    console.log(`📄 Processing file: ${fileName}`);

    // Extract text from the uploaded PDF
    const extractedText = await extractTextWithPdfjs(filePath);

    const tempTextFilePath = path.join(uploadsDir, `${fileName}.txt`);
    fs.writeFileSync(tempTextFilePath, extractedText);

    // Use absolute path for the Python embedding script
    const pythonEmbeddingScriptPath = "C:/Users/soumy/OneDrive/Desktop/TY/MPL/paper-insight/backend/embedding_generator.py";

    console.log(`Embedding script path: ${pythonEmbeddingScriptPath}`);

    exec(`python "${pythonEmbeddingScriptPath}" "${tempTextFilePath}"`, async (err, stdout, stderr) => {
      if (err) {
        console.error(`❌ Error generating embeddings:\n${stderr}`);
        return res.status(500).json({ error: "Failed to generate embeddings" });
      }

      let embeddings;
      try {
        embeddings = JSON.parse(stdout);
      } catch (parseErr) {
        console.error("❌ Failed to parse embeddings JSON:", parseErr);
        console.error("Raw stdout:", stdout);
        return res.status(500).json({ error: "Invalid embeddings format" });
      }

      console.log(`✅ Embeddings generated successfully`);

      // Generate a UUID for the document
      const documentUuid = formatUuid(uuidv4());
      const timestamp = new Date().toISOString();

      // Prepare metadata for pdf_metadata table
      const metadata = {
        pdf_id: documentUuid,
        fileName: fileName,
        title: fileName,
        author: "Unknown",
        upload_date: timestamp,
        text: extractedText
      };

      // Prepare vector data for pdf_vectors table
      const vectorData = {
        pdf_id: documentUuid,
        vector_id: `${fileName.replace(/\s+/g, '_')}_v1`,
        vector: embeddings
      };

      try {
        // Store metadata in AstraDB
        console.log(`Storing metadata for document: ${fileName}`);
        
        // Use keyspaces for tables (not namespaces/collections)
        const metadataEndpoint = `keyspaces/${KEYSPACE_NAME}/tables/pdf_metadata/rows`;
        console.log(`Using endpoint: ${metadataEndpoint}`);
        
        const metadataResponse = await astraClient.post(
          `${baseUrl}/${metadataEndpoint}`,
          { rows: [{ columns: metadata }] }
        );
        
        console.log(`✅ Document metadata stored in AstraDB with ID: ${documentUuid}`);
        
        // Store vector data in AstraDB
        console.log(`Storing vector data for document: ${fileName}`);
        
        const vectorEndpoint = `keyspaces/${KEYSPACE_NAME}/tables/pdf_vectors/rows`;
        console.log(`Using endpoint: ${vectorEndpoint}`);
        
        const vectorResponse = await astraClient.post(
          `${baseUrl}/${vectorEndpoint}`,
          { rows: [{ columns: vectorData }] }
        );
        
        console.log(`✅ Document vectors stored in AstraDB with ID: ${documentUuid}`);
        
        // Keep files for debugging if needed
        // fs.unlinkSync(filePath);
        // fs.unlinkSync(tempTextFilePath);
        
        res.json({
          success: true,
          message: "Paper uploaded and processed successfully",
          documentId: documentUuid
        });
      } catch (storeErr) {
        console.error("❌ Error storing document in Astra DB:", storeErr);
        
        // Try to get more detailed error information
        if (storeErr.response) {
          console.error("Response data:", storeErr.response.data);
          console.error("Response status:", storeErr.response.status);
        }
        
        res.status(500).json({ 
          error: "Failed to store document in Astra DB", 
          details: storeErr.message 
        });
      }
    });
  } catch (error) {
    console.error("❌ Error uploading research paper:", error);
    res.status(500).json({ error: "Failed to process the research paper", details: error.message });
  }
});

// Route for handling chatbot queries
app.post("/api/chat", async (req, res) => {
  const { input, documentId } = req.body;
  
  if (!input || !documentId) {
    return res.status(400).json({ error: "Missing required fields: input and documentId" });
  }
  
  console.log(`💬 User Query: ${input}`);

  try {
    // Get document metadata from Astra DB
    const metadataEndpoint = `keyspaces/${KEYSPACE_NAME}/tables/pdf_metadata/${documentId}`;
    console.log(`Getting document metadata from: ${metadataEndpoint}`);
    
    const metadataResponse = await astraClient.get(metadataEndpoint);
    const metadata = metadataResponse.data;

    if (!metadata) {
      return res.status(404).json({ error: "Document not found" });
    }

    const context = metadata.text;

    // Call Langflow API for processing the user query
    const response = await runLangflow(input, context);

    if (response) {
      console.log(`🤖 Bot Response: ${response}`);
      res.json({ message: response });
    } else {
      res.status(500).json({ error: "Failed to get response from chatbot" });
    }
  } catch (error) {
    console.error("❌ Error communicating with chatbot:", error);
    res.status(500).json({ error: "Failed to get response", details: error.message });
  }
});

// Function to communicate with Langflow API
async function runLangflow(question, context) {
  try {
    const response = await fetch(`${process.env.LANGFLOW_API_URL}/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LANGFLOW_API_TOKEN || process.env.ASTRA_DB_APPLICATION_TOKEN}`,
      },
      body: JSON.stringify({
        flow_id: process.env.FLOW_ID,
        inputs: { question, context },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Langflow API error (${response.status}): ${errorData}`);
    }

    const result = await response.json();
    return result.message || "Error generating response";
  } catch (error) {
    console.error("❌ Langflow API Error:", error);
    return "Failed to generate response";
  }
}

// List available PDFs route
app.get("/api/papers", async (req, res) => {
  try {
    const endpoint = `keyspaces/${KEYSPACE_NAME}/tables/pdf_metadata`;

    console.log(`Getting paper list from: ${endpoint}`);
    
    const response = await astraClient.get(`${baseUrl}/${endpoint}`);
    
    if (!response.data || !response.data.data) {
      return res.json({ papers: [] });
    }
    
    // Extract relevant information for frontend
    const papers = response.data.data.map(paper => ({
      id: paper.pdf_id,
      name: paper.fileName || paper.title
    }));
    
    res.json({ papers });
  } catch (error) {
    console.error("❌ Error retrieving paper list:", error);
    res.status(500).json({ error: "Failed to retrieve paper list", details: error.message });
  }
});

// Initialize AstraDB connection and start the server
initializeAstraDB().then(() => {
  app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
  });
}).catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
