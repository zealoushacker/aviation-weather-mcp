/**
 * Aviation Weather API Client
 * Interfaces with aviationweather.gov API
 */

import fetch from 'node-fetch';
import { 
  MetarData, 
  TafData, 
  PirepData, 
  AirmetData, 
  StationInfo,
  WeatherError,
  CloudLayer,
  FlightCategory
} from '../types/weather.js';

const BASE_URL = 'https://aviationweather.gov/api/data';
const REQUEST_TIMEOUT = 10000; // 10 seconds

export class AviationWeatherService {
  private async fetchWithTimeout(url: string, timeout = REQUEST_TIMEOUT): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'aviation-weather-mcp/0.1.0'
        }
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw {
          code: 'TIMEOUT',
          message: 'Request timed out',
          details: { url, timeout }
        } as WeatherError;
      }
      
      throw {
        code: 'FETCH_ERROR',
        message: error.message,
        details: { url, error: error.toString() }
      } as WeatherError;
    }
  }

  /**
   * Fetch METAR data for one or more stations
   */
  async getMetar(stations: string | string[], options?: {
    hoursBack?: number;
    format?: 'raw' | 'decoded';
  }): Promise<MetarData[]> {
    // Clean up station list - remove spaces and ensure proper formatting
    let stationList: string;
    if (Array.isArray(stations)) {
      stationList = stations.map(s => s.trim().toUpperCase()).join(',');
    } else {
      // Split by comma, trim each station, and rejoin
      stationList = stations.split(',').map(s => s.trim().toUpperCase()).join(',');
    }
    
    const params = new URLSearchParams({
      ids: stationList,
      format: 'json',
      hours: String(options?.hoursBack || 2)
    });

    const url = `${BASE_URL}/metar?${params}`;
    const data = await this.fetchWithTimeout(url);

    if (!Array.isArray(data)) {
      throw {
        code: 'INVALID_RESPONSE',
        message: 'Expected array of METAR data',
        details: { data }
      } as WeatherError;
    }

    return data.map(item => this.parseMetarResponse(item));
  }

  /**
   * Fetch TAF data for one or more stations
   */
  async getTaf(stations: string | string[], _options?: {
    hoursAhead?: number;
    format?: 'raw' | 'decoded';
  }): Promise<TafData[]> {
    // Clean up station list - remove spaces and ensure proper formatting
    let stationList: string;
    if (Array.isArray(stations)) {
      stationList = stations.map(s => s.trim().toUpperCase()).join(',');
    } else {
      // Split by comma, trim each station, and rejoin
      stationList = stations.split(',').map(s => s.trim().toUpperCase()).join(',');
    }
    
    const params = new URLSearchParams({
      ids: stationList,
      format: 'json'
    });

    const url = `${BASE_URL}/taf?${params}`;
    const data = await this.fetchWithTimeout(url);

    if (!Array.isArray(data)) {
      throw {
        code: 'INVALID_RESPONSE',
        message: 'Expected array of TAF data',
        details: { data }
      } as WeatherError;
    }

    return data.map(item => this.parseTafResponse(item));
  }

  /**
   * Fetch PIREPs within a geographic area or along a route
   */
  async getPireps(options: {
    minLat?: number;
    maxLat?: number;
    minLon?: number;
    maxLon?: number;
    hoursBack?: number;
  }): Promise<PirepData[]> {
    const params = new URLSearchParams({
      format: 'json',
      hours: String(options.hoursBack || 3)
    });

    if (options.minLat && options.maxLat && options.minLon && options.maxLon) {
      params.append('minLat', String(options.minLat));
      params.append('maxLat', String(options.maxLat));
      params.append('minLon', String(options.minLon));
      params.append('maxLon', String(options.maxLon));
    }

    const url = `${BASE_URL}/pirep?${params}`;
    const data = await this.fetchWithTimeout(url);

    if (!Array.isArray(data)) {
      throw {
        code: 'INVALID_RESPONSE',
        message: 'Expected array of PIREP data',
        details: { data }
      } as WeatherError;
    }

    return data.map(item => this.parsePirepResponse(item));
  }

  /**
   * Fetch AIRMETs for a specific region
   */
  async getAirmets(_region?: string): Promise<AirmetData[]> {
    const params = new URLSearchParams({
      format: 'json'
    });

    const url = `${BASE_URL}/gairmet?${params}`;
    const data = await this.fetchWithTimeout(url);

    if (!Array.isArray(data)) {
      throw {
        code: 'INVALID_RESPONSE',
        message: 'Expected array of AIRMET data',
        details: { data }
      } as WeatherError;
    }

    return data.map(item => this.parseAirmetResponse(item));
  }

  /**
   * Fetch METAR data by geographic bounds
   */
  async getMetarByBounds(bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  }, _options?: {
    hoursBack?: number;
  }): Promise<MetarData[]> {
    // Use bbox parameter format: minLat,minLon,maxLat,maxLon
    // Round to integers as the API seems to have issues with decimals
    const bbox = `${Math.floor(bounds.minLat)},${Math.floor(bounds.minLon)},${Math.ceil(bounds.maxLat)},${Math.ceil(bounds.maxLon)}`;
    
    const params = new URLSearchParams({
      bbox: bbox
    });

    const url = `${BASE_URL}/metar?${params}`;
    
    // For bbox queries, we need to accept text responses
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: {
          'Accept': 'text/plain, application/json',
          'User-Agent': 'aviation-weather-mcp/0.1.0'
        }
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      const data = contentType?.includes('json') ? await response.json() : await response.text();
      
      // The bbox endpoint returns raw METAR text, not JSON
      if (typeof data === 'string') {
        const lines = data.split('\n').filter(line => line.trim());
        const results: MetarData[] = [];
        
        for (const line of lines) {
          if (line.trim()) {
            // Extract station ID from the raw METAR
            const parts = line.trim().split(' ');
            const stationMatch = parts[0].match(/^[A-Z]{4}$/);
            
            if (stationMatch) {
              // Create a minimal METAR object with just raw text and station
              results.push({
                raw: line.trim(),
                station: stationMatch[0]
              } as any);
            }
          }
        }
        
        return results;
      }
      
      // If response is already JSON, parse it normally
      if (Array.isArray(data)) {
        return data.map(item => this.parseMetarResponse(item));
      }
      
      return [];
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw {
          code: 'TIMEOUT',
          message: 'Request timed out',
          details: { url, timeout: REQUEST_TIMEOUT }
        } as WeatherError;
      }
      
      throw {
        code: 'FETCH_ERROR',
        message: error.message,
        details: { url, error: error.toString() }
      } as WeatherError;
    }
  }

  /**
   * Fetch TAF data by geographic bounds
   */
  async getTafByBounds(bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  }): Promise<TafData[]> {
    // Use bbox parameter format: minLon,minLat,maxLon,maxLat
    // Round to integers as the API seems to have issues with decimals
    const bbox = `${Math.floor(bounds.minLon)},${Math.floor(bounds.minLat)},${Math.ceil(bounds.maxLon)},${Math.ceil(bounds.maxLat)}`;
    
    const params = new URLSearchParams({
      bbox: bbox
    });

    const url = `${BASE_URL}/taf?${params}`;
    
    // For bbox queries, we need to accept text responses
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: {
          'Accept': 'text/plain, application/json',
          'User-Agent': 'aviation-weather-mcp/0.1.0'
        }
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      const data = contentType?.includes('json') ? await response.json() : await response.text();
      
      // The bbox endpoint might return raw TAF text
      if (typeof data === 'string') {
        const lines = data.split('\n').filter(line => line.trim());
        const results: TafData[] = [];
        
        let currentTaf: string[] = [];
        for (const line of lines) {
          if (line.trim()) {
            // TAFs start with "TAF" or station code
            const startsNewTaf = line.match(/^(TAF\s+)?[A-Z]{4}\s+\d{6}Z/);
            
            if (startsNewTaf) {
              // Process previous TAF if exists
              if (currentTaf.length > 0) {
                const tafText = currentTaf.join(' ');
                const stationMatch = tafText.match(/^(TAF\s+)?([A-Z]{4})/);
                if (stationMatch) {
                  results.push({
                    raw: tafText,
                    station: stationMatch[2]
                  } as any);
                }
              }
              // Start new TAF
              currentTaf = [line.trim()];
            } else if (currentTaf.length > 0) {
              // Continue current TAF
              currentTaf.push(line.trim());
            }
          }
        }
        
        // Process last TAF
        if (currentTaf.length > 0) {
          const tafText = currentTaf.join(' ');
          const stationMatch = tafText.match(/^(TAF\s+)?([A-Z]{4})/);
          if (stationMatch) {
            results.push({
              raw: tafText,
              station: stationMatch[2]
            } as any);
          }
        }
        
        return results;
      }
      
      // If response is JSON, parse it normally
      if (Array.isArray(data)) {
        return data.map(item => this.parseTafResponse(item));
      }
      
      return [];
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw {
          code: 'TIMEOUT',
          message: 'Request timed out',
          details: { url, timeout: REQUEST_TIMEOUT }
        } as WeatherError;
      }
      
      throw {
        code: 'FETCH_ERROR',
        message: error.message,
        details: { url, error: error.toString() }
      } as WeatherError;
    }
  }

  /**
   * Fetch station information
   */
  async getStationInfo(station: string): Promise<StationInfo> {
    const cleanStation = station.trim().toUpperCase();
    
    // Get station info from METAR data which includes coordinates
    const params = new URLSearchParams({
      ids: cleanStation,
      format: 'json',
      hours: '1'
    });

    const url = `${BASE_URL}/metar?${params}`;
    const data = await this.fetchWithTimeout(url);

    if (!Array.isArray(data) || data.length === 0) {
      throw {
        code: 'STATION_NOT_FOUND',
        message: `Station ${cleanStation} not found`,
        details: { station: cleanStation }
      } as WeatherError;
    }

    // Extract station info from METAR data
    const stationData = data[0];
    return {
      icao: stationData.icaoId || cleanStation,
      name: stationData.name || cleanStation,
      latitude: parseFloat(stationData.lat) || undefined,
      longitude: parseFloat(stationData.lon) || undefined,
      elevation: stationData.elev ? parseInt(stationData.elev) : undefined,
    };
  }

  /**
   * Parse METAR API response
   */
  private parseMetarResponse(data: any): MetarData {
    const metar: MetarData = {
      raw: data.rawOb || data.raw_text || '',
      station: data.icaoId || data.station || '',
      observationTime: data.obsTime || data.observation_time || '',
      temperature: parseFloat(data.temp) || undefined,
      dewpoint: parseFloat(data.dewp) || undefined,
      windDirection: parseInt(data.wdir) || undefined,
      windSpeed: parseInt(data.wspd) || undefined,
      windGust: parseInt(data.wgst) || undefined,
      visibility: this.parseVisibility(data.visib),
      altimeter: parseFloat(data.altim) || undefined,
      clouds: this.parseClouds(data.clouds || data.skyCondition || []),
      weather: data.wxString ? [data.wxString] : [],
      flightCategory: this.determineFlightCategory(data)
    };

    return metar;
  }

  /**
   * Parse TAF API response
   */
  private parseTafResponse(data: any): TafData {
    const taf: TafData = {
      raw: data.rawTaf || data.raw_text || '',
      station: data.icaoId || data.station || '',
      issueTime: data.issueTime || '',
      validFrom: data.validTimeFrom || '',
      validTo: data.validTimeTo || '',
      forecasts: []
    };

    if (data.forecast || data.fcsts) {
      const forecasts = data.forecast || data.fcsts;
      taf.forecasts = forecasts.map((fc: any) => ({
        from: fc.timeFrom || fc.fcstTimeFrom || '',
        to: fc.timeTo || fc.fcstTimeTo || '',
        changeType: fc.changeIndicator || undefined,
        windDirection: parseInt(fc.wdir) || undefined,
        windSpeed: parseInt(fc.wspd) || undefined,
        windGust: parseInt(fc.wgst) || undefined,
        visibility: this.parseVisibility(fc.visib),
        weather: fc.wxString ? [fc.wxString] : [],
        clouds: this.parseClouds(fc.clouds || fc.skyCondition || [])
      }));
    }

    return taf;
  }

  /**
   * Parse PIREP API response
   */
  private parsePirepResponse(data: any): PirepData {
    const pirep: PirepData = {
      raw: data.rawOb || data.raw_text || '',
      observationTime: data.obsTime || data.observation_time || '',
      reportType: data.urgency === 'URGENT' ? 'URGENT' : 'ROUTINE',
      aircraft: data.acType || undefined,
      location: data.location || '',
      altitude: data.altitude ? parseInt(data.altitude) : undefined,
      remarks: data.remarks || undefined
    };

    // Parse turbulence if present
    if (data.turbulence) {
      pirep.turbulence = {
        intensity: this.parseTurbulenceIntensity(data.turbulence)
      };
    }

    // Parse icing if present
    if (data.icing) {
      pirep.icing = {
        intensity: this.parseIcingIntensity(data.icing)
      };
    }

    return pirep;
  }

  /**
   * Parse AIRMET API response
   */
  private parseAirmetResponse(data: any): AirmetData {
    return {
      raw: data.rawAirmet || data.raw_text || '',
      hazardType: this.parseHazardType(data.hazard || data.hazardType),
      validFrom: data.validTimeFrom || '',
      validTo: data.validTimeTo || '',
      area: data.region || '',
      description: data.text || ''
    };
  }


  /**
   * Parse visibility value handling special cases
   */
  private parseVisibility(value: any): number | undefined {
    if (!value) return undefined;
    
    // Handle "10+" format
    if (typeof value === 'string') {
      if (value.endsWith('+')) {
        return parseFloat(value.replace('+', ''));
      }
      // Handle "P6SM" format
      if (value.startsWith('P') && value.endsWith('SM')) {
        return parseFloat(value.replace('P', '').replace('SM', ''));
      }
    }
    
    return parseFloat(value) || undefined;
  }

  /**
   * Parse cloud layers from API response
   */
  private parseClouds(clouds: any[]): CloudLayer[] {
    if (!Array.isArray(clouds)) return [];
    
    return clouds.map(cloud => ({
      type: cloud.cover || cloud.skyCover || 'CLR',
      altitude: cloud.base ? parseInt(cloud.base) : undefined
    })) as CloudLayer[];
  }

  /**
   * Determine flight category based on ceiling and visibility
   */
  private determineFlightCategory(data: any): FlightCategory {
    const visibility = this.parseVisibility(data.visib);
    const clouds = this.parseClouds(data.clouds || []);
    
    // Find lowest ceiling (BKN or OVC)
    let ceiling: number | undefined;
    for (const cloud of clouds) {
      if ((cloud.type === 'BKN' || cloud.type === 'OVC') && cloud.altitude) {
        if (!ceiling || cloud.altitude < ceiling) {
          ceiling = cloud.altitude;
        }
      }
    }

    // LIFR: Ceiling < 500ft OR Visibility < 1SM
    if ((ceiling && ceiling < 500) || (visibility && visibility < 1)) {
      return 'LIFR';
    }
    
    // IFR: Ceiling < 1000ft OR Visibility < 3SM
    if ((ceiling && ceiling < 1000) || (visibility && visibility < 3)) {
      return 'IFR';
    }
    
    // MVFR: Ceiling < 3000ft OR Visibility < 5SM
    if ((ceiling && ceiling < 3000) || (visibility && visibility < 5)) {
      return 'MVFR';
    }
    
    // VFR: Everything else
    return 'VFR';
  }

  private parseTurbulenceIntensity(value: string): 'LIGHT' | 'MODERATE' | 'SEVERE' | 'EXTREME' {
    const upper = value.toUpperCase();
    if (upper.includes('EXTREME')) return 'EXTREME';
    if (upper.includes('SEVERE')) return 'SEVERE';
    if (upper.includes('MODERATE')) return 'MODERATE';
    return 'LIGHT';
  }

  private parseIcingIntensity(value: string): 'TRACE' | 'LIGHT' | 'MODERATE' | 'SEVERE' {
    const upper = value.toUpperCase();
    if (upper.includes('SEVERE')) return 'SEVERE';
    if (upper.includes('MODERATE')) return 'MODERATE';
    if (upper.includes('TRACE')) return 'TRACE';
    return 'LIGHT';
  }

  private parseHazardType(value: string): AirmetData['hazardType'] {
    const upper = value.toUpperCase();
    if (upper.includes('IFR')) return 'IFR';
    if (upper.includes('MOUNTAIN') || upper.includes('MTN')) return 'MOUNTAIN_OBSCURATION';
    if (upper.includes('TURB')) return 'TURBULENCE';
    if (upper.includes('ICE') || upper.includes('ICING')) return 'ICING';
    if (upper.includes('WIND') && upper.includes('SHEAR')) return 'LOW_LEVEL_WIND_SHEAR';
    if (upper.includes('WIND')) return 'STRONG_SURFACE_WINDS';
    return 'IFR'; // Default
  }
}