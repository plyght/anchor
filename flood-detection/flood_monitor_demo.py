import requests
import time
import os
from datetime import datetime
from typing import Dict, Any

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

CONVEX_URL = os.getenv("CONVEX_URL", "")

DEMO_SCENARIOS = [
    {
        "title": "Karachi Flood Alert: FLOOD WATCH",
        "description": "Moderate rainfall detected in northern districts. Water levels rising near Lyari River. Confidence: 87.3%",
        "severity": "high",
        "weather": {
            "pressure": 1003.2,
            "precipitation": 0.65,
            "humidity": 88.5,
            "trend": -2.3,
            "location": "Karachi North - Lyari",
        },
    },
    {
        "title": "Karachi Flood Alert: EMERGENCY WARNING",
        "description": "Heavy rainfall exceeding 1.2 inches detected. Severe flooding imminent in low-lying areas. Confidence: 94.1%",
        "severity": "critical",
        "weather": {
            "pressure": 997.8,
            "precipitation": 1.35,
            "humidity": 96.2,
            "trend": -5.7,
            "location": "Karachi Central - Saddar",
        },
    },
    {
        "title": "Karachi Flood Alert: EMERGENCY WARNING",
        "description": "Critical pressure drop with sustained heavy rainfall. Infrastructure failure risk high. Confidence: 91.8%",
        "severity": "critical",
        "weather": {
            "pressure": 995.1,
            "precipitation": 1.8,
            "humidity": 97.5,
            "trend": -8.2,
            "location": "Karachi South - Clifton",
        },
    },
]


def send_demo_alert(scenario: Dict[str, Any]) -> bool:
    if not CONVEX_URL:
        print("❌ ERROR: CONVEX_URL not set")
        return False

    payload = {
        "title": scenario["title"],
        "description": scenario["description"],
        "incident_type": "flood",
        "severity": scenario["severity"],
        "trigger_data": {
            "source": "ml_model_demo",
            "demo_mode": True,
            "weather": scenario["weather"],
        },
        "location": {"lat": 24.8608, "lon": 67.0104, "address": "Karachi, Pakistan"},
    }

    try:
        endpoint = f"{CONVEX_URL}/flood-alert"
        response = requests.post(endpoint, json=payload, timeout=10)
        response.raise_for_status()
        print(f"✅ Alert sent: {scenario['title']}")
        print(f"   Severity: {scenario['severity'].upper()}")
        print(f"   Response: {response.status_code}")
        return True
    except Exception as e:
        print(f"❌ Failed to send alert: {e}")
        return False


def run_demo_sequence(interval_seconds: int = 30):
    print("🎬 DEMO MODE - Karachi Flood Detection System")
    print("=" * 60)
    print(f"📍 Location: Karachi, Pakistan")
    print(f"🎯 Convex endpoint: {CONVEX_URL}")
    print(f"⏱️  Alert interval: {interval_seconds} seconds")
    print(f"📊 Demo scenarios: {len(DEMO_SCENARIOS)}")
    print("=" * 60)
    print("\nStarting demo sequence...\n")

    scenario_index = 0

    try:
        while True:
            scenario = DEMO_SCENARIOS[scenario_index % len(DEMO_SCENARIOS)]

            print(f"\n🚨 DEMO ALERT #{scenario_index + 1}")
            print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            print("-" * 60)

            send_demo_alert(scenario)

            scenario_index += 1

            print(f"\n⏳ Next alert in {interval_seconds} seconds...")
            print(f"   (Press Ctrl+C to stop)\n")

            time.sleep(interval_seconds)

    except KeyboardInterrupt:
        print("\n\n🛑 Demo stopped")
        print(f"📊 Total alerts sent: {scenario_index}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        try:
            interval = int(sys.argv[1])
        except ValueError:
            print("Usage: python flood_monitor_demo.py [interval_seconds]")
            print("Example: python flood_monitor_demo.py 30")
            sys.exit(1)
    else:
        interval = 30

    run_demo_sequence(interval_seconds=interval)
