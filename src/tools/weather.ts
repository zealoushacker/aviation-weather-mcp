/**
 * Weather-related MCP tools
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { AviationWeatherService } from '../services/aviationWeather.js';

export function setupWeatherTools(server: McpServer, weatherService: AviationWeatherService) {
  /**
   * Get METAR tool
   */
  server.tool(
    'get-metar',
    'Fetch current METAR weather observations for one or more airports',
    {
      stations: z.string().describe('ICAO airport code(s). Can be a single code or comma-separated list'),
      hoursBack: z.number().min(1).max(24).optional().describe('Number of hours of historical data to retrieve (default: 2)'),
    },
    async ({ stations, hoursBack }) => {
      try {
        const metarData = await weatherService.getMetar(stations, { hoursBack });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(metarData, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message || 'Unknown error occurred'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * Get TAF tool
   */
  server.tool(
    'get-taf',
    'Fetch TAF (Terminal Aerodrome Forecast) for one or more airports',
    {
      stations: z.string().describe('ICAO airport code(s). Can be a single code or comma-separated list'),
    },
    async ({ stations }) => {
      try {
        const tafData = await weatherService.getTaf(stations);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(tafData, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message || 'Unknown error occurred'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * Get PIREPs tool
   */
  server.tool(
    'get-pireps',
    'Fetch pilot reports (PIREPs) for a geographic area',
    {
      minLat: z.number().min(-90).max(90).optional().describe('Minimum latitude for search area'),
      maxLat: z.number().min(-90).max(90).optional().describe('Maximum latitude for search area'),
      minLon: z.number().min(-180).max(180).optional().describe('Minimum longitude for search area'),
      maxLon: z.number().min(-180).max(180).optional().describe('Maximum longitude for search area'),
      hoursBack: z.number().min(1).max(24).optional().describe('Number of hours of historical data (default: 3)'),
    },
    async ({ minLat, maxLat, minLon, maxLon, hoursBack }) => {
      try {
        const pirepData = await weatherService.getPireps({
          minLat,
          maxLat,
          minLon,
          maxLon,
          hoursBack,
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(pirepData, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message || 'Unknown error occurred'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * Get AIRMETs tool
   */
  server.tool(
    'get-airmets',
    'Fetch current AIRMETs (Airmen\'s Meteorological Information)',
    {
      region: z.string().optional().describe('Region filter (optional)'),
    },
    async ({ region }) => {
      try {
        const airmetData = await weatherService.getAirmets(region);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(airmetData, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message || 'Unknown error occurred'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * Get weather along route tool
   */
  server.tool(
    'get-weather-along-route',
    'Get weather conditions along a flight route',
    {
      departure: z.string().describe('Departure airport ICAO code'),
      destination: z.string().describe('Destination airport ICAO code'),
      alternates: z.string().optional().describe('Alternate airports (comma-separated ICAO codes)'),
    },
    async ({ departure, destination, alternates }) => {
      try {
        // Collect all airports
        const airports = [departure, destination];
        if (alternates) {
          airports.push(...alternates.split(',').map((a: string) => a.trim()));
        }
        
        // Fetch METAR and TAF for all airports
        const [metarData, tafData] = await Promise.all([
          weatherService.getMetar(airports),
          weatherService.getTaf(airports),
        ]);
        
        // Organize by airport (ensure uppercase for comparison)
        const depUpper = departure.toUpperCase();
        const destUpper = destination.toUpperCase();
        
        const routeWeather = {
          departure: {
            metar: metarData.find(m => m.station === depUpper),
            taf: tafData.find(t => t.station === depUpper),
          },
          destination: {
            metar: metarData.find(m => m.station === destUpper),
            taf: tafData.find(t => t.station === destUpper),
          },
          alternates: alternates?.split(',').map((alt: string) => {
            const altUpper = alt.trim().toUpperCase();
            return {
              station: altUpper,
              metar: metarData.find(m => m.station === altUpper),
              taf: tafData.find(t => t.station === altUpper),
            };
          }),
        };
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(routeWeather, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message || 'Unknown error occurred'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * Get weather by radius tool
   */
  server.tool(
    'get-weather-by-radius',
    'Get weather conditions within a radius of an airport',
    {
      centerAirport: z.string().describe('ICAO code of the center airport'),
      radiusNm: z.number().min(5).max(200).describe('Radius in nautical miles (5-200)'),
      includeMetar: z.boolean().optional().describe('Include METAR observations (default: true)'),
      includeTaf: z.boolean().optional().describe('Include TAF forecasts (default: false)'),
      includePireps: z.boolean().optional().describe('Include pilot reports (default: false)'),
    },
    async ({ centerAirport, radiusNm, includeMetar = true, includeTaf = false, includePireps = false }) => {
      try {
        // First get the center airport's coordinates
        const stationInfo = await weatherService.getStationInfo(centerAirport);
        
        if (!stationInfo.latitude || !stationInfo.longitude) {
          throw new Error(`Unable to find coordinates for airport ${centerAirport}`);
        }
        
        // Calculate bounding box from radius
        // Note: This creates a square bounding box, not a circular area
        // Stations in the corners will be slightly beyond the radius
        // 1 degree of latitude = ~60 nautical miles
        // 1 degree of longitude varies by latitude
        const latDegPerNm = 1 / 60;
        const lonDegPerNm = 1 / (60 * Math.cos(stationInfo.latitude * Math.PI / 180));
        
        // For a true circular area, multiply by sqrt(2) to ensure the circle fits within the box
        // but this would return more stations than needed
        const latOffset = radiusNm * latDegPerNm;
        const lonOffset = radiusNm * lonDegPerNm;
        
        const bounds = {
          minLat: stationInfo.latitude - latOffset,
          maxLat: stationInfo.latitude + latOffset,
          minLon: stationInfo.longitude - lonOffset,
          maxLon: stationInfo.longitude + lonOffset,
        };
        
        const results: any = {
          center: {
            airport: centerAirport,
            coordinates: {
              latitude: stationInfo.latitude,
              longitude: stationInfo.longitude,
            },
            radiusNm,
          },
          bounds,
          weather: {},
        };
        
        // Fetch requested weather types
        const promises = [];
        
        if (includeMetar) {
          promises.push(
            weatherService.getMetarByBounds(bounds).then(data => {
              results.weather.metar = data;
            })
          );
        }
        
        if (includeTaf) {
          promises.push(
            weatherService.getTafByBounds(bounds).then(data => {
              results.weather.taf = data;
            })
          );
        }
        
        if (includePireps) {
          promises.push(
            weatherService.getPireps(bounds).then(data => {
              results.weather.pireps = data;
            })
          );
        }
        
        await Promise.all(promises);
        
        // No distance calculation since we don't fetch station coordinates
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message || 'Unknown error occurred'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}