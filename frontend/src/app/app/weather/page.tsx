"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { useLanguage } from "@/lib/LanguageContext";
import {
  CloudSun,
  Wind,
  Droplets,
  Sprout,
  MapPin,
  AlertTriangle,
  ShieldAlert,
  Info,
  SprayCan,
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

  const { language, t } = useLanguage();

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const farmRes = await api.get("/farms/");
        const farms = farmRes.data;

        if (!farms || farms.length === 0) {
          setNoFarm(true);
          return;
        }

        const selectedFarm = farms[0];
        setFarm(selectedFarm);

        if (
          selectedFarm.latitude == null ||
          selectedFarm.longitude == null
        ) {
          setError(true);
          return;
        }

        const weatherRes = await api.get("/weather/intelligence", {
          params: {
            latitude: selectedFarm.latitude,
            longitude: selectedFarm.longitude,
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
          <CloudSun
            className="mx-auto mb-3 text-green-600"
            size={36}
          />
          <p className="text-sm text-gray-500">
            {t("weather.loading")}
          </p>
        </div>
      </div>
    );
  }

  if (noFarm) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <Card className="max-w-md p-6 text-center">
          <Sprout
            className="mx-auto mb-3 text-green-600"
            size={32}
          />

          <h2 className="font-semibold text-gray-900">
            {t("weather.noFarm")}
          </h2>

          <p className="text-sm text-gray-500 mt-2">
            {t("weather.addFarm")}
          </p>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <Card className="max-w-md p-6 text-center border-red-100">
          <AlertTriangle
            className="mx-auto mb-3 text-red-500"
            size={32}
          />

          <h2 className="font-semibold text-gray-900">
            {t("weather.unableToLoad")}
          </h2>

          <p className="text-sm text-gray-500 mt-2">
            {t("weather.tryAgain")}
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
      card: "bg-red-50 border-red-200",
      icon: "text-red-600",
      badge: "bg-red-100 text-red-800",
    },
    alert: {
      card: "bg-orange-50 border-orange-200",
      icon: "text-orange-600",
      badge: "bg-orange-100 text-orange-800",
    },
    watch: {
      card: "bg-amber-50 border-amber-200",
      icon: "text-amber-600",
      badge: "bg-amber-100 text-amber-800",
    },
  };

  const severityIcons: Record<string, any> = {
    warning: ShieldAlert,
    alert: AlertTriangle,
    watch: Info,
  };

  const severityLabels: Record<string, string> = {
    warning: t("weather.warning"),
    alert: t("weather.alert"),
    watch: t("weather.watch"),
  };

  const locale =
    language === "hi"
      ? "hi-IN"
      : language === "pa"
      ? "pa-IN"
      : "en-IN";

  const formatDate = (dateString: string) => {
    if (!dateString) return "";

    const [year, month, day] = dateString
      .slice(0, 10)
      .split("-")
      .map(Number);

    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(year, month - 1, day));
  };

  const formatDay = (dateString: string) => {
    if (!dateString) return "";

    const [year, month, day] = dateString
      .slice(0, 10)
      .split("-")
      .map(Number);

    return new Intl.DateTimeFormat(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
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

    return `${displayHour}:${String(minute).padStart(
      2,
      "0"
    )} ${suffix}`;
  };

  const getWeatherEmoji = (weatherCode: number | null) => {
    if (weatherCode === null || weatherCode === undefined) {
      return "🌤️";
    }

    if (weatherCode === 0) return "☀️";

    if ([1, 2].includes(weatherCode)) return "🌤️";

    if (weatherCode === 3) return "☁️";

    if ([45, 48].includes(weatherCode)) return "🌫️";

    if ([51, 53, 55, 56, 57].includes(weatherCode)) {
      return "🌦️";
    }

    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) {
      return "🌧️";
    }

    if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
      return "❄️";
    }

    if ([95, 96, 99].includes(weatherCode)) {
      return "⛈️";
    }

    return "🌤️";
  };

  const round = (n: number | null | undefined) =>
    n === null || n === undefined ? "–" : Math.round(n);

  const rainWords = (intensity: string | null | undefined) => {
    if (!intensity) return "";

    const text = intensity.toLowerCase();

    if (text.includes("no rain")) return "No rain";

    const cap = text.charAt(0).toUpperCase() + text.slice(1);

    return text.includes("rain") ? cap : `${cap} rain`;
  };

  const advisories: any[] = data.advisories || [];
  const sprayWindows: any[] = data.spray_windows || [];
  const forecastDays: any[] = data.daily_forecast || [];

  const lastForecastDate =
    forecastDays[forecastDays.length - 1]?.date;

  const lastWindowDate = sprayWindows.length
    ? sprayWindows[sprayWindows.length - 1].end?.slice(0, 10)
    : null;

  const noSprayAfter =
    sprayWindows.length > 0 &&
    lastWindowDate &&
    lastForecastDate &&
    lastWindowDate < lastForecastDate.slice(0, 10)
      ? lastWindowDate
      : null;

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
                  {t("weather.guidance")}
                </span>
              </div>

              <h1>{t("weather.title")}</h1>

              <p className="text-sm md:text-base text-gray-500 mt-1.5">
                {t("weather.subtitle")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-gray-200 text-gray-600">
                <MapPin size={15} className="text-green-600" />
                {data.latitude?.toFixed(4)},{" "}
                {data.longitude?.toFixed(4)}
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-green-50 border border-green-100 text-green-700 font-medium">
                <Sprout size={15} />
                {farm?.crop || t("weather.cropNotSpecified")}
              </span>

              {farm?.stage && (
                <span className="inline-flex items-center px-3 py-2 rounded-full bg-white border border-gray-200 text-gray-600 capitalize">
                  {farm.stage} {t("weather.stage")}
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
                    <CalendarDays className="text-green-600" size={16} />
                    <span>
                      {t("weather.today")} · {formatDate(today.date)}
                    </span>
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
                        {t("weather.temperature")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5.5 gap-x-4 gap-y-5">
                  <WeatherMetric
                    icon={<CloudRain size={19} />}
                    label={t("weather.rainProbability")}
                    value={`${today.precipitation_probability_max_pct}%`}
                  />

                  <WeatherMetric
                    icon={<Droplets size={19} />}
                    label={t("weather.rainfall")}
                    value={`${today.precipitation_mm} mm`}
                  />

                  <WeatherMetric
                    icon={<Wind size={19} />}
                    label={t("weather.wind")}
                    value={`${today.wind_speed_max_kmh} km/h`}
                  />

                  <WeatherMetric
                    icon={<Wind size={19} />}
                    label={t("weather.windGusts")}
                    value={`${today.wind_gust_max_kmh} km/h`}
                  />

                  <WeatherMetric
                    icon={<Gauge size={19} />}
                    label={t("weather.evapotranspiration")}
                    value={`${today.et0_mm} mm`}
                  />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500">
                <span>
                  {t("weather.rainLikelihood")}:{" "}
                  <strong className="text-gray-700">
                    {today.rain_probability_label}
                  </strong>
                </span>

                <span className="hidden sm:inline text-gray-300">
                  •
                </span>

                <span>
                  {t("weather.rainfallIntensity")}:{" "}
                  <strong className="text-gray-700">
                    {today.rainfall_intensity}
                  </strong>
                </span>

                <span className="hidden sm:inline text-gray-300">
                  •
                </span>

                <span>{t("weather.etReference")}</span>
              </div>
            </div>
          </Card>
        )}

        {/* This week at a glance */}
        <div
          className={`mb-8 rounded-2xl border-2 px-4 py-4 md:px-5 ${
            advisories.length > 0
              ? "border-orange-200 bg-orange-50"
              : "border-green-200 bg-green-50"
          }`}
        >
          <p
            className={`text-sm font-semibold ${
              advisories.length > 0
                ? "text-orange-800"
                : "text-green-800"
            }`}
          >
            {t("weather.thisWeek")}
          </p>

          {advisories.length > 0 ? (
            <ul className="mt-1.5 space-y-1 text-base md:text-lg font-semibold text-gray-900">
              {advisories.map((adv: any, i: number) => (
                <li key={i}>
                  {adv.title} · {formatDay(adv.date)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-base md:text-lg font-semibold text-gray-900">
              {t("weather.noWeatherAlerts")}
            </p>
          )}
        </div>

        {/* Farm Advisories */}
        {advisories.length > 0 && (
          <section className="mb-9">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {t("weather.whatToDo")}
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {advisories.map((adv: any, i: number) => {
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
                    className={`p-5 border-2 ${styles.card}`}
                  >
                    <div className="flex gap-4">
                      <div
                        className={`flex-shrink-0 mt-0.5 ${styles.icon}`}
                      >
                        <Icon size={28} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-gray-900">
                            {adv.title}
                          </h3>

                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full ${styles.badge}`}
                          >
                            {severityLabels[adv.severity] ||
                              adv.severity}
                          </span>
                        </div>

                        <p className="mt-1 text-sm font-semibold text-gray-600">
                          {formatDay(adv.date)}
                        </p>

                        <div className="mt-4 rounded-xl bg-white border border-black/5 px-4 py-3.5">
                          <p className="text-sm font-semibold text-gray-500 mb-1">
                            {t("weather.recommendedAction")}
                          </p>

                          <p className="text-base md:text-lg font-semibold leading-7 text-gray-900">
                            {adv.recommended_action}
                          </p>
                        </div>

                        <p className="mt-3 text-sm leading-6 text-gray-600">
                          <span className="font-semibold text-gray-700">
                            {t("weather.forecast")}:{" "}
                          </span>
                          {adv.message}
                        </p>

                        {adv.source && (
                          <details className="mt-3 text-xs text-gray-500">
                            <summary className="inline-flex min-h-[32px] cursor-pointer items-center font-medium text-gray-500 hover:text-gray-700">
                              {t("weather.source")}
                            </summary>

                            <p className="mt-1 leading-5">
                              {adv.source}
                            </p>
                          </details>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Spray Windows */}
        <section className="mb-9">
          <h2 className="text-xl font-bold text-gray-900">
            {t("weather.bestTimeToSpray")}
          </h2>

          <p className="text-base text-gray-600 mt-1 mb-4">
            {t("weather.sprayDescription")}
          </p>

          {sprayWindows.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sprayWindows.map((window: any, i: number) => (
                  <Card
                    key={i}
                    className="p-5 border-green-200 bg-green-50/50"
                  >
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-green-100 text-green-700">
                          <SprayCan size={20} />
                        </div>

                        <span className="text-base font-bold text-gray-900">
                          {formatDay(window.start)}
                        </span>
                      </div>

                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          window.score === "good"
                            ? "bg-green-200 text-green-900"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {window.score === "good"
                          ? t("weather.good")
                          : t("weather.okay")}
                      </span>
                    </div>

                    <div className="text-2xl font-bold text-gray-900">
                      {formatTime(window.start)}
                      {" – "}
                      {formatTime(window.end)}
                    </div>

                    <p className="text-sm leading-6 text-gray-600 mt-2">
                      {window.reason}
                    </p>
                  </Card>
                ))}
              </div>

              {noSprayAfter && (
                <p className="mt-4 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-base text-gray-700">
                  {t("weather.noGoodSprayingTime")}{" "}
                  {formatDay(noSprayAfter)}.
                </p>
              )}
            </>
          ) : (
            <Card className="p-6 text-center">
              <SprayCan
                className="mx-auto mb-2 text-gray-400"
                size={28}
              />

              <p className="text-base text-gray-600">
                {t("weather.noSuitableSprayWindows")}
              </p>
            </Card>
          )}
        </section>

        {/* 7-Day Forecast */}
        <section className="mb-9">
          <h2 className="text-xl font-bold text-gray-900">
            {t("weather.sevenDayForecast")}
          </h2>

          <p className="text-base text-gray-600 mt-1 mb-4">
            {t("weather.tapDay")}
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 items-start">
            {forecastDays.map((f: any, i: number) => {
              const strongWind =
                (f.wind_gust_max_kmh ?? 0) >= 30;

              return (
                <details
                  key={i}
                  className={`group rounded-2xl border bg-white ${
                    i === 0
                      ? "border-green-300 ring-1 ring-green-100"
                      : "border-gray-200"
                  }`}
                >
                  <summary className="flex min-h-[64px] cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                    <div className="w-[76px] shrink-0">
                      <div className="text-base font-bold text-gray-900">
                        {formatDay(f.date)}
                      </div>

                      {i === 0 && (
                        <div className="text-xs font-semibold text-green-700">
                          {t("weather.today")}
                        </div>
                      )}
                    </div>

                    <div className="text-3xl leading-none">
                      {getWeatherEmoji(f.weather_code)}
                    </div>

                    <div className="text-base font-bold text-gray-900 whitespace-nowrap">
                      {round(f.temperature_max_c)}° /{" "}
                      {round(f.temperature_min_c)}°
                    </div>

                    <div className="ml-auto flex flex-col items-end text-right">
                      <span className="inline-flex items-center gap-1 text-base font-semibold text-sky-700">
                        <CloudRain size={16} />
                        {round(
                          f.precipitation_probability_max_pct
                        )}
                        %
                      </span>

                      {strongWind && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700">
                          <Wind size={13} />
                          {t("weather.strongWind")}
                        </span>
                      )}
                    </div>

                    <span
                      className="text-gray-400 transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    >
                      ▾
                    </span>
                  </summary>

                  <div className="space-y-2.5 border-t border-gray-100 px-4 py-4 text-sm">
                    <ForecastMetric
                      label={t("weather.rain")}
                      value={
                        rainWords(f.rainfall_intensity)
                          ? `${rainWords(
                              f.rainfall_intensity
                            )} (${f.precipitation_mm} mm)`
                          : `${f.precipitation_mm} mm`
                      }
                    />

                    <ForecastMetric
                      label={t("weather.wind")}
                      value={`${round(
                        f.wind_speed_max_kmh
                      )} km/h`}
                    />

                    <ForecastMetric
                      label={t("weather.windGust")}
                      value={`${round(
                        f.wind_gust_max_kmh
                      )} km/h`}
                    />

                    <ForecastMetric
                      label={t("weather.etDescription")}
                      value={`${f.et0_mm} mm`}
                    />
                  </div>
                </details>
              );
            })}
          </div>
        </section>

        {/* Disclaimer */}
        <Card className="p-4 bg-gray-50/80 border-gray-200">
          <div className="flex gap-3">
            <Info
              size={18}
              className="text-gray-500 flex-shrink-0 mt-0.5"
            />

            <p className="text-sm text-gray-500 leading-relaxed">
              {data.disclaimer}
            </p>
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
    <div className="flex justify-between gap-4">
      <span className="text-gray-500">{label}</span>

      <span className="font-semibold text-gray-800 text-right whitespace-nowrap">
        {value}
      </span>
    </div>
  );
}