import { GoogleGenAI } from "@google/genai";
import { WeatherAnalysis } from "../types";

export const getRainfallData = async (lat: number, lon: number): Promise<WeatherAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Analiza el registro de lluvia caída para las coordenadas geográficas: Latitud ${lat}, Longitud ${lon}.
    
    Proporciona la siguiente información detallada en ESPAÑOL:
    1. Nombre exacto de la ubicación (Barrio/Ciudad/Región).
    2. Precipitación actual (si está lloviendo ahora).
    3. Total acumulado en las últimas 24 horas (en mm).
    4. Total acumulado en los últimos 7 días (en mm).
    5. Total acumulado en el último mes (en mm).
    6. Una serie de datos para un gráfico de los últimos 7 días.
    7. Un resumen del estado hídrico.
    8. 3 recomendaciones.

    IMPORTANTE: Si no hay datos exactos, estima basándote en estaciones meteorológicas cercanas detectadas por Google Search.
    
    Devuelve la respuesta EXCLUSIVAMENTE en formato JSON:
    {
      "locationName": string,
      "currentRain": number,
      "last24h": number,
      "last7days": number,
      "monthlyTotal": number,
      "chartData": [{"date": string, "amount": number}],
      "summary": string,
      "recommendations": [string]
    }
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
    },
  });

  const rawText = response.text || "{}";
  const data = JSON.parse(rawText);
  
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter(chunk => chunk.web)
    ?.map(chunk => ({
      title: chunk.web?.title || "Fuente de datos",
      uri: chunk.web?.uri || "#"
    })) || [];

  return {
    ...data,
    sources
  };
};

export const searchLocationCoords = async (query: string): Promise<{ lat: number, lon: number, name: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Busca las coordenadas geográficas (latitud y longitud) de: "${query}". Responde solo en JSON con lat, lon y name.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
    },
  });

  const data = JSON.parse(response.text || "{}");
  return {
    lat: data.lat,
    lon: data.lon,
    name: data.name
  };
};