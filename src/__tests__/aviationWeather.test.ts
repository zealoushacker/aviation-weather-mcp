/**
 * Tests for AviationWeatherService
 */

import fetch from 'node-fetch';
import { AviationWeatherService } from '../services/aviationWeather.js';

// Mock fetch
jest.mock('node-fetch');
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('AviationWeatherService', () => {
  let service: AviationWeatherService;

  beforeEach(() => {
    service = new AviationWeatherService();
    mockFetch.mockClear();
  });

  describe('getMetar', () => {
    it('should fetch METAR data for a single station', async () => {
      const mockData = [{
        rawOb: 'METAR KDEN 121652Z 27015G25KT 10SM FEW050 SCT100 BKN200 22/10 A2992 RMK AO2',
        icaoId: 'KDEN',
        obsTime: '2024-01-12T16:52:00Z',
        temp: '22',
        dewp: '10',
        wdir: '270',
        wspd: '15',
        wgst: '25',
        visib: '10',
        altim: '29.92',
        clouds: [
          { cover: 'FEW', base: '5000' },
          { cover: 'SCT', base: '10000' },
          { cover: 'BKN', base: '20000' }
        ]
      }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
        headers: { get: () => 'application/json' }
      } as any);

      const result = await service.getMetar('KDEN');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('metar?ids=KDEN&format=json&hours=2'),
        expect.any(Object)
      );
      expect(result).toHaveLength(1);
      expect(result[0].station).toBe('KDEN');
      expect(result[0].temperature).toBe(22);
      expect(result[0].flightCategory).toBe('VFR');
    });

    it('should handle multiple stations', async () => {
      const mockData = [
        { rawOb: 'METAR KDEN...', icaoId: 'KDEN', temp: '22' },
        { rawOb: 'METAR KLAS...', icaoId: 'KLAS', temp: '25' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
        headers: { get: () => 'application/json' }
      } as any);

      const result = await service.getMetar('KDEN,KLAS');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('ids=KDEN%2CKLAS'),
        expect.any(Object)
      );
      expect(result).toHaveLength(2);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.getMetar('KDEN')).rejects.toMatchObject({
        code: 'FETCH_ERROR',
        message: 'Network error'
      });
    });

    it('should handle timeout', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      await expect(service.getMetar('KDEN')).rejects.toMatchObject({
        code: 'TIMEOUT',
        message: 'Request timed out'
      });
    });
  });

  describe('getTaf', () => {
    it('should fetch TAF data for a single station', async () => {
      const mockData = [{
        rawTaf: 'TAF KDEN 121652Z 1217/1318 27015G25KT 10SM FEW050',
        icaoId: 'KDEN',
        issueTime: '2024-01-12T16:52:00Z',
        validTimeFrom: '2024-01-12T17:00:00Z',
        validTimeTo: '2024-01-13T18:00:00Z',
        forecast: [{
          fcstTimeFrom: '2024-01-12T17:00:00Z',
          fcstTimeTo: '2024-01-12T24:00:00Z',
          wdir: '270',
          wspd: '15',
          visib: '10'
        }]
      }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
        headers: { get: () => 'application/json' }
      } as any);

      const result = await service.getTaf('KDEN');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('taf?ids=KDEN&format=json'),
        expect.any(Object)
      );
      expect(result).toHaveLength(1);
      expect(result[0].station).toBe('KDEN');
      expect(result[0].forecasts).toHaveLength(1);
    });
  });

  describe('getPireps', () => {
    it('should fetch PIREP data for geographic bounds', async () => {
      const mockData = [{
        rawOb: 'UUA /OV DEN/TM 1652/FL080/TP B737/SK 080 OVC/RM SMOOTH',
        obsTime: '2024-01-12T16:52:00Z',
        location: 'DEN',
        altitude: '8000',
        acType: 'B737'
      }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
        headers: { get: () => 'application/json' }
      } as any);

      const result = await service.getPireps({
        minLat: 39.0,
        maxLat: 40.0,
        minLon: -105.0,
        maxLon: -104.0
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('pirep?format=json&hours=3&minLat=39&maxLat=40&minLon=-105&maxLon=-104'),
        expect.any(Object)
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('getAirmets', () => {
    it('should fetch AIRMET data', async () => {
      const mockData = [{
        rawAirmet: 'WAUS45 KCOA 121652\nAIRMET TANGO FOR TURB...',
        hazard: 'TURB',
        validTimeFrom: '2024-01-12T17:00:00Z',
        validTimeTo: '2024-01-12T23:00:00Z',
        region: 'C'
      }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
        headers: { get: () => 'application/json' }
      } as any);

      const result = await service.getAirmets();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('gairmet?format=json'),
        expect.any(Object)
      );
      expect(result).toHaveLength(1);
      expect(result[0].hazardType).toBe('TURBULENCE');
    });
  });

  describe('getStationInfo', () => {
    it('should fetch station information', async () => {
      const mockData = [{
        icaoId: 'KDEN',
        name: 'Denver International Airport',
        lat: '39.8617',
        lon: '-104.6731',
        elev: '5431'
      }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
        headers: { get: () => 'application/json' }
      } as any);

      const result = await service.getStationInfo('KDEN');

      expect(result.icao).toBe('KDEN');
      expect(result.latitude).toBe(39.8617);
      expect(result.longitude).toBe(-104.6731);
      expect(result.elevation).toBe(5431);
    });

    it('should handle station not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
        headers: { get: () => 'application/json' }
      } as any);

      await expect(service.getStationInfo('ZZZZ')).rejects.toMatchObject({
        code: 'STATION_NOT_FOUND',
        message: 'Station ZZZZ not found'
      });
    });
  });

  describe('flight category determination', () => {
    it('should determine VFR conditions', async () => {
      const mockData = [{
        rawOb: 'METAR KDEN...',
        icaoId: 'KDEN',
        visib: '10',
        clouds: [{ cover: 'FEW', base: '5000' }]
      }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
        headers: { get: () => 'application/json' }
      } as any);

      const result = await service.getMetar('KDEN');
      expect(result[0].flightCategory).toBe('VFR');
    });

    it('should determine MVFR conditions', async () => {
      const mockData = [{
        rawOb: 'METAR KDEN...',
        icaoId: 'KDEN',
        visib: '4',
        clouds: [{ cover: 'BKN', base: '2500' }]
      }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
        headers: { get: () => 'application/json' }
      } as any);

      const result = await service.getMetar('KDEN');
      expect(result[0].flightCategory).toBe('MVFR');
    });

    it('should determine IFR conditions', async () => {
      const mockData = [{
        rawOb: 'METAR KDEN...',
        icaoId: 'KDEN',
        visib: '2',
        clouds: [{ cover: 'OVC', base: '800' }]
      }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
        headers: { get: () => 'application/json' }
      } as any);

      const result = await service.getMetar('KDEN');
      expect(result[0].flightCategory).toBe('IFR');
    });

    it('should determine LIFR conditions', async () => {
      const mockData = [{
        rawOb: 'METAR KDEN...',
        icaoId: 'KDEN',
        visib: '0.5',
        clouds: [{ cover: 'OVC', base: '300' }]
      }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
        headers: { get: () => 'application/json' }
      } as any);

      const result = await service.getMetar('KDEN');
      expect(result[0].flightCategory).toBe('LIFR');
    });
  });
});