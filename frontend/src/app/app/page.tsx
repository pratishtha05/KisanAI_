"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  CloudSun,
  Bot,
  Leaf,
  Droplets,
  Wind,
  CloudRain,
} from "lucide-react";
import api from "@/lib/api";

export default function Dashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [farm, setFarm] = useState<any>(null);
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [profRes, farmRes] = await Promise.all([
          api.get("/users/profile").catch(() => null),
          api.get("/farms/").catch(() => null),
        ]);

        if (profRes) {
          setProfile(profRes.data);
        }

        if (farmRes && farmRes.data.length > 0) {
          const selectedFarm = farmRes.data[0];
          setFarm(selectedFarm);

          // Fetch real weather data only if farm has saved coordinates
          if (
            selectedFarm.latitude != null &&
            selectedFarm.longitude != null
          ) {
            const weatherRes = await api.get(
              "/weather/intelligence",
              {
                params: {
                  latitude: selectedFarm.latitude,
                  longitude: selectedFarm.longitude,
                  crop: selectedFarm.crop,
                  crop_stage: selectedFarm.stage,
                },
              }
            );

            setWeather(weatherRes.data);
          }
        }
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
      <div className="p-6 text-center text-gray-500 mt-20">
        Loading your farm...
      </div>
    );
  }

  /*
   * Weather summary for the main dashboard card.
   *
   * We use the same weather intelligence endpoint as the
   * dedicated Weather page, so this is real backend data.
   */
  const today = weather?.daily_forecast?.[0];
  const tomorrow = weather?.daily_forecast?.[1];

  const tomorrowRainProbability =
    tomorrow?.precipitation_probability_max_pct ?? 0;

  const tomorrowRainfall =
    tomorrow?.precipitation_mm ?? 0;

  const tomorrowWind =
    tomorrow?.wind_speed_max_kmh ?? 0;

  const tomorrowWindGust =
    tomorrow?.wind_gust_max_kmh ?? 0;

  const hasTomorrowRain =
    tomorrowRainProbability >= 40 || tomorrowRainfall >= 1;

  const strongWind =
    tomorrowWindGust >= 30;

  let weatherTitle = "Weather outlook";

  let weatherMessage =
    "Check the latest weather intelligence for your farm.";

  let weatherIcon = <CloudSun size={32} className="text-white" />;

  if (hasTomorrowRain) {
    weatherTitle = "🌧 Rain expected tomorrow";

    weatherMessage =
      `Rain probability is ${tomorrowRainProbability}% with about ` +
      `${tomorrowRainfall} mm expected. Consider delaying irrigation ` +
      `if the crop's water requirement is already satisfied.`;

    weatherIcon = (
      <CloudRain size={32} className="text-white" />
    );
  } else if (strongWind) {
    weatherTitle = "💨 Strong winds tomorrow";

    weatherMessage =
      `Wind gusts may reach about ${tomorrowWindGust} km/h. ` +
      `Avoid unnecessary spraying and secure lightweight materials.`;

    weatherIcon = (
      <Wind size={32} className="text-white" />
    );
  } else if (tomorrow) {
    weatherTitle = "☀️ Stable weather tomorrow";

    weatherMessage =
      `Rain probability is ${tomorrowRainProbability}% with ` +
      `${tomorrowRainfall} mm expected rainfall. Weather conditions ` +
      `appear relatively stable for your farm.`;

    weatherIcon = (
      <CloudSun size={32} className="text-white" />
    );
  }

  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {profile
            ? `ਸਤ ਸ੍ਰੀ ਅਕਾਲ, ${profile.name} 👋`
            : "Welcome back 👋"}
        </h1>

        <p className="text-gray-600">
          Here's what you should know about your farm today.
        </p>

        {profile && farm && (
          <div className="flex items-center gap-2 mt-4 text-sm font-medium text-gray-700 bg-green-50 px-4 py-2 rounded-full inline-flex">
            <span>
              📍 {profile.district}, {profile.state}
            </span>

            <span>•</span>

            <span>
              🌾 {farm.crop} ({farm.land_size} acres)
            </span>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2">
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 md:p-8 h-full border-none shadow-lg rounded-3xl flex flex-col justify-center">
            <div className="flex items-start gap-5">
              <div className="p-4 bg-white/20 rounded-2xl shrink-0">
                {weatherIcon}
              </div>

              <div>
                <h3 className="font-bold text-2xl mb-2">
                  {weatherTitle}
                </h3>

                <p className="text-green-50 text-base mb-6 leading-relaxed max-w-lg">
                  {weatherMessage}
                </p>

                <Link href="/app/weather">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="bg-white text-green-700 hover:bg-green-50 rounded-xl font-bold shadow-sm"
                  >
                    View Forecast
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="p-6 md:p-8 h-full bg-white border border-gray-100 shadow-sm rounded-3xl flex flex-col justify-center">
            <h3 className="text-gray-400 font-bold mb-2 uppercase tracking-wider text-xs">
              Farm Overview
            </h3>

            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              {farm ? farm.crop : "No Crop"}
            </h2>

            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                <span className="text-gray-500 font-medium">
                  Stage
                </span>

                <span className="font-bold text-gray-900 capitalize">
                  {farm?.stage || "-"}
                </span>
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="text-gray-500 font-medium">
                  Area
                </span>

                <span className="font-bold text-gray-900">
                  {farm?.land_size || "-"} acres
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-6 text-gray-900">
        Quick Actions
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/app/weather"
          className="block h-full"
        >
          <Card className="p-8 h-full flex flex-col items-center justify-center gap-4 hover:border-green-500 hover:shadow-md transition-all rounded-3xl border border-gray-100">
            <div className="p-5 bg-blue-50 text-blue-600 rounded-2xl">
              <CloudSun size={36} />
            </div>

            <div className="font-bold text-xl text-gray-900 text-center">
              Check Weather
            </div>

            <p className="text-sm text-gray-500 text-center font-medium">
              7-day local forecast
            </p>
          </Card>
        </Link>

        <Link
          href="/app/farm-advisor"
          className="block h-full"
        >
          <Card className="p-8 h-full flex flex-col items-center justify-center gap-4 hover:border-green-500 hover:shadow-md transition-all rounded-3xl border border-gray-100">
            <div className="p-5 bg-purple-50 text-purple-600 rounded-2xl">
              <Bot size={36} />
            </div>

            <div className="font-bold text-xl text-gray-900 text-center">
              Ask KisanAI
            </div>

            <p className="text-sm text-gray-500 text-center font-medium">
              Personalized farm advice
            </p>
          </Card>
        </Link>

        <Link
          href="/app/disease-detection"
          className="block h-full"
        >
          <Card className="p-8 h-full flex flex-col items-center justify-center gap-4 hover:border-green-500 hover:shadow-md transition-all rounded-3xl border border-gray-100">
            <div className="p-5 bg-green-50 text-green-600 rounded-2xl">
              <Leaf size={36} />
            </div>

            <div className="font-bold text-xl text-gray-900 text-center">
              Crop Health
            </div>

            <p className="text-sm text-gray-500 text-center font-medium">
              Scan leaves for disease
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
}