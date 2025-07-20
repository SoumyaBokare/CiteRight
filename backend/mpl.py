# Complete Python code for PDF to AstraDB embedding pipeline with simplified Langflow integration

import os
import uuid
import PyPDF2
import openai
import numpy as np
import requests
from dotenv import load_dotenv
from cassandra.cluster import Cluster
from cassandra.auth import PlainTextAuthProvider
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Load environment variables
load_dotenv()

class PDFProcessingPipeline:
    def __init__(self, 
                 openai_api_key, 
                 astra_db_secure_bundle_path, 
                 astra_db_client_id, 
                 astra_db_client_secret,
                 astra_keyspace,
                 collection_name="metadata",
                 embedding_model="text-embedding-3-small",
                 chunk_size=1000,
                 chunk_overlap=200,
                 max_dimensions=768,
                 langflow_server_url=None):
        
        self.openai_api_key = openai_api_key
        self.astra_db_secure_bundle_path = astra_db_secure_bundle_path
        self.astra_db_client_id = astra_db_client_id
        self.astra_db_client_secret = astra_db_client_secret
        self.astra_keyspace = astra_keyspace
        self.collection_name = collection_name
        self.embedding_model = embedding_model
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.max_dimensions = max_dimensions
        self.langflow_server_url = langflow_server_url
        
        # Initialize OpenAI client
        openai.api_key = self.openai_api_key
        
        # Initialize Astra DB connection
        self.setup_astra_db_connection()
        
        # Initialize text splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap
        )
    
    def setup_astra_db_connection(self):
        """Initialize connection to AstraDB"""
        cloud_config = {
            'secure_connect_bundle': self.astra_db_secure_bundle_path
        }
        
        auth_provider = PlainTextAuthProvider(
            self.astra_db_client_id, 
            self.astra_db_client_secret
        )
        
        self.cluster = Cluster(cloud=cloud_config, auth_provider=auth_provider)
        self.session = self.cluster.connect()
        self.session.set_keyspace(self.astra_keyspace)
        
        # Verify collection exists
        self.verify_collection()
    
    def verify_collection(self):
        """Verify that the collection exists"""
        try:
            # Check if the table exists
            query = f"SELECT * FROM system_schema.tables WHERE keyspace_name='{self.astra_keyspace}' AND table_name='{self.collection_name}'"
            result = self.session.execute(query)
            rows = list(result)
            
            if not rows:
                raise Exception(f"Collection {self.collection_name} does not exist in keyspace {self.astra_keyspace}")
            
            # Check for vector columns in a more compatible way
            try:
                columns_query = f"SELECT * FROM system_schema.columns WHERE keyspace_name='{self.astra_keyspace}' AND table_name='{self.collection_name}'"
                columns_result = self.session.execute(columns_query)
                
                # Look for a column that might be a vector column (this is a simplified check)
                vector_column_found = False
                for column_row in columns_result:
                    if 'vector' in column_row.column_name.lower() or column_row.column_name == 'query_vector_value':
                        vector_column_found = True
                        break
                
                if not vector_column_found:
                    print(f"Warning: No vector columns found in {self.collection_name}. Vector search might not be enabled.")
                else:
                    print(f"Collection {self.collection_name} found with vector column.")
                    
            except Exception as column_e:
                # If checking columns fails, just continue with a warning
                print(f"Warning: Could not verify vector columns: {column_e}")
            
        except Exception as e:
            print(f"Error verifying collection: {e}")
            raise
    
    def extract_text_from_pdf(self, pdf_file_path):
        """Extract text content from a PDF file"""
        text = ""
        try:
            with open(pdf_file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page_num in range(len(pdf_reader.pages)):
                    text += pdf_reader.pages[page_num].extract_text()
            return text
        except Exception as e:
            print(f"Error extracting text from PDF: {e}")
            raise
    
    def split_text(self, text):
        """Split text into chunks"""
        return self.text_splitter.split_text(text)
    
    def generate_embeddings(self, text_chunks):
        """Generate embeddings using OpenAI's text-embedding-3-small model"""
    embeddings = []
    
    # Create client instance
    client = openai.OpenAI(api_key=self.openai_api_key)
    
    for chunk in text_chunks:
        try:
            response = client.embeddings.create(
                input=chunk,
                model=self.embedding_model
            )
            # Extract the embedding vector
            embedding_vector = response.data[0].embedding
            embeddings.append({
                'text': chunk,
                'embedding': embedding_vector
            })
        except Exception as e:
            print(f"Error generating embedding: {e}")
            continue
            
    return embeddings
    
    def truncate_embeddings(self, embeddings_data):
        """Truncate embeddings from 1536 to 768 dimensions"""
        truncated_embeddings = []
        
        for item in embeddings_data:
            embedding = item['embedding']
            truncated_embedding = embedding[:self.max_dimensions]
            truncated_embeddings.append({
                'text': item['text'],
                'embedding': truncated_embedding
            })
            
        return truncated_embeddings
    
    def store_in_astra_db(self, truncated_embeddings):
        """Store truncated embeddings in AstraDB"""
        stored_count = 0
        for item in truncated_embeddings:
            try:
                # Generate a unique ID for each embedding
                doc_id = str(uuid.uuid4())
                # Convert the embedding to a proper format for Cassandra
                vector_value = list(map(float, item['embedding']))
                
                # Prepare the insert query
                insert_query = f"""
                INSERT INTO {self.collection_name} (key, query_vector_value, tx_id, vector_id, content) 
                VALUES ((%s, %s), %s, %s, %s, %s)
                """
                
                # Execute the query
                self.session.execute(
                    insert_query, 
                    (1, doc_id, vector_value, 'now()', doc_id, item['text'])
                )
                stored_count += 1
                
            except Exception as e:
                print(f"Error storing in AstraDB: {e}")
                continue
        
        return stored_count
    
    def export_langflow_blueprint(self, output_file="pdf_processor_flow.json"):
        """
        Export a Langflow blueprint JSON file that can be imported directly into Langflow
        This is an alternative to using the API for registration
        """
        blueprint = {
            "name": "PDF to AstraDB Processing Pipeline",
            "description": "Process PDFs and store embeddings in AstraDB",
            "data": {
                "nodes": [
                    {
                        "id": "file_input",
                        "type": "FileInput",
                        "position": {"x": 100, "y": 100},
                        "data": {
                            "node": {
                                "template": {
                                    "file_path": {"type": "file", "value": ""}
                                }
                            }
                        }
                    },
                    {
                        "id": "pdf_text_extractor",
                        "type": "PythonFunction",
                        "position": {"x": 300, "y": 100},
                        "data": {
                            "node": {
                                "template": {
                                    "code": {
                                        "type": "code",
                                        "value": """
import PyPDF2

def extract_text(file_path):
    text = ""
    with open(file_path, 'rb') as file:
        pdf_reader = PyPDF2.PdfReader(file)
        for page_num in range(len(pdf_reader.pages)):
            text += pdf_reader.pages[page_num].extract_text()
    return text
                                        """
                                    },
                                    "function_name": {"type": "str", "value": "extract_text"},
                                    "input": {"type": "file", "value": ""}
                                }
                            }
                        }
                    },
                    {
                        "id": "text_splitter",
                        "type": "RecursiveCharacterTextSplitter",
                        "position": {"x": 500, "y": 100},
                        "data": {
                            "node": {
                                "template": {
                                    "chunk_size": {"type": "int", "value": self.chunk_size},
                                    "chunk_overlap": {"type": "int", "value": self.chunk_overlap},
                                    "text": {"type": "str", "value": ""}
                                }
                            }
                        }
                    },
                    {
                        "id": "openai_embeddings",
                        "type": "OpenAIEmbeddings",
                        "position": {"x": 700, "y": 100},
                        "data": {
                            "node": {
                                "template": {
                                    "openai_api_key": {"type": "str", "value": "${OPENAI_API_KEY}"},
                                    "model": {"type": "str", "value": self.embedding_model}
                                }
                            }
                        }
                    },
                    {
                        "id": "truncate_embeddings",
                        "type": "PythonFunction",
                        "position": {"x": 900, "y": 100},
                        "data": {
                            "node": {
                                "template": {
                                    "code": {
                                        "type": "code",
                                        "value": f"""
def truncate_embedding(embedding_data, max_length={self.max_dimensions}):
    # Check if we have a single embedding or a list of embeddings
    if isinstance(embedding_data, list) and all(isinstance(item, list) for item in embedding_data):
        # We have a list of embeddings (batch processing)
        return [emb[:max_length] for emb in embedding_data]
    elif isinstance(embedding_data, list):
        # We have a single embedding
        return embedding_data[:max_length]
    else:
        # Invalid input
        raise TypeError("Expected a list (embedding) or list of lists (batch of embeddings)")
                                        """
                                    },
                                    "function_name": {"type": "str", "value": "truncate_embedding"},
                                    "input": {"type": "list", "value": ""}
                                }
                            }
                        }
                    },
                    {
                        "id": "astra_db_store",
                        "type": "PythonFunction",
                        "position": {"x": 1100, "y": 100},
                        "data": {
                            "node": {
                                "template": {
                                    "code": {
                                        "type": "code",
                                        "value": f"""
import uuid
from cassandra.cluster import Cluster
from cassandra.auth import PlainTextAuthProvider

def store_in_astra(embeddings, texts):
    # AstraDB connection setup
    cloud_config = {{
        'secure_connect_bundle': '{self.astra_db_secure_bundle_path}'
    }}
    
    auth_provider = PlainTextAuthProvider(
        '{self.astra_db_client_id}', 
        '{self.astra_db_client_secret}'
    )
    
    cluster = Cluster(cloud=cloud_config, auth_provider=auth_provider)
    session = cluster.connect()
    session.set_keyspace('{self.astra_keyspace}')
    
    # Store embeddings
    stored_count = 0
    collection_name = '{self.collection_name}'
    
    for i, embedding in enumerate(embeddings):
        try:
            # Generate a unique ID
            doc_id = str(uuid.uuid4())
            # Convert embedding to proper format
            vector_value = list(map(float, embedding))
            text = texts[i] if i < len(texts) else ""
            
            # Insert query
            insert_query = f\"\"\"
            INSERT INTO {{collection_name}} (key, query_vector_value, tx_id, vector_id, content) 
            VALUES ((%s, %s), %s, %s, %s, %s)
            \"\"\"
            
            # Execute
            session.execute(insert_query, (1, doc_id, vector_value, 'now()', doc_id, text))
            stored_count += 1
            
        except Exception as e:
            print(f"Error storing in AstraDB: {{e}}")
    
    # Close connection
    cluster.shutdown()
    return f"Successfully stored {{stored_count}} embeddings in AstraDB"
                                        """
                                    },
                                    "function_name": {"type": "str", "value": "store_in_astra"},
                                    "embeddings": {"type": "list", "value": ""},
                                    "texts": {"type": "list", "value": ""}
                                }
                            }
                        }
                    },
                    {
                        "id": "output",
                        "type": "Output",
                        "position": {"x": 1300, "y": 100},
                        "data": {
                            "node": {
                                "template": {
                                    "input": {"type": "str", "value": ""}
                                }
                            }
                        }
                    }
                ],
                "edges": [
                    {
                        "source": "file_input",
                        "sourceHandle": "file_path",
                        "target": "pdf_text_extractor",
                        "targetHandle": "input"
                    },
                    {
                        "source": "pdf_text_extractor",
                        "sourceHandle": "output",
                        "target": "text_splitter",
                        "targetHandle": "text"
                    },
                    {
                        "source": "text_splitter",
                        "sourceHandle": "chunks",
                        "target": "openai_embeddings",
                        "targetHandle": "documents"
                    },
                    {
                        "source": "openai_embeddings",
                        "sourceHandle": "embeddings",
                        "target": "truncate_embeddings",
                        "targetHandle": "input"
                    },
                    {
                        "source": "truncate_embeddings",
                        "sourceHandle": "output",
                        "target": "astra_db_store",
                        "targetHandle": "embeddings"
                    },
                    {
                        "source": "text_splitter",
                        "sourceHandle": "chunks",
                        "target": "astra_db_store",
                        "targetHandle": "texts"
                    },
                    {
                        "source": "astra_db_store",
                        "sourceHandle": "output",
                        "target": "output",
                        "targetHandle": "input"
                    }
                ]
            }
        }
        
        # Write to file
        try:
            with open(output_file, 'w') as f:
                import json
                json.dump(blueprint, f, indent=2)
            print(f"Successfully exported Langflow blueprint to {output_file}")
            return output_file
        except Exception as e:
            print(f"Error exporting blueprint: {e}")
            return None
    
    def process_pdf(self, pdf_file_path):
        """Process a PDF file from start to finish"""
        # 1. Extract text from PDF
        text = self.extract_text_from_pdf(pdf_file_path)
        
        # 2. Split text into chunks
        text_chunks = self.split_text(text)
        
        # 3. Generate embeddings
        embeddings = self.generate_embeddings(text_chunks)
        
        # 4. Truncate embeddings to 768 dimensions
        truncated_embeddings = self.truncate_embeddings(embeddings)
        
        # 5. Store in AstraDB
        stored_count = self.store_in_astra_db(truncated_embeddings)
        
        return f"Successfully processed PDF and stored {stored_count} embeddings in AstraDB"

# Create a Python class for direct Langflow import
class PDFProcessor:
    """A class that can be imported directly into Langflow as a custom component"""
    
    def __init__(self, 
                openai_api_key=None, 
                astra_db_secure_bundle_path=None, 
                astra_db_client_id=None, 
                astra_db_client_secret=None,
                astra_keyspace=None,
                collection_name="metadata",
                embedding_model="text-embedding-3-small",
                chunk_size=1000,
                chunk_overlap=200,
                max_dimensions=768):
        
        # Use environment variables if parameters not provided
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        self.astra_db_secure_bundle_path = astra_db_secure_bundle_path or os.getenv("ASTRA_DB_SECURE_BUNDLE_PATH")
        self.astra_db_client_id = astra_db_client_id or os.getenv("ASTRA_DB_CLIENT_ID")
        self.astra_db_client_secret = astra_db_client_secret or os.getenv("ASTRA_DB_CLIENT_SECRET")
        self.astra_keyspace = astra_keyspace or os.getenv("ASTRA_KEYSPACE")
        self.collection_name = collection_name or os.getenv("COLLECTION_NAME", "metadata")
        self.embedding_model = embedding_model or os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
        self.chunk_size = int(chunk_size or os.getenv("CHUNK_SIZE", 1000))
        self.chunk_overlap = int(chunk_overlap or os.getenv("CHUNK_OVERLAP", 200))
        self.max_dimensions = int(max_dimensions or os.getenv("MAX_DIMENSIONS", 768))
    
    def process_pdf(self, pdf_file_path):
        """Process a PDF file and store embeddings in AstraDB"""
        pipeline = PDFProcessingPipeline(
            openai_api_key=self.openai_api_key,
            astra_db_secure_bundle_path=self.astra_db_secure_bundle_path,
            astra_db_client_id=self.astra_db_client_id,
            astra_db_client_secret=self.astra_db_client_secret,
            astra_keyspace=self.astra_keyspace,
            collection_name=self.collection_name,
            embedding_model=self.embedding_model,
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            max_dimensions=self.max_dimensions
        )
        
        return pipeline.process_pdf(pdf_file_path)

# Main execution function for testing outside of Langflow
def main():
    # Load environment variables
    load_dotenv()
    
    # Example usage
    pdf_processor = PDFProcessingPipeline(
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        astra_db_secure_bundle_path=os.getenv("ASTRA_DB_SECURE_BUNDLE_PATH"),
        astra_db_client_id=os.getenv("ASTRA_DB_CLIENT_ID"),
        astra_db_client_secret=os.getenv("ASTRA_DB_CLIENT_SECRET"),
        astra_keyspace=os.getenv("ASTRA_KEYSPACE"),
        collection_name=os.getenv("COLLECTION_NAME", "metadata"),
        embedding_model=os.getenv("EMBEDDING_MODEL", "text-embedding-3-small"),
        chunk_size=int(os.getenv("CHUNK_SIZE", 1000)),
        chunk_overlap=int(os.getenv("CHUNK_OVERLAP", 200)),
        max_dimensions=int(os.getenv("MAX_DIMENSIONS", 768))
    )
    
    # Process a PDF
    pdf_path = input("Enter the path to your PDF file: ")
    # Remove any quotes that might have been included in the input
    pdf_path = pdf_path.strip('"\'')
    
    result = pdf_processor.process_pdf(pdf_path)
    print(result)
    
    # Export a Langflow blueprint
    export_blueprint = input("Would you like to export a Langflow blueprint? (y/n): ")
    if export_blueprint.lower() == 'y':
        blueprint_path = input("Enter output file path (or press Enter for default): ")
        # Also strip quotes from this input
        blueprint_path = blueprint_path.strip('"\'')
        if not blueprint_path:
            blueprint_path = "pdf_processor_flow.json"
        pdf_processor.export_langflow_blueprint(blueprint_path)
        print(f"You can now import {blueprint_path} directly into Langflow through the UI.")

if __name__ == "__main__":
    main()

