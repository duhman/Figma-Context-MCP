// Comprehensive script to test the Figma MCP server with SSE connection
const axios = require('axios');
const eventsource = require('eventsource');
const EventSource = eventsource;

// Generate a unique client ID for this session
const clientId = `client-${Date.now()}`;
let messageId = 1;

// Create an SSE connection to the server
function connectSSE() {
  return new Promise((resolve, reject) => {
    console.log('Establishing SSE connection...');
    const sse = new EventSource(`http://localhost:3333/sse?client=${clientId}`);
    
    // Set up event handlers
    sse.onopen = () => {
      console.log('SSE connection established');
      resolve(sse);
    };
    
    sse.onerror = (error) => {
      console.error('SSE connection error:', error);
      reject(error);
    };
    
    // Listen for messages from the server
    sse.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received SSE message:', data);
        
        // If this is a response to our request, process it
        if (data.type === 'response' && data.id) {
          console.log('\nFigma Data Response:', JSON.stringify(data, null, 2));
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    });
  });
}

// Send a request to get Figma data
async function sendFigmaRequest(fileKey, nodeId) {
  const requestId = `request-${messageId++}`;
  
  try {
    console.log(`Sending request ${requestId} for file ${fileKey}${nodeId ? ` node ${nodeId}` : ''}...`);
    
    const response = await axios.post('http://localhost:3333/messages', {
      id: requestId,
      type: "request",
      method: "get_figma_data",
      params: {
        fileKey: fileKey,
        nodeId: nodeId || undefined
      }
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Request ${requestId} sent successfully:`, response.status);
    return requestId;
  } catch (error) {
    console.error(`Error sending request ${requestId}:`, error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    throw error;
  }
}

// Main function to orchestrate the process
async function main() {
  let sse;
  
  try {
    // 1. Establish SSE connection
    sse = await connectSSE();
    
    // 2. Wait a moment for the connection to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 3. Send request for Figma data
    const fileKey = "556ubMePJJrpVqckOCPmop";
    const nodeId = "0-1"; // Optional: specify a node ID for a specific part of the design
    
    await sendFigmaRequest(fileKey, nodeId);
    
    // 4. Keep the connection open to receive the response
    console.log('Waiting for response (will keep running to receive SSE messages)...');
    
  } catch (error) {
    console.error('Error in main process:', error);
    if (sse) {
      sse.close();
    }
    process.exit(1);
  }
}

// Run the main function
main();
