import dotenv from 'dotenv';
import { createClient } from '@astrajs/rest';

// Load environment variables from .env
dotenv.config();

// Load credentials from .env
const ASTRA_DB_ID = process.env.ASTRA_DB_ID;
const ASTRA_DB_REGION = process.env.ASTRA_DB_REGION;
const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN;

// Construct the base URL for Astra DB API
const baseUrl = `https://${ASTRA_DB_ID}-${ASTRA_DB_REGION}.apps.astra.datastax.com/api/rest`;

// Function to test the connection and fetch tables
async function testConnection() {
  try {
    const astraClient = await createClient({
      baseUrl,
      applicationToken: ASTRA_DB_APPLICATION_TOKEN,
    });

    // Test connection by fetching the keyspaces
    const keyspaces = await astraClient.get('/v2/schemas/keyspaces');
    console.log('Connected to Astra DB. Keyspaces:', keyspaces.data);

    // Fetch the tables for a specific keyspace (e.g., 'default_keyspace')
    const keyspaceName = 'default_keyspace'; // Change this to your desired keyspace
    const tables = await astraClient.get(`/v2/schemas/keyspaces/${keyspaceName}/tables`);
    console.log(`Tables in ${keyspaceName}:`, tables.data);
  } catch (err) {
    console.error('Error testing connection or fetching tables:', err);
  }
}

// Run the function to test the connection
testConnection();
