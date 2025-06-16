/**
 * Weather analysis and interpretation tools
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { AviationWeatherService } from '../services/aviationWeather.js';
import { FlightCategory, MetarData } from '../types/weather.js';

export function setupAnalysisTools(server: McpServer, weatherService: AviationWeatherService) {
  /**
   * Determine flight category tool
   */
  server.tool(
    'determine-flight-category',
    'Determine the flight category (VFR/MVFR/IFR/LIFR) for given weather conditions',
    {
      station: z.string().optional().describe('ICAO airport code to analyze'),
      ceiling: z.number().optional().describe('Ceiling height in feet (optional if station provided)'),
      visibility: z.number().optional().describe('Visibility in statute miles (optional if station provided)'),
    },
    async ({ station, ceiling, visibility }) => {
      try {
        let category: FlightCategory;
        
        if (station) {
          // Fetch current METAR for the station
          const metarData = await weatherService.getMetar(station, { hoursBack: 1 });
          if (metarData.length === 0) {
            throw new Error(`No METAR data available for ${station}`);
          }
          
          category = metarData[0].flightCategory || 'VFR';
        } else if (ceiling !== undefined || visibility !== undefined) {
          // Determine based on provided values
          category = determineFlightCategory(ceiling, visibility);
        } else {
          throw new Error('Either station or ceiling/visibility must be provided');
        }
        
        const explanation = getFlightCategoryExplanation(category);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                category,
                explanation,
                minimums: getFlightCategoryMinimums(category),
              }, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
  
  /**
   * Check VFR minimums tool
   */
  server.tool(
    'check-vfr-minimums',
    'Check if weather conditions meet VFR minimums',
    {
      stations: z.string().describe('ICAO airport code(s) to check'),
      minCeiling: z.number().optional().describe('Minimum ceiling requirement in feet (default: 3000)'),
      minVisibility: z.number().optional().describe('Minimum visibility requirement in miles (default: 5)'),
    },
    async ({ stations, minCeiling = 3000, minVisibility = 5 }) => {
      try {
        const metarData = await weatherService.getMetar(stations, { hoursBack: 1 });
        
        const results = metarData.map(metar => {
          const meetsMinimums = checkVfrMinimums(metar, minCeiling, minVisibility);
          
          return {
            station: metar.station,
            meetsVfrMinimums: meetsMinimums.meets,
            currentConditions: {
              ceiling: meetsMinimums.ceiling,
              visibility: metar.visibility,
              flightCategory: metar.flightCategory,
            },
            requiredMinimums: {
              ceiling: minCeiling,
              visibility: minVisibility,
            },
            issues: meetsMinimums.issues,
          };
        });
        
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
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
  
  /**
   * Decode METAR tool
   */
  server.tool(
    'decode-metar',
    'Decode a raw METAR string into human-readable format',
    {
      metar: z.string().describe('Raw METAR string to decode'),
    },
    async ({ metar }) => {
      try {
        const decoded = decodeMetar(metar);
        
        return {
          content: [
            {
              type: 'text',
              text: decoded,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error decoding METAR: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

/**
 * Helper functions
 */

function determineFlightCategory(ceiling?: number, visibility?: number): FlightCategory {
  // LIFR: Ceiling < 500ft OR Visibility < 1SM
  if ((ceiling !== undefined && ceiling < 500) || (visibility !== undefined && visibility < 1)) {
    return 'LIFR';
  }
  
  // IFR: Ceiling < 1000ft OR Visibility < 3SM
  if ((ceiling !== undefined && ceiling < 1000) || (visibility !== undefined && visibility < 3)) {
    return 'IFR';
  }
  
  // MVFR: Ceiling < 3000ft OR Visibility < 5SM
  if ((ceiling !== undefined && ceiling < 3000) || (visibility !== undefined && visibility < 5)) {
    return 'MVFR';
  }
  
  // VFR: Everything else
  return 'VFR';
}

function getFlightCategoryExplanation(category: FlightCategory): string {
  switch (category) {
    case 'VFR':
      return 'Visual Flight Rules - Good weather conditions for visual flight';
    case 'MVFR':
      return 'Marginal Visual Flight Rules - Marginal conditions for visual flight';
    case 'IFR':
      return 'Instrument Flight Rules - Instrument flight required';
    case 'LIFR':
      return 'Low Instrument Flight Rules - Very poor conditions, approach minimums may be a factor';
  }
}

function getFlightCategoryMinimums(category: FlightCategory) {
  switch (category) {
    case 'VFR':
      return { ceiling: '>= 3000 ft', visibility: '>= 5 SM' };
    case 'MVFR':
      return { ceiling: '1000-2999 ft', visibility: '3-4 SM' };
    case 'IFR':
      return { ceiling: '500-999 ft', visibility: '1-2 SM' };
    case 'LIFR':
      return { ceiling: '< 500 ft', visibility: '< 1 SM' };
  }
}

function checkVfrMinimums(metar: MetarData, minCeiling: number, minVisibility: number) {
  const issues: string[] = [];
  let ceiling: number | undefined;
  
  // Find the ceiling
  if (metar.clouds) {
    for (const cloud of metar.clouds) {
      if ((cloud.type === 'BKN' || cloud.type === 'OVC') && cloud.altitude) {
        if (!ceiling || cloud.altitude < ceiling) {
          ceiling = cloud.altitude;
        }
      }
    }
  }
  
  // Check ceiling
  if (ceiling && ceiling < minCeiling) {
    issues.push(`Ceiling ${ceiling} ft is below minimum ${minCeiling} ft`);
  }
  
  // Check visibility
  if (metar.visibility && metar.visibility < minVisibility) {
    issues.push(`Visibility ${metar.visibility} SM is below minimum ${minVisibility} SM`);
  }
  
  return {
    meets: issues.length === 0,
    ceiling,
    issues,
  };
}

function decodeMetar(raw: string): string {
  // Basic METAR decoder - this is simplified
  const parts = raw.trim().split(/\s+/);
  let decoded = 'Decoded METAR:\n\n';
  
  let index = 0;
  
  // Type
  if (parts[index] === 'METAR' || parts[index] === 'SPECI') {
    decoded += `Type: ${parts[index] === 'SPECI' ? 'Special observation' : 'Routine observation'}\n`;
    index++;
  }
  
  // Station
  if (parts[index] && parts[index].match(/^[A-Z]{4}$/)) {
    decoded += `Station: ${parts[index]}\n`;
    index++;
  }
  
  // Time
  if (parts[index] && parts[index].match(/\d{6}Z/)) {
    const time = parts[index];
    const day = time.substring(0, 2);
    const hour = time.substring(2, 4);
    const minute = time.substring(4, 6);
    decoded += `Observation Time: Day ${day}, ${hour}:${minute} UTC\n`;
    index++;
  }
  
  // Wind
  if (parts[index] && parts[index].match(/\d{3}\d{2}(G\d{2})?KT/)) {
    const wind = parts[index];
    const dir = wind.substring(0, 3);
    const speed = wind.substring(3, 5);
    const gust = wind.match(/G(\d{2})/);
    
    decoded += `Wind: ${dir === 'VRB' ? 'Variable' : dir + '°'} at ${parseInt(speed)} knots`;
    if (gust) {
      decoded += ` gusting to ${parseInt(gust[1])} knots`;
    }
    decoded += '\n';
    index++;
  }
  
  // Visibility
  while (index < parts.length) {
    const part = parts[index];
    if (part.match(/^\d+SM$/) || part.match(/^M?\d+\/\d+SM$/) || part === 'CAVOK') {
      if (part === 'CAVOK') {
        decoded += 'Visibility: Ceiling and Visibility OK (>10SM, no clouds below 5000ft)\n';
      } else {
        decoded += `Visibility: ${part}\n`;
      }
      index++;
      break;
    }
    index++;
  }
  
  // Weather phenomena
  const weatherCodes: Record<string, string> = {
    'RA': 'Rain',
    'SN': 'Snow',
    'BR': 'Mist',
    'FG': 'Fog',
    'HZ': 'Haze',
    'TS': 'Thunderstorm',
    'SH': 'Showers',
    'FZ': 'Freezing',
    'DZ': 'Drizzle',
  };
  
  const weather: string[] = [];
  while (index < parts.length) {
    const part = parts[index];
    if (part.match(/^(\+|-)?(VC)?[A-Z]{2,6}$/)) {
      let description = '';
      if (part.startsWith('+')) description += 'Heavy ';
      if (part.startsWith('-')) description += 'Light ';
      if (part.includes('VC')) description += 'In vicinity ';
      
      // Decode weather phenomena
      const code = part.replace(/^(\+|-)?VC?/, '');
      for (const [key, value] of Object.entries(weatherCodes)) {
        if (code.includes(key)) {
          description += value + ' ';
        }
      }
      
      if (description) {
        weather.push(description.trim());
      }
      index++;
    } else {
      break;
    }
  }
  
  if (weather.length > 0) {
    decoded += `Weather: ${weather.join(', ')}\n`;
  }
  
  // Clouds
  const clouds: string[] = [];
  while (index < parts.length) {
    const part = parts[index];
    if (part.match(/^(CLR|SKC|FEW|SCT|BKN|OVC)\d{3}(CB|TCU)?$/)) {
      const type = part.substring(0, 3);
      const height = parseInt(part.substring(3, 6)) * 100;
      const cb = part.includes('CB') ? ' Cumulonimbus' : part.includes('TCU') ? ' Towering Cumulus' : '';
      
      const typeMap: Record<string, string> = {
        'CLR': 'Clear',
        'SKC': 'Sky Clear',
        'FEW': 'Few',
        'SCT': 'Scattered',
        'BKN': 'Broken',
        'OVC': 'Overcast',
      };
      
      clouds.push(`${typeMap[type]} at ${height} ft${cb}`);
      index++;
    } else if (part === 'CLR' || part === 'SKC') {
      clouds.push('Clear skies');
      index++;
    } else {
      break;
    }
  }
  
  if (clouds.length > 0) {
    decoded += `Clouds: ${clouds.join(', ')}\n`;
  }
  
  // Temperature/Dewpoint
  if (index < parts.length && parts[index].match(/^M?\d{2}\/M?\d{2}$/)) {
    const temps = parts[index].split('/');
    const temp = temps[0].replace('M', '-');
    const dewpoint = temps[1].replace('M', '-');
    decoded += `Temperature: ${temp}°C, Dewpoint: ${dewpoint}°C\n`;
    index++;
  }
  
  // Altimeter
  if (index < parts.length && (parts[index].match(/^A\d{4}$/) || parts[index].match(/^Q\d{4}$/))) {
    const alt = parts[index];
    if (alt.startsWith('A')) {
      const value = parseInt(alt.substring(1)) / 100;
      decoded += `Altimeter: ${value.toFixed(2)} inHg\n`;
    } else {
      const value = parseInt(alt.substring(1));
      decoded += `QNH: ${value} hPa\n`;
    }
    index++;
  }
  
  // Remarks
  const rmkIndex = parts.indexOf('RMK');
  if (rmkIndex !== -1) {
    decoded += `Remarks: ${parts.slice(rmkIndex + 1).join(' ')}\n`;
  }
  
  return decoded;
}