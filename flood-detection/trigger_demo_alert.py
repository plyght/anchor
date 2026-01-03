import requests
import os
import sys
from datetime import datetime

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

CONVEX_URL = os.getenv("CONVEX_URL", "")

ALERT_TYPES = {
    "1": {
        "title": "Karachi Flood Alert: FLOOD WATCH",
        "description": "Moderate rainfall detected in northern districts. Water levels rising near Lyari River. Confidence: 87.3%",
        "severity": "high",
        "weather": {
            "pressure": 1003.2,
            "precipitation": 0.65,
            "humidity": 88.5,
            "trend": -2.3,
        },
    },
    "2": {
        "title": "Karachi Flood Alert: EMERGENCY WARNING",
        "description": "Heavy rainfall exceeding 1.2 inches detected. Severe flooding imminent. Confidence: 94.1%",
        "severity": "critical",
        "weather": {
            "pressure": 997.8,
            "precipitation": 1.35,
            "humidity": 96.2,
            "trend": -5.7,
        },
    },
}


def trigger_alert(alert_type: str = "2"):
    if not CONVEX_URL:
        print("❌ ERROR: CONVEX_URL not set in .env")
        return False

    if alert_type not in ALERT_TYPES:
        print(f"❌ Invalid alert type: {alert_type}")
        print("Available types: 1 (FLOOD WATCH), 2 (EMERGENCY WARNING)")
        return False

    scenario = ALERT_TYPES[alert_type]

    payload = {
        "title": scenario["title"],
        "description": scenario["description"],
        "incident_type": "flood",
        "severity": scenario["severity"],
        "trigger_data": {
            "source": "ml_model_demo",
            "demo_mode": True,
            "timestamp": datetime.now().isoformat(),
            "weather": scenario["weather"],
        },
        "location": {"lat": 24.8608, "lon": 67.0104, "address": "Karachi, Pakistan"},
    }

    print("🚨 Triggering Demo Alert")
    print("=" * 60)
    print(f"Title: {scenario['title']}")
    print(f"Severity: {scenario['severity'].upper()}")
    print(f"Endpoint: {CONVEX_URL}/flood-alert")
    print("=" * 60)

    try:
        response = requests.post(f"{CONVEX_URL}/flood-alert", json=payload, timeout=10)
        response.raise_for_status()

        print(f"\n✅ SUCCESS!")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        print(f"\n💡 Check your admin dashboard: http://localhost:5173/admin")
        return True

    except requests.exceptions.RequestException as e:
        print(f"\n❌ FAILED: {e}")
        if hasattr(e, "response") and e.response is not None:
            print(f"Response: {e.response.text}")
        return False


if __name__ == "__main__":
    print("🎬 Anchor Flood Detection - Demo Alert Trigger\n")

    if len(sys.argv) > 1:
        alert_type = sys.argv[1]
    else:
        print("Alert Types:")
        print("  1 - FLOOD WATCH (high severity)")
        print("  2 - EMERGENCY WARNING (critical severity)")
        print()
        alert_type = input("Select alert type [1 or 2, default: 2]: ").strip() or "2"

    trigger_alert(alert_type)
