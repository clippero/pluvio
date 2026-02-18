
export interface RainDataPoint {
  date: string;
  amount: number; // in mm
}

export interface WeatherAnalysis {
  locationName: string;
  currentRain: number;
  last24h: number;
  last7days: number;
  monthlyTotal: number;
  chartData: RainDataPoint[];
  summary: string;
  recommendations: string[];
  sources: { title: string; uri: string }[];
}

export interface SavedRecord {
  id: string;
  timestamp: string;
  locationName: string;
  latitude: number;
  longitude: number;
  amount: number;
}

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  error: string | null;
  loading: boolean;
}
