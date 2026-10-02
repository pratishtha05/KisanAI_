"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { CloudSun, Wind, Droplets } from "lucide-react";
import api from "@/lib/api";

export default function WeatherPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/weather/current").then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-center text-gray-500 mt-20">Checking today's weather...</div>;
  if (!data) return <div className="p-6 text-center text-red-500">Failed to load weather.</div>;

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-6">🌤 Weather</h1>
      
      <Card className="p-6 bg-gradient-to-b from-blue-50 to-white mb-8 border-blue-100">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="text-5xl font-light mb-2">{data.current_temp}°C</div>
            <div className="text-xl text-gray-600">{data.current_condition}</div>
          </div>
          <CloudSun size={64} className="text-blue-400" />
        </div>
        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <div className="flex items-center gap-2 text-gray-600">
            <Droplets size={20} className="text-blue-500"/> Humidity: {data.humidity}%
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Wind size={20} className="text-gray-400"/> Wind: {data.wind_speed} km/h
          </div>
        </div>
      </Card>

      <h2 className="text-lg font-bold mb-4">Farm Advisories</h2>
      <div className="space-y-4 mb-8">
        {data.advisories.map((adv: any, i: number) => (
          <Card key={i} className="p-4 bg-amber-50 border-amber-200">
            <h3 className="font-bold text-amber-900 mb-1">{adv.title}</h3>
            <p className="text-amber-800 text-sm">{adv.recommendation}</p>
          </Card>
        ))}
      </div>

      <h2 className="text-lg font-bold mb-4">Forecast</h2>
      <div className="grid grid-cols-3 gap-4">
        {data.forecast.map((f: any, i: number) => (
          <Card key={i} className="p-4 text-center">
            <div className="text-sm font-medium text-gray-500 mb-2">{f.day}</div>
            <div className="text-2xl mb-2">{f.icon}</div>
            <div className="font-bold mb-1">{f.temp_max}° / {f.temp_min}°</div>
            <div className="text-xs text-blue-600">{f.rain_probability}% rain</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
