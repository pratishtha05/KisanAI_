"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CloudSun, CloudRain, Bot, Leaf, Wind, ArrowRight, Camera, Activity } from "lucide-react";
import api from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";

export default function Dashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [farm, setFarm] = useState<any>(null);
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const { t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      try {
        const [profRes, farmRes] = await Promise.all([
          api.get("/users/profile").catch(() => null),
          api.get("/farms/").catch(() => null)
        ]);
        
        let selectedFarm = null;
        if (profRes) setProfile(profRes.data);
        if (farmRes && farmRes.data.length > 0) {
          selectedFarm = farmRes.data[0];
          setFarm(selectedFarm);
        }

        // Always fetch weather, use defaults if missing
        const lat = selectedFarm?.latitude ?? 28.6139;
        const lon = selectedFarm?.longitude ?? 77.209;
        
        const weatherRes = await api.get("/weather/intelligence", {
          params: {
            latitude: lat,
            longitude: lon,
            crop: selectedFarm?.crop || "Wheat",
            crop_stage: selectedFarm?.stage || "Vegetative",
          },
        }).catch(() => null);

        if (weatherRes) setWeather(weatherRes.data);
        setWeatherLoading(false);

      } catch (e) {
        console.error("Dashboard loading error:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-4"></div>
        <div className="text-gray-500 font-medium">Loading your dashboard...</div>
      </div>
    );
  }

  const today = weather?.daily_forecast?.[0];
  const tomorrow = weather?.daily_forecast?.[1];
  const tomorrowRainProb = tomorrow?.precipitation_probability_max_pct ?? 0;
  const tomorrowRainfall = tomorrow?.precipitation_mm ?? 0;
  const tomorrowWindGust = tomorrow?.wind_gust_max_kmh ?? 0;
  
  const hasTomorrowRain = tomorrowRainProb >= 40 || tomorrowRainfall >= 1;
  const strongWind = tomorrowWindGust >= 30;

  let weatherTitle = "Clear Weather Expected";
  let weatherMessage = "Good conditions for farming activities today and tomorrow.";
  let WeatherIcon = CloudSun;
  let weatherBg = "from-sky-400 to-sky-500";

  if (hasTomorrowRain) {
    weatherTitle = "Rain expected tomorrow";
    weatherMessage = `Rain probability is ${tomorrowRainProb}% (${tomorrowRainfall} mm). Consider delaying irrigation.`;
    WeatherIcon = CloudRain;
    weatherBg = "from-blue-500 to-indigo-600";
  } else if (strongWind) {
    weatherTitle = "Strong winds tomorrow";
    weatherMessage = `Wind gusts up to ${tomorrowWindGust} km/h. Avoid spraying chemicals.`;
    WeatherIcon = Wind;
    weatherBg = "from-amber-400 to-orange-500";
  }

  return (
    <div className="max-w-6xl mx-auto p-3 md:p-6 space-y-4 md:space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          {profile ? `${t("dash.welcome", "Welcome back")}, ${profile.name} 👋` : `${t("dash.welcome", "Welcome back")} 👋`}
        </h1>
        <p className="text-gray-500 font-medium mt-1">Here are your immediate insights and quick actions.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
        
        {/* Main Column (Weather & Advisor) */}
        <div className="flex-1 flex flex-col gap-4 md:gap-6">
          
          {/* Weather Widget (Full Width of Column) */}
          {weatherLoading ? (
            <Card className="bg-gray-50 border border-gray-200 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center text-center h-48">
               <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-400 rounded-full animate-spin mb-3"></div>
               <h3 className="text-lg font-bold text-gray-700 mb-1">Loading Weather...</h3>
            </Card>
          ) : weather && today ? (
            <Card className={`bg-linear-to-br ${weatherBg} text-white border-none shadow-md rounded-3xl overflow-hidden`}>
              <div className="flex flex-col sm:flex-row h-full">
                <div className="p-6 md:p-8 flex flex-col justify-between border-b sm:border-b-0 sm:border-r border-white/20 sm:w-1/3">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-bold uppercase tracking-wider text-xs text-white/80">Today's Local Weather</span>
                    <WeatherIcon size={20} className="text-white" />
                  </div>
                  <div>
                    <div className="text-5xl font-extrabold mb-1">{Math.round(today.temperature_max_c)}°<span className="text-3xl text-white/70 font-bold"> / {Math.round(today.temperature_min_c)}°</span></div>
                    <div className="text-sm font-medium text-white/90">Wind: {Math.round(today.wind_speed_max_kmh)} km/h</div>
                  </div>
                </div>
                <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
                  <h3 className="font-bold text-2xl mb-2">
                    {weatherTitle}
                  </h3>
                  <p className="text-white/90 text-sm leading-relaxed mb-6 max-w-sm font-medium">
                    {weatherMessage}
                  </p>
                  <div>
                    <Link href="/app/weather">
                      <Button variant="secondary" size="sm" className="bg-white text-gray-900 hover:bg-gray-100 rounded-xl font-bold border-none shadow-sm">
                        View 7-Day Forecast <ArrowRight size={14} className="ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="bg-gray-50 border border-red-100 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center text-center h-48">
               <CloudSun size={32} className="text-red-300 mb-3" />
               <h3 className="text-lg font-bold text-red-700 mb-1">Weather Unavailable</h3>
               <p className="text-red-500 font-medium text-sm">Could not connect to weather service.</p>
            </Card>
          )}

          {/* Farm Advisor Widget */}
          <Card className="bg-white border border-gray-200 shadow-sm rounded-3xl p-6 md:p-8 flex flex-col hover:shadow-md transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <Bot size={120} />
            </div>
            <div className="flex items-center gap-4 mb-4 z-10">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 shrink-0">
                <Activity size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Farm Advisor AI</h3>
                <p className="text-gray-500 text-sm font-medium">Ask questions about crop management, fertilizers, or pests.</p>
              </div>
            </div>
            <div className="relative z-10 mt-2">
              <input 
                type="text" 
                placeholder="E.g. What fertilizer should I use for wheat?" 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 pr-12 font-medium transition-all shadow-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    router.push(`/app/farm-advisor?q=${encodeURIComponent(e.currentTarget.value)}`);
                  }
                }}
              />
              <button 
                onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                  if (input.value.trim()) {
                    router.push(`/app/farm-advisor?q=${encodeURIComponent(input.value)}`);
                  }
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg flex items-center justify-center transition-colors"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </Card>
          
        </div>

        {/* Side Column (Disease Detection) */}
        <div className="lg:w-1/3 flex flex-col gap-4 md:gap-6">
          <Card className="bg-white border border-gray-200 shadow-sm rounded-3xl p-6 md:p-8 flex flex-col h-full hover:shadow-md transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <Leaf size={120} />
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 mb-6 z-10">
              <Camera size={24} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3 z-10">Crop Health Scanner</h3>
            <p className="text-gray-500 text-sm font-medium mb-8 flex-1 z-10 leading-relaxed">
              Detect diseases instantly by snapping a picture of an affected leaf. Get immediate, actionable treatment advice directly from KisanAI.
            </p>
            <Link href="/app/disease-detection" className="z-10 mt-auto">
              <Button className="w-full bg-green-600 hover:bg-green-700 rounded-xl font-bold shadow-sm py-6 text-base">Scan Leaf Now</Button>
            </Link>
          </Card>
        </div>

      </div>
    </div>
  );
}