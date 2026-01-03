# Karachi Flood Detection Service

Automated ML-powered flood monitoring system for Karachi, Pakistan. Monitors real-time weather conditions and automatically creates incidents in Anchor when flood risks are detected.

## Features

- **Real-time Monitoring**: Polls Open-Meteo weather API for Karachi conditions
- **ML Predictions**: RandomForest classifier with 3 severity levels (NORMAL, FLOOD WATCH, EMERGENCY WARNING)
- **Automatic Alerts**: Creates incidents in Convex database when flood risks detected
- **High Accuracy**: Trained model achieves ~100% accuracy on test data
- **Confidence Scoring**: Each prediction includes confidence percentage
- **Duplicate Prevention**: Only triggers alerts when new weather data arrives

## How It Works

```
┌─────────────────────────────┐
│ Open-Meteo API              │
│ (Weather data for Karachi)  │
└─────────────┬───────────────┘
              │
              ↓
┌─────────────────────────────┐
│ ML Model (RandomForest)     │
│ - Surface pressure          │
│ - Precipitation             │
│ - Humidity                  │
│ - Pressure trend            │
└─────────────┬───────────────┘
              │
              ↓ (if alert)
┌─────────────────────────────┐
│ Convex HTTP Endpoint        │
│ POST /flood-alert           │
└─────────────┬───────────────┘
              │
              ↓
┌─────────────────────────────┐
│ Anchor Incident Created     │
│ - Auto-populated location   │
│ - Weather data in metadata  │
│ - Ready for task generation │
└─────────────────────────────┘
```

## Prediction Levels

| Level | Status | Severity | Criteria |
|-------|--------|----------|----------|
| 0 | NORMAL | - | No alert sent |
| 1 | FLOOD WATCH | `high` | 0.4-0.9" rain + pressure < 1005 hPa |
| 2 | EMERGENCY WARNING | `critical` | ≥1.0" rain OR pressure ≤ 1000 hPa |

## Installation

### Prerequisites

- Python 3.9+
- Active Convex deployment (from main Anchor project)

### Local Setup

1. **Navigate to flood detection directory**:
```bash
cd flood-detection
```

2. **Create virtual environment**:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**:
```bash
pip install -r requirements.txt
```

4. **Configure environment**:
```bash
cp .env.example .env
```

Edit `.env` and set your Convex URL:
```env
CONVEX_URL=https://your-project.convex.site
```

5. **Run the service**:
```bash
python flood_monitor.py 10
```

The argument `10` is the check interval in minutes (default: 10).

### Verify Setup

The service should output:
```
🌊 Karachi Flood Monitoring System
============================================================
Training model...
Model trained. Accuracy: 100.0%
✅ Model ready
📍 Monitoring: Karachi (24.8608, 67.0104)
🔄 Check interval: 10 minutes
🎯 Convex endpoint: https://your-project.convex.site
============================================================

🔍 Check at 2026-01-03 13:25:00
Status: NORMAL (confidence: 77.0%)
Pressure: 1016.84 | Rain: 0.0 | Humidity: 95.0
⏳ Next check in 10 minutes...
```

## Deployment

### Option 1: Local/Server Deployment

**Using systemd (Linux)**:

1. Create service file `/etc/systemd/system/flood-monitor.service`:
```ini
[Unit]
Description=Karachi Flood Detection Service
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/anchor/flood-detection
Environment="CONVEX_URL=https://your-project.convex.site"
ExecStart=/path/to/venv/bin/python flood_monitor.py 10
Restart=always
RestartSec=60

[Install]
WantedBy=multi-user.target
```

2. Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable flood-monitor
sudo systemctl start flood-monitor
sudo systemctl status flood-monitor
```

3. View logs:
```bash
sudo journalctl -u flood-monitor -f
```

**Using screen/tmux (Quick setup)**:
```bash
cd flood-detection
source venv/bin/activate
screen -S flood-monitor
python flood_monitor.py 10
# Press Ctrl+A then D to detach
```

### Option 2: Koyeb Deployment

1. **Create Koyeb account** at [koyeb.com](https://koyeb.com)

2. **Deploy from GitHub**:
   - Connect your GitHub repository
   - Select `flood-detection` directory
   - Set build command: `pip install -r requirements.txt`
   - Set run command: `python flood_monitor.py 10`
   - Set service type: **Worker** (not web service)

3. **Configure Environment Variables** in Koyeb dashboard:
   ```
   CONVEX_URL=https://your-project.convex.site
   ```

4. **Deploy**: Koyeb will build and run the service automatically

5. **Monitor**: Check logs in Koyeb dashboard

### Option 3: Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY flood_monitor.py .

ENV CONVEX_URL=""
CMD ["python", "flood_monitor.py", "10"]
```

Build and run:
```bash
docker build -t flood-monitor .
docker run -d --restart=unless-stopped \
  -e CONVEX_URL="https://your-project.convex.site" \
  --name flood-monitor \
  flood-monitor
```

## Configuration

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `CONVEX_URL` | Yes | Convex deployment URL | - |

### Command Line Arguments

```bash
python flood_monitor.py [CHECK_INTERVAL_MINUTES]
```

- `CHECK_INTERVAL_MINUTES`: How often to check weather (default: 10)

**Recommended intervals**:
- Development/Testing: `1` minute
- Production: `10-15` minutes (balances API usage with responsiveness)

## Integration with Anchor

### Convex Endpoint

The service posts to `POST /flood-alert` with this payload:

```typescript
{
  title: "Karachi Flood Alert: FLOOD WATCH",
  description: "Automated flood detection system alert. Confidence: 85.2%",
  incident_type: "flood",
  severity: "high" | "critical",
  trigger_data: {
    source: "ml_model",
    prediction_level: 1 | 2,
    confidence: 85.2,
    weather: {
      pressure: 1002.5,
      precipitation: 0.65,
      humidity: 88.0,
      trend: -2.3,
      data_hour_utc: "2026-01-03T19:00:00+00:00",
      data_hour_pk: "2026-01-04T00:00:00+00:00"
    }
  },
  location: {
    lat: 24.8608,
    lon: 67.0104,
    address: "Karachi, Pakistan"
  }
}
```

### After Incident Creation

Once the incident is created:

1. **View in Admin Dashboard**: `http://localhost:5173/admin`
2. **Generate Tasks**: Use AI-powered task generation (already integrated):
   ```typescript
   await generateForIncident({ incident_id, use_ai: true });
   ```
3. **Match Volunteers**: Anchor's existing matching system finds appropriate volunteers
4. **Dispatch**: Send tasks to BitChat mesh network

## Monitoring

### Check Service Status

**Systemd**:
```bash
sudo systemctl status flood-monitor
```

**Logs**:
```bash
# Systemd
sudo journalctl -u flood-monitor -f

# Docker
docker logs -f flood-monitor

# Screen/tmux
screen -r flood-monitor
```

### Expected Log Output

**Normal operation**:
```
🔍 Check at 2026-01-03 13:25:00
Status: NORMAL (confidence: 77.0%)
Pressure: 1016.84 | Rain: 0.0 | Humidity: 95.0
⏳ Next check in 10 minutes...
```

**Alert triggered**:
```
🔍 Check at 2026-01-03 13:35:00
Status: FLOOD WATCH (confidence: 88.5%)
Pressure: 1002.3 | Rain: 0.7 | Humidity: 92.0
⚠️  ALERT TRIGGERED: FLOOD WATCH
✅ Alert sent to Convex: 201
⏳ Next check in 10 minutes...
```

## Troubleshooting

### Common Issues

**1. "CONVEX_URL not set" warning**
```bash
# Make sure .env file exists and is loaded
cat .env
# Output should show: CONVEX_URL=https://...

# For systemd, ensure Environment= line in service file
```

**2. "Failed to send alert to Convex"**
```bash
# Check Convex URL is correct
echo $CONVEX_URL

# Test endpoint manually
curl -X POST https://your-project.convex.site/flood-alert \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","incident_type":"flood","severity":"high"}'
```

**3. Model training fails**
```bash
# Check internet connection
ping api.open-meteo.com

# Check dependencies installed
pip list | grep -E "(pandas|sklearn|openmeteo)"
```

**4. Service crashes on startup**
```bash
# Check Python version
python --version  # Should be 3.9+

# Reinstall dependencies
pip install --upgrade -r requirements.txt
```

## API Usage

The service uses the free [Open-Meteo API](https://open-meteo.com/):
- **Rate limit**: 10,000 requests/day (free tier)
- **Our usage**: ~144 requests/day at 10-minute intervals
- **Well within limits**: ✅

## Development

### Model Retraining

To update the model with new data:

1. Edit training data in `train_model()` function
2. Adjust thresholds in flood label assignment:
```python
df.loc[(df['precipitation'].between(0.4, 0.9)) & (df['surface_pressure'] < 1005), 'flood_label'] = 1
df.loc[(df['precipitation'] >= 1.0) | (df['surface_pressure'] <= 1000), 'flood_label'] = 2
```
3. Restart service to load new model

### Testing Locally

```bash
# Short check interval for testing
python flood_monitor.py 1

# Watch logs
tail -f flood_log.csv
```

### Manual Alert Testing

```bash
# Test Convex endpoint directly
curl -X POST http://localhost:3000/flood-alert \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Flood Alert",
    "description": "Manual test",
    "incident_type": "flood",
    "severity": "high",
    "trigger_data": {"test": true},
    "location": {
      "lat": 24.8608,
      "lon": 67.0104,
      "address": "Karachi, Pakistan"
    }
  }'
```

## Architecture Notes

- **Stateless**: Model retrains on startup from historical data
- **Idempotent**: Duplicate alerts prevented by data change detection
- **Resilient**: Automatic retry on API failures (5 retries with backoff)
- **Efficient**: Caches API responses for 30 minutes

## Future Enhancements

- [ ] Support multiple cities/regions
- [ ] Historical incident correlation analysis
- [ ] SMS/email alerts for critical incidents
- [ ] Predictive forecasting (next 24h)
- [ ] Integration with local weather stations

## Support

For issues or questions:
1. Check logs for error messages
2. Verify Convex endpoint is accessible
3. Confirm weather API is responding
4. Check GitHub issues for similar problems

## License

MIT
