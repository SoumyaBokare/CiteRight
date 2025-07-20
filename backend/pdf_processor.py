# pdf_processor.py
import sys
import json
import os
from astrapy.db import AstraDB

# Get args
pdf_path = sys.argv[1]
pdf_name = sys.argv[2]
text_file_path = sys.argv[3]
embedding = json.loads(sys.argv[4])

# Load text
with open(text_file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Astra DB config from environment
db = AstraDB(
    token=os.environ['ASTRA_DB_APPLICATION_TOKEN'],
    api_endpoint=f"https://{os.environ['ASTRA_DB_ID']}-{os.environ['ASTRA_DB_REGION']}.apps.astra.datastax.com",
    namespace="default"
)

# Insert document
collection = db.collection("uploads")
doc = {
    "name": pdf_name,
    "text": text,
    "embedding": embedding
}

result = collection.insert_one(doc)
print(json.dumps({ "documentId": result["documentId"] }))
