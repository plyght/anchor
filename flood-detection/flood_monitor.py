import openmeteo_requests
import pandas as pd
import numpy as np
import requests
import requests_cache
from retry_requests import retry
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from datetime import datetime, timedelta
import time
import traceback
import os
from typing import Optional, Dict, Any
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

KARACHI_LAT = 24.8608
KARACHI_LON = 67.0104
CONVEX_URL = os.getenv("CONVEX_URL", "")

cache_session = requests_cache.CachedSession(".cache", expire_after=1800)
retry_session = retry(cache_session, retries=5, backoff_factor=0.2)
openmeteo = openmeteo_requests.Client(session=retry_session)

url = "https://api.open-meteo.com/v1/forecast"


def train_model() -> RandomForestClassifier:
    params_training = {
        "latitude": KARACHI_LAT,
        "longitude": KARACHI_LON,
        "hourly": ["surface_pressure", "precipitation", "relative_humidity_2m"],
        "past_days": 92,
        "forecast_days": 0,
        "precipitation_unit": "inch",
    }

    responses = openmeteo.weather_api(url, params_training)
    response = responses[0]
    hourly = response.Hourly()

    hourly_data = {
        "date": pd.date_range(
            start=pd.to_datetime(hourly.Time(), unit="s", utc=True),
            end=pd.to_datetime(hourly.TimeEnd(), unit="s", utc=True),
            freq=pd.Timedelta(seconds=hourly.Interval()),
            inclusive="left",
        ),
        "api_pressure": hourly.Variables(0).ValuesAsNumpy(),
        "precipitation": hourly.Variables(1).ValuesAsNumpy(),
        "humidity": hourly.Variables(2).ValuesAsNumpy(),
    }
    api_df = pd.DataFrame(data=hourly_data)

    pressure_hpa = [
        1002.37,
        998.99,
        1002.37,
        998.99,
        998.99,
        998.99,
        1002.37,
        1002.37,
        998.99,
        998.99,
        998.99,
        1002.37,
        1005.76,
        1005.76,
        1009.14,
        1009.14,
        1009.14,
        1009.14,
        1009.14,
        1009.14,
        1009.14,
        1009.14,
        1005.76,
        1005.76,
        1002.37,
        1002.37,
        998.99,
        998.99,
        998.99,
        998.99,
        998.99,
        995.6,
        995.6,
        995.6,
        995.6,
        995.6,
        995.6,
        998.99,
        998.99,
        998.99,
        998.99,
        998.99,
        998.99,
        995.6,
        995.6,
        995.6,
        998.99,
        998.99,
        998.99,
        1002.37,
        1002.37,
        998.99,
        998.99,
        995.6,
        995.6,
        992.21,
        992.21,
        995.6,
        995.6,
        998.99,
        998.99,
        998.99,
        1002.37,
        1002.37,
        998.99,
        998.99,
        998.99,
        998.99,
        998.99,
        998.99,
    ]

    manual_dates = [
        datetime(2024, 5, 1) + timedelta(days=i) for i in range(len(pressure_hpa))
    ]
    manual_df = pd.DataFrame(
        {
            "date_only": [d.date() for d in manual_dates],
            "surface_pressure": pressure_hpa,
        }
    )

    api_df["date_only"] = api_df["date"].dt.date
    df = pd.merge(api_df, manual_df, on="date_only", how="inner")

    df["pressure_trend"] = df["surface_pressure"].diff(periods=3).fillna(0)
    df["flood_label"] = 0
    df.loc[
        (df["precipitation"].between(0.4, 0.9)) & (df["surface_pressure"] < 1005),
        "flood_label",
    ] = 1
    df.loc[
        (df["precipitation"] >= 1.0) | (df["surface_pressure"] <= 1000), "flood_label"
    ] = 2

    np.random.seed(42)
    num_samples = 50

    normal_examples = pd.DataFrame(
        {
            "surface_pressure": np.random.normal(1010, 3, num_samples),
            "precipitation": np.random.uniform(0, 0.3, num_samples),
            "humidity": np.random.normal(65, 8, num_samples),
            "pressure_trend": np.random.normal(0, 0.8, num_samples),
            "flood_label": 0,
        }
    )

    watch_examples = pd.DataFrame(
        {
            "surface_pressure": np.random.normal(1002, 2, num_samples),
            "precipitation": np.random.uniform(0.4, 0.9, num_samples),
            "humidity": np.random.normal(85, 5, num_samples),
            "pressure_trend": np.random.normal(-1.5, 0.6, num_samples),
            "flood_label": 1,
        }
    )

    warning_examples = pd.DataFrame(
        {
            "surface_pressure": np.random.normal(995, 3, num_samples),
            "precipitation": np.random.uniform(1.0, 3.5, num_samples),
            "humidity": np.random.normal(95, 3, num_samples),
            "pressure_trend": np.random.normal(-5.0, 1.5, num_samples),
            "flood_label": 2,
        }
    )

    final_df = pd.concat(
        [
            df[
                [
                    "surface_pressure",
                    "precipitation",
                    "humidity",
                    "pressure_trend",
                    "flood_label",
                ]
            ],
            normal_examples,
            watch_examples,
            warning_examples,
        ],
        ignore_index=True,
    ).fillna(0)

    X = final_df[["surface_pressure", "precipitation", "humidity", "pressure_trend"]]
    y = final_df["flood_label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = RandomForestClassifier(
        n_estimators=100, max_depth=5, class_weight="balanced", random_state=42
    )
    model.fit(X_train, y_train)

    print(f"Model trained. Accuracy: {model.score(X_test, y_test) * 100:.1f}%")
    return model


def fetch_current_weather() -> Optional[Dict[str, Any]]:
    params_live = {
        "latitude": KARACHI_LAT,
        "longitude": KARACHI_LON,
        "hourly": ["surface_pressure", "precipitation", "relative_humidity_2m"],
        "forecast_days": 1,
        "precipitation_unit": "inch",
    }

    try:
        responses = openmeteo.weather_api(url, params_live)
        response = responses[0]
        hourly = response.Hourly()

        pressure_array = hourly.Variables(0).ValuesAsNumpy()
        precip_array = hourly.Variables(1).ValuesAsNumpy()
        humidity_array = hourly.Variables(2).ValuesAsNumpy()

        data_times = pd.date_range(
            start=pd.to_datetime(hourly.Time(), unit="s", utc=True),
            end=pd.to_datetime(hourly.TimeEnd(), unit="s", utc=True),
            freq=pd.Timedelta(seconds=hourly.Interval()),
            inclusive="left",
        )

        now = pd.Timestamp.utcnow()
        time_diffs = np.abs((data_times - now).total_seconds())
        idx = int(np.argmin(time_diffs))

        pk_time = data_times[idx] + pd.Timedelta(hours=5)

        pressure = float(pressure_array[idx])
        precip = float(precip_array[idx])
        humidity = float(humidity_array[idx])

        if idx + 3 < len(pressure_array):
            trend = float(pressure_array[idx + 3] - pressure_array[idx])
        else:
            trend = 0.0

        return {
            "pressure": pressure,
            "precipitation": precip,
            "humidity": humidity,
            "trend": trend,
            "timestamp": datetime.now(),
            "data_hour_utc": data_times[idx],
            "data_hour_pk": pk_time,
            "data_index": idx,
        }

    except Exception as e:
        print(f"Error fetching weather: {e}")
        traceback.print_exc()
        return None


def predict_flood_risk(
    model: RandomForestClassifier, weather: Dict[str, Any]
) -> Dict[str, Any]:
    input_df = pd.DataFrame(
        [
            [
                weather["pressure"],
                weather["precipitation"],
                weather["humidity"],
                weather["trend"],
            ]
        ],
        columns=["surface_pressure", "precipitation", "humidity", "pressure_trend"],
    )

    pred = model.predict(input_df)[0]
    conf = model.predict_proba(input_df)[0][pred] * 100

    status_map = {
        0: ("NORMAL", "GREEN"),
        1: ("FLOOD WATCH", "YELLOW"),
        2: ("EMERGENCY WARNING", "RED"),
    }

    status, color = status_map[pred]

    return {
        "prediction": int(pred),
        "status": status,
        "color": color,
        "confidence": float(conf),
    }


def send_alert_to_convex(weather: Dict[str, Any], prediction: Dict[str, Any]) -> bool:
    if not CONVEX_URL:
        print("WARNING: CONVEX_URL not set, skipping alert")
        return False

    if prediction["prediction"] == 0:
        return False

    severity_map = {1: "high", 2: "critical"}

    payload = {
        "title": f"Karachi Flood Alert: {prediction['status']}",
        "description": f"Automated flood detection system alert. Confidence: {prediction['confidence']:.1f}%",
        "incident_type": "flood",
        "severity": severity_map[prediction["prediction"]],
        "trigger_data": {
            "source": "ml_model",
            "prediction_level": prediction["prediction"],
            "confidence": prediction["confidence"],
            "weather": {
                "pressure": weather["pressure"],
                "precipitation": weather["precipitation"],
                "humidity": weather["humidity"],
                "trend": weather["trend"],
                "data_hour_utc": str(weather["data_hour_utc"]),
                "data_hour_pk": str(weather["data_hour_pk"]),
            },
        },
        "location": {
            "lat": KARACHI_LAT,
            "lon": KARACHI_LON,
            "address": "Karachi, Pakistan",
        },
    }

    try:
        endpoint = f"{CONVEX_URL}/flood-alert"
        response = requests.post(endpoint, json=payload, timeout=10)
        response.raise_for_status()
        print(f"✅ Alert sent to Convex: {response.status_code}")
        return True
    except Exception as e:
        print(f"❌ Failed to send alert to Convex: {e}")
        return False


def monitor_flood_risk(check_interval_minutes: int = 10):
    print("🌊 Karachi Flood Monitoring System")
    print("=" * 60)
    print(f"Training model...")

    model = train_model()
    print(f"✅ Model ready")
    print(f"📍 Monitoring: Karachi ({KARACHI_LAT}, {KARACHI_LON})")
    print(f"🔄 Check interval: {check_interval_minutes} minutes")
    print(f"🎯 Convex endpoint: {CONVEX_URL or 'NOT SET'}")
    print("=" * 60)

    previous_data_key = None

    try:
        while True:
            print(f"\n🔍 Check at {datetime.now()}")

            weather = fetch_current_weather()

            if weather:
                current_key = f"{weather['data_hour_utc']}_{weather['pressure']}"
                data_changed = previous_data_key != current_key
                previous_data_key = current_key

                prediction = predict_flood_risk(model, weather)

                print(
                    f"Status: {prediction['status']} (confidence: {prediction['confidence']:.1f}%)"
                )
                print(
                    f"Pressure: {weather['pressure']} | Rain: {weather['precipitation']} | Humidity: {weather['humidity']}"
                )

                if data_changed and prediction["prediction"] > 0:
                    print(f"⚠️  ALERT TRIGGERED: {prediction['status']}")
                    send_alert_to_convex(weather, prediction)

            print(f"⏳ Next check in {check_interval_minutes} minutes...")
            time.sleep(check_interval_minutes * 60)

    except KeyboardInterrupt:
        print("\n🛑 Monitoring stopped")


if __name__ == "__main__":
    import sys

    interval = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    monitor_flood_risk(check_interval_minutes=interval)
