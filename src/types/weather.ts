/**
 * Aviation Weather Types
 */

export interface MetarData {
  raw: string;
  station: string;
  observationTime: string;
  latitude?: number;
  longitude?: number;
  temperature?: number;
  dewpoint?: number;
  windDirection?: number;
  windSpeed?: number;
  windGust?: number;
  visibility?: number;
  altimeter?: number;
  clouds?: CloudLayer[];
  weather?: string[];
  remarks?: string;
  flightCategory?: FlightCategory;
}

export interface CloudLayer {
  type: 'FEW' | 'SCT' | 'BKN' | 'OVC' | 'CLR' | 'SKC';
  altitude?: number;
}

export type FlightCategory = 'VFR' | 'MVFR' | 'IFR' | 'LIFR';

export interface TafData {
  raw: string;
  station: string;
  issueTime: string;
  validFrom: string;
  validTo: string;
  forecasts: TafForecast[];
}

export interface TafForecast {
  from: string;
  to: string;
  changeType?: 'FM' | 'TEMPO' | 'BECMG' | 'PROB';
  probability?: number;
  windDirection?: number;
  windSpeed?: number;
  windGust?: number;
  visibility?: number;
  weather?: string[];
  clouds?: CloudLayer[];
}

export interface PirepData {
  raw: string;
  observationTime: string;
  reportType: 'ROUTINE' | 'URGENT';
  aircraft?: string;
  location: string;
  altitude?: number;
  turbulence?: TurbulenceReport;
  icing?: IcingReport;
  weather?: string[];
  remarks?: string;
}

export interface TurbulenceReport {
  intensity: 'LIGHT' | 'MODERATE' | 'SEVERE' | 'EXTREME';
  type?: 'CAT' | 'CHOP' | 'MECH';
}

export interface IcingReport {
  intensity: 'TRACE' | 'LIGHT' | 'MODERATE' | 'SEVERE';
  type?: 'RIME' | 'CLEAR' | 'MIXED';
}

export interface AirmetData {
  raw: string;
  hazardType: 'IFR' | 'MOUNTAIN_OBSCURATION' | 'TURBULENCE' | 'ICING' | 'STRONG_SURFACE_WINDS' | 'LOW_LEVEL_WIND_SHEAR';
  validFrom: string;
  validTo: string;
  area: string;
  description: string;
}

export interface SigmetData {
  raw: string;
  hazardType: string;
  validFrom: string;
  validTo: string;
  area: string;
  description: string;
  severity?: 'MODERATE' | 'SEVERE' | 'EXTREME';
}

export interface StationInfo {
  icao: string;
  iata?: string;
  name: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  elevation?: number;
  timezone?: string;
}

export interface WeatherError {
  code: string;
  message: string;
  details?: any;
}