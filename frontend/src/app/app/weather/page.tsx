"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import {
  CloudSun,
  Cloud,
  CloudDrizzle,
  CloudLightning,
  Sun,
  Wind,
  Droplets,
  Sprout,
  MapPin,
  AlertTriangle,
  ShieldAlert,
  Info,
  SprayCan,
  Thermometer,
  CloudRain,
  Gauge,
  CalendarDays,
} from "lucide-react";
import api from "@/lib/api";

export default function WeatherPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [farm, setFarm] = useState<any>(null);
  const [noFarm, setNoFarm] = useState(false);

  useEffect(() => {
  const fetchWeather = async () => {
    try {
      // First get the farmer's farms
      const farmRes = await api.get("/farms/");

      const farms = farmRes.data;

      if (!farms || farms.length === 0) {
        setNoFarm(true);
        return;
      }

      // For now, use the first farm.
      // Later we can let the farmer select an active farm.
      const selectedFarm = farms[0];

      setFarm(selectedFarm);

      // Then fetch weather using that farm's crop and stage.
      // Location remains temporary for now.
      const weatherRes = await api.get("/weather/intelligence", {
        params: {
          latitude: 30.7333,
          longitude: 76.7794,
          crop: selectedFarm.crop,
          crop_stage: selectedFarm.stage,
        },
      });

      setData(weatherRes.data);
    } catch (err) {
      console.error("Weather intelligence error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  fetchWeather();
}, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="text-center">
          <CloudSun className="mx-auto mb-3 text-green-600" size={36} />
          <p className="text-sm text-gray-500">
            Loading weather intelligence...
          </p>
        </div>
      </div>
    );
  }
  if (noFarm) {
  return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <Card className="max-w-md p-6 text-center">
          <Sprout className="mx-auto mb-3 text-green-600" size={32} />

          <h2 className="font-semibold text-gray-900">
            No farm information found
          </h2>

          <p className="text-sm text-gray-500 mt-2">
            Please add your crop and farm details before viewing
            weather intelligence.
          </p>
        </Card>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <Card className="max-w-md p-6 text-center border-red-100">
          <AlertTriangle className="mx-auto mb-3 text-red-500" size={32} />
          <h2 className="font-semibold text-gray-900">
            Unable to load weather intelligence
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            Please try again after checking your connection.
          </p>
        </Card>
      </div>
    );
  }

  const today = data.daily_forecast?.[0];

  const severityStyles: Record<
    string,
    { card: string; icon: string; badge: string }
  > = {
    warning: {
      card: "bg-red-50/70 border-red-200",
      icon: "text-red-600",
      badge: "bg-red-100 text-red-700",
    },
    alert: {
      card: "bg-orange-50/70 border-orange-200",
      icon: "text-orange-600",
      badge: "bg-orange-100 text-orange-700",
    },
    watch: {
      card: "bg-amber-50/70 border-amber-200",
      icon: "text-amber-600",
      badge: "bg-amber-100 text-amber-700",
    },
  };

  const severityIcons: Record<string, any> = {
    warning: ShieldAlert,
    alert: AlertTriangle,
    watch: Info,
  };

  const severityLabels: Record<string, string> = {
    warning: "Warning",
    alert: "Alert",
    watch: "Watch",
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";

    const [year, month, day] = dateString.slice(0, 10).split("-").map(Number);

    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(year, month - 1, day));
  };

  const formatShortDate = (dateString: string) => {
    if (!dateString) return "";

    const [year, month, day] = dateString.slice(0, 10).split("-").map(Number);

    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(year, month - 1, day));
  };

  const formatTime = (dateTime: string) => {
    if (!dateTime) return "";

    const timePart = dateTime.split("T")[1];

    if (!timePart) return "";

    const [hourString, minuteString] = timePart.split(":");
    const hour = Number(hourString);
    const minute = Number(minuteString);

    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;

    return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
  };

  const getWeatherEmoji = (weatherCode: number | null) => {
    if (weatherCode === null || weatherCode === undefined) {
      return "🌤️";
    }
  
    // Clear sky
    if (weatherCode === 0) {
      return "☀️";
    }
  
    // Mainly clear / partly cloudy
    if ([1, 2].includes(weatherCode)) {
      return "🌤️";
    }
  
    // Overcast
    if (weatherCode === 3) {
      return "☁️";
    }
  
    // Fog
    if ([45, 48].includes(weatherCode)) {
      return "🌫️";
    }
  
    // Drizzle
    if ([51, 53, 55, 56, 57].includes(weatherCode)) {
      return "🌦️";
    }
  
    // Rain
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) {
      return "🌧️";
    }
  
    // Snow
    if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
      return "❄️";
    }
  
    // Thunderstorm
    if ([95, 96, 99].includes(weatherCode)) {
      return "⛈️";
    }
  
    return "🌤️";
  };

  

  const getEvidenceLabel = (level: string) => {
    const labels: Record<string, string> = {
      direct: "Direct guidance",
      derived: "Forecast-derived",
      prototype: "Prototype rule",
    };

    return labels[level] || level;
  };

  return (
    <div className="min-h-full bg-gradient-to-b from-green-50/60 via-white to-white">
      <div className="max-w-7xl mx-auto px-4 py-6 md:px-8 md:py-8">

        {/* Header */}
        <div className="mb-7">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-xl bg-green-100 text-green-700">
                  <CloudSun size={21} />
                </div>

                <span className="text-sm font-medium text-green-700">
                  Weather-based farm guidance
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Weather Intelligence
              </h1>

              <p className="text-sm md:text-base text-gray-500 mt-1.5">
                Understand the forecast and what it means for your crop.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-gray-200 text-gray-600">
                <MapPin size={15} className="text-green-600" />
                {data.latitude?.toFixed(4)}, {data.longitude?.toFixed(4)}
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-green-50 border border-green-100 text-green-700 font-medium">
                <Sprout size={15} />
                {farm?.crop || "Crop not specified"}
                
              </span>

              {farm?.stage && (
                <span className="inline-flex items-center px-3 py-2 rounded-full bg-white border border-gray-200 text-gray-600 capitalize">
                  {farm.stage} stage
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Today's Conditions */}
        {today && (
          <Card className="mb-8 overflow-hidden border-green-100 bg-white">
            <div className="h-1 bg-green-600" />

            <div className="p-5 md:p-6">
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-7">

                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                    <CalendarDays size={16} className="text-green-600" />
                    <span>Today · {formatDate(today.date)}</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 p-3 rounded-2xl bg-green-50 text-green-600">
                      <CloudSun size={42} />
                    </div>

                    <div>
                      <div className="text-3xl md:text-4xl font-semibold text-gray-900 tracking-tight">
                        {today.temperature_max_c}° /{" "}
                        {today.temperature_min_c}°C
                      </div>

                      <p className="text-sm text-gray-500 mt-1">
                        Maximum / minimum temperature
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5.5 gap-x-4 gap-y-5">
                  <WeatherMetric
                    icon={<CloudRain size={19} />}
                    label="Rain probability"
                    value={`${today.precipitation_probability_max_pct}%`}
                  />

                  <WeatherMetric
                    icon={<Droplets size={19} />}
                    label="Rainfall"
                    value={`${today.precipitation_mm} mm`}
                  />

                  <WeatherMetric
                    icon={<Wind size={19} />}
                    label="Wind"
                    value={`${today.wind_speed_max_kmh} km/h`}
                  />

                  <WeatherMetric
                    icon={<Wind size={19} />}
                    label="Wind gusts"
                    value={`${today.wind_gust_max_kmh} km/h`}
                  />

                  <WeatherMetric
                    icon={<Gauge size={19} />}
                    label="Evapotranspiration"
                    value={`${today.et0_mm} mm`}
                  />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500">
                <span>
                  Rain likelihood:{" "}
                  <strong className="text-gray-700">
                    {today.rain_probability_label}
                  </strong>
                </span>

                <span className="hidden sm:inline text-gray-300">•</span>

                <span>
                  Rainfall intensity:{" "}
                  <strong className="text-gray-700">
                    {today.rainfall_intensity}
                  </strong>
                </span>

                <span className="hidden sm:inline text-gray-300">•</span>

                <span>
                  ET₀ = reference evapotranspiration
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Farm Advisories */}
        <section className="mb-9">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Farm Advisories
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Actions based on the forecast and your selected crop.
              </p>
            </div>

            <span className="text-sm text-gray-500">
              {data.advisories?.length || 0} advisories
            </span>
          </div>

          {data.advisories?.length > 0 ? (
            <div className="space-y-4">
              {data.advisories.map((adv: any, i: number) => {
                const Icon = severityIcons[adv.severity] || Info;
                const styles =
                  severityStyles[adv.severity] || {
                    card: "bg-gray-50 border-gray-200",
                    icon: "text-gray-600",
                    badge: "bg-gray-100 text-gray-700",
                  };

                return (
                  <Card
                    key={i}
                    className={`p-5 border ${styles.card}`}
                  >
                    <div className="flex gap-4">

                      <div
                        className={`flex-shrink-0 mt-0.5 ${styles.icon}`}
                      >
                        <Icon size={22} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-bold text-gray-900">
                            {adv.title}
                          </h3>

                          <span
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${styles.badge}`}
                          >
                            {severityLabels[adv.severity] ||
                              adv.severity}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                          <span className="font-medium text-gray-600">
                            {formatDate(adv.date)}
                          </span>

                          {adv.crop && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="capitalize">
                                Crop: {adv.crop}
                              </span>
                            </>
                          )}
                        </div>

                        <p className="text-sm leading-6 text-gray-700">
                          {adv.message}
                        </p>

                        {/* Forecast evidence
                        <div className="mt-4 rounded-xl bg-white/70 border border-black/5 px-4 py-3">
                          <p className="text-xs font-semibold text-gray-600 mb-1">
                            What the forecast shows
                          </p>

                          <p className="text-sm leading-5 text-gray-700">
                            {adv.message}
                          </p>
                        </div> */}

                        {/* Action */}
                        <div className="mt-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                            Recommended action
                          </p>

                          <p className="text-sm font-medium leading-5 text-gray-800">
                            {adv.recommended_action}
                          </p>
                        </div>

                        {/* Source / evidence */}
                        <div className="mt-4 pt-3 border-t border-black/5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 text-xs text-gray-500">
                          <span>
                            <strong className="text-gray-600">
                              Source:
                            </strong>{" "}
                            {adv.source}
                          </span>

                          {adv.evidence_level && (
                            <span className="whitespace-nowrap">
                              <strong className="text-gray-600">
                                Basis:
                              </strong>{" "}
                              {getEvidenceLabel(adv.evidence_level)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-6 text-center">
              <Info className="mx-auto mb-2 text-green-600" size={24} />
              <p className="text-sm text-gray-500">
                No weather-based advisories for the current forecast.
              </p>
            </Card>
          )}
        </section>

        {/* Spray Windows */}
        <section className="mb-9">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Recommended Spray Windows
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Forecast periods with suitable weather conditions for spraying.
            </p>
          </div>

          {data.spray_windows?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.spray_windows.map((window: any, i: number) => (
                <Card
                  key={i}
                  className="p-5 border-green-100 bg-green-50/40 hover:bg-green-50/70 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-green-100 text-green-700">
                        <SprayCan size={18} />
                      </div>

                      <span className="font-semibold text-gray-900">
                        {window.score === "good"
                          ? "Good window"
                          : "Acceptable window"}
                      </span>
                    </div>

                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        window.score === "good"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {window.score}
                    </span>
                  </div>

                  <div className="text-sm font-medium text-gray-700">
                    {formatShortDate(window.start)}
                  </div>

                  <div className="text-xl font-semibold text-gray-900 mt-1">
                    {formatTime(window.start)}
                    {" – "}
                    {formatTime(window.end)}
                  </div>

                  <p className="text-sm leading-5 text-gray-600 mt-3">
                    {window.reason}
                  </p>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center">
              <SprayCan className="mx-auto mb-2 text-gray-400" size={24} />
              <p className="text-sm text-gray-500">
                No suitable spray windows found in the forecast period.
              </p>
            </Card>
          )}
        </section>

        {/* 7-Day Forecast */}
        <section className="mb-9">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              7-Day Forecast
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Daily weather conditions for the next 7 days.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.daily_forecast?.map((f: any, i: number) => (
              <Card
                key={i}
                className={`p-5 ${
                  i === 0
                    ? "border-green-200 ring-1 ring-green-100"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="text-sm font-semibold text-gray-700">
                    {formatDate(f.date)}
                  </div>

                  {i === 0 && (
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-50 text-green-700">
                      Today
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="text-4xl leading-none">
                    {getWeatherEmoji(f.weather_code)}
                  </div>

                  <div>
                    <div className="text-lg font-bold text-gray-900">
                      {f.temperature_max_c}° / {f.temperature_min_c}°C
                    </div>

                    <div className="text-xs text-gray-500 mt-0.5">
                      {f.rain_probability_label}
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 text-sm">
                  <ForecastMetric
                    label="Rain probability"
                    value={`${f.precipitation_probability_max_pct}%`}
                  />

                  <ForecastMetric
                    label="Rainfall"
                    value={`${f.precipitation_mm} mm`}
                  />

                  <ForecastMetric
                    label="Wind"
                    value={`${f.wind_speed_max_kmh} km/h`}
                  />

                  <ForecastMetric
                    label="Wind gusts"
                    value={`${f.wind_gust_max_kmh} km/h`}
                  />

                  <ForecastMetric
                    label="Evapotranspiration (ET₀)"
                    value={`${f.et0_mm} mm`}
                  />
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 text-xs leading-5 text-gray-500">
                  <div>
                    Rain likelihood:{" "}
                    <span className="font-medium text-gray-700">
                      {f.rain_probability_label}
                    </span>
                  </div>

                  <div>
                    Rainfall intensity:{" "}
                    <span className="font-medium text-gray-700">
                      {f.rainfall_intensity}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Disclaimer */}
        <Card className="p-5 bg-gray-50/80 border-gray-200">
          <div className="flex gap-3">
            <Info
              size={18}
              className="text-gray-500 flex-shrink-0 mt-0.5"
            />

            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">
                Advisory note
              </p>

              <p className="text-xs text-gray-500 leading-relaxed">
                {data.disclaimer}
              </p>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}

function WeatherMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5 min-w-[120px]">
      <div className="text-green-600 mt-0.5">{icon}</div>

      <div>
        <div className="text-xs text-gray-500 leading-4">
          {label}
        </div>

        <div className="font-semibold text-gray-900 mt-0.5">
          {value}
        </div>
      </div>
    </div>
  );
}

function ForecastMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-500">{label}</span>

      <span className="font-medium text-gray-800 text-right">
        {value}
      </span>
    </div>
  );
}