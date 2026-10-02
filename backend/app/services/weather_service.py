from app.schemas.weather import WeatherResponse, DailyForecast, WeatherAdvisory

class WeatherService:
    def get_weather(self, location: str) -> WeatherResponse:
        raise NotImplementedError

class MockWeatherService(WeatherService):
    def get_weather(self, location: str) -> WeatherResponse:
        return WeatherResponse(
            current_temp=28,
            current_condition="Mostly Sunny",
            humidity=65,
            wind_speed=12,
            rain_probability=10,
            advisories=[
                WeatherAdvisory(
                    title="🌧 Rain expected tomorrow",
                    recommendation="You probably don't need to irrigate today. Rain is expected within 24 hours, so waiting can help save water."
                )
            ],
            forecast=[
                DailyForecast(day="Today", temp_max=30, temp_min=22, rain_probability=10, condition="Mostly Sunny", icon="☀️"),
                DailyForecast(day="Tomorrow", temp_max=27, temp_min=21, rain_probability=70, condition="Rain", icon="🌧"),
                DailyForecast(day="Day 3", temp_max=29, temp_min=21, rain_probability=20, condition="Partly Cloudy", icon="⛅")
            ]
        )

weather_service = MockWeatherService()
