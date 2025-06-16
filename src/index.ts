#!/usr/bin/env node

/**
 * Aviation Weather MCP Server - HTTP Transport
 * Provides aviation weather data through the Model Context Protocol
 * Supports both local and remote deployment
 */

import express from 'express';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import cors from 'cors';

import { AviationWeatherService } from './services/aviationWeather.js';
import { setupWeatherTools } from './tools/weather.js';
import { setupAirportTools } from './tools/airport.js';
import { setupAnalysisTools } from './tools/analysis.js';
import { setupPrompts } from './prompts/aviation.js';

// Initialize services
const weatherService = new AviationWeatherService();

// Create Express app
const app = express();
app.use(express.json());

// Add CORS support for MCP Inspector
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'mcp-session-id'],
  credentials: true
}));

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces by default

// Store transports by session ID for stateful connections
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'aviation-weather-mcp',
    version: '0.1.0',
    transport: 'http',
    sessions: Object.keys(transports).length
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Aviation Weather MCP Server',
    version: '0.1.0',
    description: 'Model Context Protocol server for aviation weather data',
    endpoints: {
      mcp: '/mcp',
      health: '/health'
    }
  });
});

// Main MCP endpoint - handles all MCP requests
app.post('/mcp', async (req, res) => {
  try {
    // Check for existing session ID
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      // Reuse existing transport for this session
      transport = transports[sessionId];
    } else if (isInitializeRequest(req.body)) {
      // New initialization request - create new transport and server
      const newSessionId = randomUUID();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => newSessionId,
        onsessioninitialized: (sessionId) => {
          console.log(`New session initialized: ${sessionId}`);
        }
      });
      
      // Store the transport immediately
      transports[newSessionId] = transport;
      
      // Set the session ID header in the response
      res.setHeader('mcp-session-id', newSessionId);

      // Clean up transport when closed
      transport.onclose = () => {
        delete transports[newSessionId];
        console.log(`Session closed: ${newSessionId}`);
      };

      // Create a new MCP server instance for this session
      const server = new McpServer({
        name: 'aviation-weather',
        version: '0.1.0',
      });

      // Setup all tools and prompts
      setupWeatherTools(server, weatherService);
      setupAirportTools(server, weatherService);
      setupAnalysisTools(server, weatherService);
      setupPrompts(server);

      // Connect the server to the transport
      await server.connect(transport);
      
      // Handle the initialization request and return early
      await transport.handleRequest(req, res, req.body);
      return;
    } else {
      // Invalid request - no session ID for non-initialization request
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided',
        },
        id: null,
      });
      return;
    }

    // Handle the request with existing transport
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling request:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal server error',
      },
      id: null,
    });
  }
});

// Handle GET requests for server-to-client notifications (SSE)
app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  
  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
});

// Handle DELETE requests to close sessions
app.delete('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  
  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Aviation Weather MCP Server started`);
  console.log(`Server running at http://${HOST}:${PORT}`);
  console.log(`MCP endpoint: http://${HOST}:${PORT}/mcp`);
  console.log(`Health check: http://${HOST}:${PORT}/health`);
  console.log('Version: 0.1.0');
  console.log('\nReady to accept connections...');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});