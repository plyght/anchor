# 🎬 Hackathon Demo Guide

This guide helps you demo the flood detection system during your hackathon presentation.

## Overview

You have **3 scripts**:

| Script | Purpose | Use When |
|--------|---------|----------|
| `flood_monitor.py` | **Real monitoring** | Background service (probably won't trigger) |
| `flood_monitor_demo.py` | **Automated demo** | Continuous alerts every 30 seconds |
| `trigger_demo_alert.py` | **Manual trigger** | On-demand single alert for controlled demo |

---

## 🎯 Recommended Demo Flow

### Setup (Before Demo)

```bash
cd /Users/nicojaffer/anchor/flood-detection

# 1. Start real monitoring in background (for authenticity)
screen -S flood-real
uv run python -u flood_monitor.py 10
# Press Ctrl+A then D to detach

# 2. Have frontend running
cd ../frontend
bun dev
# Opens http://localhost:5173

# 3. Open admin dashboard in browser
# http://localhost:5173/admin
```

### During Presentation

**Option A: Manual Trigger (RECOMMENDED for hackathon)**

```bash
# Trigger one alert when you're ready to demo
cd flood-detection
uv run python trigger_demo_alert.py 2

# This creates CRITICAL severity incident instantly
# Show the admin dashboard - incident appears in real-time!
```

**Option B: Automated Demo Mode**

```bash
# Continuous alerts every 30 seconds
cd flood-detection
uv run python -u flood_monitor_demo.py 30

# Cycles through 3 scenarios:
# 1. FLOOD WATCH (high severity)
# 2. EMERGENCY WARNING (critical)
# 3. EMERGENCY WARNING (critical)
```

---

## 📋 Demo Script (What to Say)

### 1. Introduce the Problem

> "In Pakistan, floods cause billions in damage annually. Traditional systems rely on infrastructure that fails during disasters. We built Anchor - an ML-powered early warning system that works even when the internet is down."

### 2. Show Real Monitoring

```bash
# Show the real monitor running
screen -r flood-real
```

> "This is our real-time monitoring system. It checks Karachi weather every 10 minutes using Open-Meteo API and a trained ML model. Right now conditions are NORMAL."

Press Ctrl+A then D to detach.

### 3. Trigger Demo Alert

```bash
cd flood-detection
uv run python trigger_demo_alert.py 2
```

> "Let me simulate what happens when the model detects dangerous flood conditions..."

**Expected output:**
```
🚨 Triggering Demo Alert
============================================================
Title: Karachi Flood Alert: EMERGENCY WARNING
Severity: CRITICAL
============================================================

✅ SUCCESS!
Status: 201
```

### 4. Show Dashboard Auto-Update

Switch to browser at `http://localhost:5173/admin`

> "Notice the incident appeared instantly - that's Convex's reactive queries. No polling, no refresh needed. The system automatically created this emergency with all the ML model's weather data attached."

### 5. Show Incident Details

Click the incident in dashboard.

> "Here's the full incident with ML confidence scores, weather conditions, and location. In production, this would trigger task generation via AI, volunteer matching, and dispatch over our Bluetooth mesh network - even without internet."

### 6. (Optional) Show Task Generation

> "Let me show how we use AI to generate response tasks..."

Click "Generate Tasks" or use AI task generation features.

---

## 🚨 Alert Types

### Type 1: FLOOD WATCH (High Severity)

```bash
uv run python trigger_demo_alert.py 1
```

- **Severity**: High
- **Conditions**: Moderate rain (0.65"), low pressure (1003 hPa)
- **Use when**: Want to show escalation levels

### Type 2: EMERGENCY WARNING (Critical Severity)

```bash
uv run python trigger_demo_alert.py 2
```

- **Severity**: Critical
- **Conditions**: Heavy rain (1.35"), very low pressure (997 hPa)
- **Use when**: Want to show maximum urgency (RECOMMENDED)

---

## 🐛 Troubleshooting

### "CONVEX_URL not set"

```bash
cd flood-detection
cat .env
# Should show: CONVEX_URL=https://scintillating-horse-499.convex.cloud

# If missing:
echo "CONVEX_URL=https://scintillating-horse-499.convex.cloud" > .env
```

### Alert Sends But Doesn't Appear in Dashboard

1. Check Convex dev is running: `bunx convex dev`
2. Check frontend is connected to correct CONVEX_URL
3. Verify admin dashboard is open: `http://localhost:5173/admin`

### Demo Script Errors

```bash
# Make sure dependencies installed
cd flood-detection
uv pip install requests python-dotenv
```

---

## 📊 What Makes This Impressive

**For Judges:**

1. **Real ML Model**: Not fake - actually trained on 92 days of Karachi weather data
2. **Real API**: Fetches live weather from Open-Meteo
3. **Real-time Updates**: Convex reactive queries (no polling)
4. **Production Ready**: Can deploy to Koyeb, runs 24/7
5. **Infrastructure Independent**: Designed for Bluetooth mesh (see main README)

**Key Technical Points:**
- RandomForest classifier (scikit-learn)
- 100% accuracy on test data
- 4 input features: pressure, precipitation, humidity, trend
- Automatic incident creation via HTTP endpoint
- Full audit trail with weather metadata

---

## 🎥 Quick Demo Checklist

- [ ] Real monitor running in background
- [ ] Frontend running at http://localhost:5173
- [ ] Admin dashboard open in browser
- [ ] Convex dev running
- [ ] Demo trigger script ready
- [ ] Screen recording software ready (if recording)
- [ ] Have both terminal and browser visible on screen

---

## 💡 Pro Tips

1. **Practice the trigger timing** - know exactly when to run `trigger_demo_alert.py`
2. **Have admin dashboard visible** before triggering alert (shows real-time update)
3. **Explain the real vs demo** - judges appreciate honesty about demo data
4. **Show the code** - `trigger_demo_alert.py` is simple, easy to understand
5. **Mention scalability** - can monitor multiple cities, integrate more sensors

---

## 🔗 Full System Demo

Want to show the **complete** emergency response workflow?

1. Trigger flood alert (this guide)
2. Generate tasks with AI: `generateForIncident({ incident_id, use_ai: true })`
3. Show volunteer matching algorithm
4. Show task dispatch to mesh network (requires BitChat setup)

See main [README.md](README.md) for full system documentation.

---

**Good luck with your hackathon! 🚀**
