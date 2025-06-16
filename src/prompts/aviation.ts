/**
 * Aviation-specific prompts for weather analysis
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

// Define the prompt arguments schema type that MCP expects
type PromptArgsSchema = {
  [key: string]: z.ZodTypeAny;
};

export function setupPrompts(server: McpServer) {
  /**
   * VFR flight analysis prompt
   */
  const vfrArgsSchema: PromptArgsSchema = {
    departure: z.string().describe('Departure airport ICAO code'),
    destination: z.string().describe('Destination airport ICAO code'),
    alternates: z.string().optional().describe('Comma-separated list of alternate airports'),
    departureTime: z.string().optional().describe('Planned departure time (e.g., "in 2 hours")'),
  };

  server.prompt(
    'vfr-flight-analysis',
    'Analyze weather conditions for VFR flight planning',
    vfrArgsSchema,
    ({ departure, destination, alternates, departureTime }) => {
      const prompt = generateVfrAnalysisPrompt({ departure, destination, alternates, departureTime });
      
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: prompt,
            },
          },
        ],
      };
    }
  );

  /**
   * Weather briefing prompt
   */
  const briefingArgsSchema: PromptArgsSchema = {
    airports: z.string().describe('Comma-separated list of airports to include'),
    includeArea: z.boolean().optional().describe('Include area weather (AIRMETs, SIGMETs)'),
  };

  server.prompt(
    'weather-briefing',
    'Generate a comprehensive weather briefing',
    briefingArgsSchema,
    ({ airports, includeArea }) => {
      const prompt = generateWeatherBriefingPrompt({ airports, includeArea: includeArea ? 'true' : 'false' });
      
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: prompt,
            },
          },
        ],
      };
    }
  );

  /**
   * IFR alternate requirements prompt
   */
  const ifrArgsSchema: PromptArgsSchema = {
    destination: z.string().describe('Destination airport ICAO code'),
    alternates: z.string().describe('Comma-separated list of potential alternates'),
    eta: z.string().optional().describe('Estimated time of arrival'),
  };

  server.prompt(
    'ifr-alternate-requirements',
    'Check IFR alternate airport requirements',
    ifrArgsSchema,
    ({ destination, alternates, eta }) => {
      const prompt = generateIfrAlternatePrompt({ destination, alternates, eta });
      
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: prompt,
            },
          },
        ],
      };
    }
  );
}

function generateVfrAnalysisPrompt(args: Record<string, string | undefined>): string {
  const { departure, destination, alternates, departureTime } = args;
  
  let prompt = `Please analyze the weather conditions for a VFR flight:\n\n`;
  prompt += `- Departure: ${departure}\n`;
  prompt += `- Destination: ${destination}\n`;
  
  if (alternates) {
    prompt += `- Alternates: ${alternates}\n`;
  }
  
  if (departureTime) {
    prompt += `- Planned departure: ${departureTime}\n`;
  }
  
  prompt += `\nPlease use the available weather tools to:\n`;
  prompt += `1. Get current METAR for all airports\n`;
  prompt += `2. Get TAF forecasts for all airports\n`;
  prompt += `3. Determine flight categories for each airport\n`;
  prompt += `4. Check for any AIRMETs or SIGMETs along the route\n`;
  prompt += `5. Provide a go/no-go recommendation based on VFR minimums\n`;
  prompt += `6. Highlight any weather trends or concerns\n`;
  
  return prompt;
}

function generateWeatherBriefingPrompt(args: Record<string, string | undefined>): string {
  const { airports, includeArea } = args;
  
  let prompt = `Generate a comprehensive weather briefing for the following airports: ${airports}\n\n`;
  
  prompt += `Please provide:\n`;
  prompt += `1. Current conditions (METAR) for each airport\n`;
  prompt += `2. Forecast conditions (TAF) for each airport\n`;
  prompt += `3. Flight category determination\n`;
  prompt += `4. Any significant weather phenomena\n`;
  
  if (includeArea === 'true') {
    prompt += `5. Area weather including AIRMETs and SIGMETs\n`;
    prompt += `6. PIREPs in the area\n`;
  }
  
  prompt += `\nFormat the briefing in a clear, pilot-friendly manner with:\n`;
  prompt += `- Executive summary at the top\n`;
  prompt += `- Detailed conditions for each airport\n`;
  prompt += `- Any warnings or cautions\n`;
  prompt += `- Trends and outlook\n`;
  
  return prompt;
}

function generateIfrAlternatePrompt(args: Record<string, string | undefined>): string {
  const { destination, alternates, eta } = args;
  
  let prompt = `Check IFR alternate airport requirements:\n\n`;
  prompt += `- Destination: ${destination}\n`;
  prompt += `- Potential alternates: ${alternates}\n`;
  
  if (eta) {
    prompt += `- ETA: ${eta}\n`;
  }
  
  prompt += `\nPlease:\n`;
  prompt += `1. Get TAF for destination to check if alternate is required (1-2-3 rule)\n`;
  prompt += `2. Get TAF for all potential alternates\n`;
  prompt += `3. Verify each alternate meets minimum weather requirements at ETA\n`;
  prompt += `4. Consider approach capabilities and weather minimums\n`;
  prompt += `5. Recommend suitable alternates with reasoning\n`;
  
  return prompt;
}