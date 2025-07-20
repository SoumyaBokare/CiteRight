import axios from 'axios';

class LangflowClient {
    constructor(apiUrl, applicationToken) {
        this.apiUrl = apiUrl;
        this.applicationToken = applicationToken;
    }

    async runFlow(flowId, langflowId, userInput, documentId) {
        try {
            const response = await axios.post(`${this.apiUrl}/v1/flows/${flowId}/run`, {
                inputs: {
                    user_query: userInput, // The user's question
                    document_id: documentId // The stored document ID in Astra DB
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${this.applicationToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error("Langflow API Error:", error);
            throw error;
        }
    }
}

export default LangflowClient;
