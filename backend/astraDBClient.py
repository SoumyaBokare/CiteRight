from cassandra.cluster import Cluster
from cassandra.auth import PlainTextAuthProvider
import sys
import json

ASTRA_DB_SECURE_CONNECT_BUNDLE = "path_to_your_secure_connect_bundle.json"
ASTRA_KEYSPACE = "default_keyspace"

def connect_to_astra():
    cloud_config = {'secure_connect_bundle': ASTRA_DB_SECURE_CONNECT_BUNDLE}
    cluster = Cluster(cloud=cloud_config)
    session = cluster.connect()
    session.set_keyspace(ASTRA_KEYSPACE)
    return session

def store_embedding(document_id, text, embedding):
    session = connect_to_astra()
    session.execute("""
        INSERT INTO uploads (document_id, text, embedding) VALUES (%s, %s, %s)
    """, (document_id, text, json.dumps(embedding)))

    print("Stored embedding successfully!")

def fetch_relevant_embedding(query):
    session = connect_to_astra()
    result = session.execute("SELECT text, embedding FROM uploads")
    
    # Find the most relevant document (placeholder logic)
    relevant_doc = None
    for row in result:
        if query.lower() in row.text.lower():
            relevant_doc = row
            break
    
    if relevant_doc:
        return {"text": relevant_doc.text, "embedding": json.loads(relevant_doc.embedding)}
    else:
        return None

if __name__ == "__main__":
    command = sys.argv[1]
    
    if command == "store":
        document_id = sys.argv[2]
        text = sys.argv[3]
        embedding = json.loads(sys.argv[4])
        store_embedding(document_id, text, embedding)
    
    elif command == "query":
        query = sys.argv[2]
        result = fetch_relevant_embedding(query)
        if result:
            print(json.dumps(result))
        else:
            print(json.dumps({"error": "No relevant document found"}))
