# embeddings_generator.py
import sys
import json
from sentence_transformers import SentenceTransformer

# Get path to .txt file
text_file_path = sys.argv[1]

# Read the text content
with open(text_file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Load pre-trained embedding model
model = SentenceTransformer('all-MiniLM-L6-v2')

# Generate embedding
embedding = model.encode(text).tolist()

# Return as JSON
print(json.dumps(embedding))
