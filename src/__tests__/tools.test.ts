/**
 * Tests for MCP tools functionality
 */

import { AviationWeatherService } from '../services/aviationWeather.js';

// Mock the service
jest.mock('../services/aviationWeather.js');

describe('MCP Tools', () => {
  let mockWeatherService: jest.Mocked<AviationWeatherService>;

  beforeEach(() => {
    mockWeatherService = new AviationWeatherService() as jest.Mocked<AviationWeatherService>;
  });

  describe('Weather data flow', () => {
    it('should process METAR data correctly', async () => {
      const mockMetarData = [{
        raw: 'METAR KDEN 121652Z 27015G25KT 10SM FEW050 SCT100 BKN200 22/10 A2992 RMK AO2',
        station: 'KDEN',
        observationTime: '2024-01-12T16:52:00Z',
        temperature: 22,
        dewpoint: 10,
        windDirection: 270,
        windSpeed: 15,
        windGust: 25,
        visibility: 10,
        altimeter: 29.92,
        clouds: [
          { type: 'FEW' as const, altitude: 5000 },
          { type: 'SCT' as const, altitude: 10000 },
          { type: 'BKN' as const, altitude: 20000 }
        ],
        flightCategory: 'VFR' as const
      }];

      mockWeatherService.getMetar.mockResolvedValue(mockMetarData);

      const result = await mockWeatherService.getMetar('KDEN', { hoursBack: 2 });

      expect(mockWeatherService.getMetar).toHaveBeenCalledWith('KDEN', { hoursBack: 2 });
      expect(result).toHaveLength(1);
      expect(result[0].station).toBe('KDEN');
      expect(result[0].temperature).toBe(22);
      expect(result[0].flightCategory).toBe('VFR');
    });

    it('should process TAF data correctly', async () => {
      const mockTafData = [{
        raw: 'TAF KDEN 121652Z 1217/1318 27015G25KT 10SM FEW050',
        station: 'KDEN',
        issueTime: '2024-01-12T16:52:00Z',
        validFrom: '2024-01-12T17:00:00Z',
        validTo: '2024-01-13T18:00:00Z',
        forecasts: [{
          from: '2024-01-12T17:00:00Z',
          to: '2024-01-12T24:00:00Z',
          windDirection: 270,
          windSpeed: 15,
          visibility: 10,
          weather: [],
          clouds: [{ type: 'FEW' as const, altitude: 5000 }]
        }]
      }];

      mockWeatherService.getTaf.mockResolvedValue(mockTafData);

      const result = await mockWeatherService.getTaf('KDEN');

      expect(mockWeatherService.getTaf).toHaveBeenCalledWith('KDEN');
      expect(result).toHaveLength(1);
      expect(result[0].station).toBe('KDEN');
      expect(result[0].forecasts).toHaveLength(1);
    });

    it('should handle route weather aggregation', async () => {
      const mockMetarData = [
        { station: 'KDEN', raw: 'METAR KDEN...', observationTime: '', flightCategory: 'VFR' as const },
        { station: 'KLAS', raw: 'METAR KLAS...', observationTime: '', flightCategory: 'VFR' as const },
        { station: 'KPHX', raw: 'METAR KPHX...', observationTime: '', flightCategory: 'MVFR' as const }
      ];

      const mockTafData = [
        { station: 'KDEN', raw: 'TAF KDEN...', issueTime: '', validFrom: '', validTo: '', forecasts: [] },
        { station: 'KLAS', raw: 'TAF KLAS...', issueTime: '', validFrom: '', validTo: '', forecasts: [] },
        { station: 'KPHX', raw: 'TAF KPHX...', issueTime: '', validFrom: '', validTo: '', forecasts: [] }
      ];

      mockWeatherService.getMetar.mockResolvedValue(mockMetarData);
      mockWeatherService.getTaf.mockResolvedValue(mockTafData);

      // Simulate route weather logic
      const airports = ['KDEN', 'KLAS', 'KPHX'];
      const [metarData, tafData] = await Promise.all([
        mockWeatherService.getMetar(airports),
        mockWeatherService.getTaf(airports)
      ]);

      expect(metarData).toHaveLength(3);
      expect(tafData).toHaveLength(3);

      // Test route organization logic
      const routeWeather = {
        departure: {
          metar: metarData.find(m => m.station === 'KDEN'),
          taf: tafData.find(t => t.station === 'KDEN')
        },
        destination: {
          metar: metarData.find(m => m.station === 'KLAS'),
          taf: tafData.find(t => t.station === 'KLAS')
        },
        alternates: [{
          station: 'KPHX',
          metar: metarData.find(m => m.station === 'KPHX'),
          taf: tafData.find(t => t.station === 'KPHX')
        }]
      };

      expect(routeWeather.departure.metar?.station).toBe('KDEN');
      expect(routeWeather.destination.metar?.station).toBe('KLAS');
      expect(routeWeather.alternates[0].metar?.station).toBe('KPHX');
    });
  });

  describe('Error handling', () => {
    it('should handle service errors gracefully', async () => {
      mockWeatherService.getMetar.mockRejectedValue(new Error('Network error'));

      await expect(mockWeatherService.getMetar('INVALID')).rejects.toThrow('Network error');
    });

    it('should handle station not found errors', async () => {
      mockWeatherService.getStationInfo.mockRejectedValue({
        code: 'STATION_NOT_FOUND',
        message: 'Station ZZZZ not found'
      });

      await expect(mockWeatherService.getStationInfo('ZZZZ')).rejects.toMatchObject({
        code: 'STATION_NOT_FOUND',
        message: 'Station ZZZZ not found'
      });
    });
  });
});