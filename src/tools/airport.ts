/**
 * Airport-related MCP tools
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { AviationWeatherService } from '../services/aviationWeather.js';

export function setupAirportTools(server: McpServer, weatherService: AviationWeatherService) {
  /**
   * Get station info tool
   */
  server.tool(
    'get-station-info',
    'Get detailed information about an airport or weather station',
    {
      station: z.string().regex(/^[A-Z]{4}$/).describe('ICAO airport/station code'),
    },
    async ({ station }) => {
      try {
        const stationInfo = await weatherService.getStationInfo(station);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(stationInfo, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message || 'Station not found'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}