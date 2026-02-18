import React, { useState, useEffect, useCallback } from 'react';
import { getRainfallData, searchLocationCoords } from './services/geminiService';
import { WeatherAnalysis, LocationState, SavedRecord } from './types';
import RainChart from './components/RainChart';
import LoadingSkeleton from './components/LoadingSkeleton';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'history'>('home');
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    locationName: null,
    error: null,
    loading: true,
  });
  
  const [analysis, setAnalysis] = useState<WeatherAnalysis | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [history, setHistory] = useState<SavedRecord[]>([]);
  const [showManualLog, setShowManualLog] = useState(false);
  const [manualAmount, setManualAmount] = useState<number>(0);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('pluviotrack_history');
    if (saved) setHistory(JSON.parse(saved));
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && !window.matchMedia('(display-mode: standalone)').matches) {
      setTimeout(() => setShowInstallPrompt(true), 3000);
    }
  }, []);

  const saveHistory = (newHistory: SavedRecord[]) => {
    setHistory(newHistory);
    localStorage.setItem('pluviotrack_history', JSON.stringify(newHistory));
  };

  const fetchData = useCallback(async (lat: number, lon: number) => {
    setIsRefreshing(true);
    setLocation(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getRainfallData(lat, lon);
      setAnalysis(data);
      setLocation(prev => ({ ...prev, latitude: lat, longitude: lon, locationName: data.locationName, loading: false }));
    } catch (err) {
      console.error("Error fetching data:", err);
      setLocation(prev => ({ ...prev, loading: false, error: "Error al conectar con el servidor de clima." }));
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const getUserLocation = useCallback(() => {
    setLocation(prev => ({ ...prev, loading: true, error: null }));
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, loading: false, error: "Tu navegador no soporta geolocalización." }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchData(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        let msg = "Error de GPS.";
        if (error.code === 1) msg = "Por favor, permite el acceso a la ubicación.";
        else if (error.code === 2) msg = "Ubicación no disponible.";
        else if (error.code === 3) msg = "Tiempo de espera agotado.";
        setLocation(prev => ({ ...prev, loading: false, error: msg }));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [fetchData]);

  useEffect(() => {
    getUserLocation();
  }, [getUserLocation]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLocation(prev => ({ ...prev, loading: true, error: null }));
    try {
      const coords = await searchLocationCoords(searchQuery);
      fetchData(coords.lat, coords.lon);
      setSearchQuery('');
    } catch (err) {
      setLocation(prev => ({ ...prev, loading: false, error: "No pudimos encontrar esa ubicación." }));
    }
  };

  const handleFixData = () => {
    if (!analysis || location.latitude === null || location.longitude === null) return;
    const newRecord: SavedRecord = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString('es-AR'),
      locationName: analysis.locationName,
      latitude: location.latitude,
      longitude: location.longitude,
      amount: manualAmount || analysis.last24h
    };
    saveHistory([newRecord, ...history]);
    setShowManualLog(false);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen pb-32 px-5 pt-10 bg-[#020617]">
      <header className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
              Pluvio<span className="text-blue-500">Track</span>
            </h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Nivel de Agua V2.0</p>
          </div>
          <button 
            onClick={getUserLocation}
            className="p-3 bg-blue-600/10 text-blue-400 rounded-2xl border border-blue-500/20 active:scale-90 transition-all glow-blue"
            aria-label="Refrescar ubicación"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSearch} className="relative">
          <input 
            type="text" 
            placeholder="Buscar otra ciudad..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 px-5 pl-12 text-white placeholder-slate-600 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all shadow-inner"
          />
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </form>
      </header>

      {activeTab === 'home' ? (
        <>
          {location.error && (
            <div className="bg-red-500/10 text-red-400 p-4 rounded-2xl mb-6 text-xs font-bold border border-red-500/20 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                {location.error}
              </div>
              <button 
                onClick={getUserLocation}
                className="mt-2 text-blue-400 underline text-left"
              >
                Reintentar obtener ubicación
              </button>
            </div>
          )}

          {location.loading ? (
            <div className="space-y-4">
              <p className="text-blue-400 text-xs font-bold animate-pulse text-center">Conectando con satélites meteorológicos...</p>
              <LoadingSkeleton />
            </div>
          ) : analysis ? (
            <div className="space-y-6 animate-in fade-in duration-500">
              <section className="glass-dark rounded-[2.5rem] p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-[60px] rounded-full"></div>
                
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <h2 className="text-blue-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Ubicación</h2>
                    <p className="text-2xl font-extrabold text-white leading-tight">{analysis.locationName}</p>
                  </div>
                  <div className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-[10px] font-mono">
                    LIVE
                  </div>
                </div>

                <div className="mb-10">
                  <div className="flex items-baseline gap-2">
                    <span className="text-8xl font-black text-white tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                      {analysis.last24h}
                    </span>
                    <span className="text-2xl font-bold text-slate-500">mm</span>
                  </div>
                  <p className="text-slate-400 font-medium text-sm">Últimas 24hs</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-slate-950/40 p-5 rounded-3xl border border-slate-800 text-center">
                    <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mb-1">Semanal</p>
                    <p className="text-xl font-bold text-white">{analysis.last7days} mm</p>
                  </div>
                  <div className="bg-slate-950/40 p-5 rounded-3xl border border-slate-800 text-center">
                    <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mb-1">Mensual</p>
                    <p className="text-xl font-bold text-white">{analysis.monthlyTotal} mm</p>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setManualAmount(analysis.last24h);
                    setShowManualLog(true);
                  }}
                  className="w-full bg-blue-600 text-white font-extrabold py-5 rounded-3xl shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all hover:bg-blue-500"
                >
                  Confirmar Medición
                </button>
              </section>

              <section className="glass-dark rounded-[2rem] p-6">
                <RainChart data={analysis.chartData} />
              </section>

              <section className="bg-blue-600/10 rounded-[2rem] p-7 border border-blue-500/10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2.5 bg-blue-500 rounded-2xl text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13.536 14.95a1 1 0 010-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414 0zM6.464 14.95l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-white">Análisis IA</h3>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">{analysis.summary}</p>
                <div className="space-y-3">
                  {analysis.recommendations.map((r, i) => (
                    <div key={i} className="flex gap-4 p-4 bg-slate-900/40 rounded-2xl border border-slate-800 text-xs text-slate-300">
                      <div className="w-1 h-full bg-blue-500 rounded-full flex-shrink-0"></div>
                      {r}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-slate-500">Esperando datos de ubicación...</p>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4 pb-10">
          <div className="px-2 mb-6">
            <h2 className="text-xl font-extrabold text-white">Mi Historial</h2>
            <p className="text-slate-500 text-xs mt-1">Registros guardados localmente</p>
          </div>
          
          {history.length === 0 ? (
            <div className="text-center py-24 glass-dark rounded-[2.5rem] border-dashed border-slate-800">
              <p className="text-slate-500 font-medium">No has guardado registros todavía.</p>
            </div>
          ) : (
            history.map(record => (
              <div key={record.id} className="glass-dark p-6 rounded-3xl flex justify-between items-center active:bg-slate-900 transition-all">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl font-black text-blue-400">{record.amount} mm</span>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">{record.timestamp.split(',')[0]}</span>
                  </div>
                  <p className="text-sm text-slate-200 font-semibold">{record.locationName}</p>
                </div>
                <button 
                  onClick={() => saveHistory(history.filter(r => r.id !== record.id))}
                  className="p-3 text-slate-700 hover:text-red-500 bg-slate-950/50 rounded-2xl border border-slate-800"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {showInstallPrompt && (
        <div className="fixed top-6 left-5 right-5 z-[60] bg-blue-600 p-4 rounded-3xl shadow-2xl flex items-center justify-between animate-in slide-in-from-top-full duration-500">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-blue-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
             </div>
             <div>
                <p className="text-white font-bold text-sm">Instalar PluvioTrack</p>
                <p className="text-blue-100 text-[10px]">Añade el acceso directo a tu inicio</p>
             </div>
          </div>
          <button onClick={() => setShowInstallPrompt(false)} className="text-white/60 p-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {showManualLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-10 border border-slate-800 shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-black text-white mb-2">Guardar Medición</h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-10">Confirma los milímetros</p>
            
            <div className="mb-10 text-center">
              <input 
                type="number" 
                value={manualAmount}
                onChange={(e) => setManualAmount(Number(e.target.value))}
                className="w-full text-7xl font-black text-center text-blue-500 bg-transparent border-none focus:ring-0 mb-2 tabular-nums"
              />
              <p className="text-slate-600 font-bold uppercase text-[10px] tracking-[0.3em]">Milímetros (mm)</p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowManualLog(false)}
                className="flex-1 py-4 text-slate-500 font-bold text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={handleFixData}
                className="flex-2 bg-blue-600 text-white font-black py-4 px-10 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[85%] max-w-sm glass-dark rounded-full p-2.5 shadow-2xl flex items-center border border-white/5 glow-blue z-40">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex-1 flex flex-col items-center gap-1.5 py-4 rounded-full transition-all duration-300 ${activeTab === 'home' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-widest">Inicio</span>
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 flex flex-col items-center gap-1.5 py-4 rounded-full transition-all duration-300 ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-widest">Historial</span>
        </button>
      </nav>
    </div>
  );
};

export default App;