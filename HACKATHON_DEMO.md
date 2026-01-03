# Anchor Hackathon Demo Guide

## Setup (Before Demo)

### 1. Start the backend services
```bash
bun demo
```

This starts:
- Convex (database)
- Backend API (port 3000)
- BLE Bridge (mesh communication)

**Note:** Frontend is NOT needed - you'll show screenshots instead.

### 2. Have your phone ready
- Open bitchat app
- Make sure you're connected and can see the mesh
- Username should be "plight"

## During the Demo

### Step 1: Explain the Problem
"In emergency situations like floods in Karachi, Pakistan, traditional communication infrastructure fails. Cell towers go down, internet is unavailable, but people still have their phones with Bluetooth."

### Step 2: Show the ML Detection System
"Our system uses real-time weather data from Karachi. When the ML model detects flood conditions - high precipitation, low pressure, rising water levels - it automatically triggers an alert."

**Point to flood-detection code on screen** (optional)

### Step 3: Show Frontend Screenshots
"Admins can see incidents and manage volunteers through our web dashboard."

**Show screenshots:**
- Volunteer profiles
- Admin dashboard
- Incident management UI

### Step 4: Trigger the Demo
```bash
bun demo:trigger
```

This will:
1. Create a Karachi flood incident
2. Generate two tasks:
   - **Broadcast**: Evacuation alert (to everyone)
   - **Targeted**: Assessment task (to you specifically)
3. Dispatch both to the mesh network

### Step 5: Show Your Phone
"Within 5 seconds, the alerts appear on volunteers' phones via Bluetooth mesh - no internet required."

**Show on your bitchat app:**
- Broadcast message appears
- Direct message to you appears

### Step 6: Respond
"Volunteers can respond with simple codes:"

Type on your phone:
```
<CODE> A
```

**Show on backend terminal:**
- Response is received and recorded
- System updates task status

### Step 7: Explain the Technology
"This uses:"
- **Noise Protocol** (same encryption as WhatsApp)
- **Bluetooth LE mesh** (multi-hop, 7 hops = ~200m range each)
- **Convex** (real-time database sync)
- **ML-powered detection** (OpenMeteo + RandomForest)

## Key Demo Points

✅ **Infrastructure-independent**: Works without internet or cellular
✅ **Encrypted**: Noise protocol for secure DMs
✅ **Targeted dispatch**: Can send to everyone OR specific volunteers
✅ **Response tracking**: Volunteers can accept/decline/complete tasks
✅ **Real ML detection**: OpenMeteo API + trained model (demo uses fake trigger)
✅ **Production ready**: Using actual prod Convex deployment

## Troubleshooting During Demo

**If tasks don't appear on phone:**
- Check BLE bridge terminal for "🚨 NEW TASK" messages
- Verify phone has announced on mesh (should see "👋 plight joined")
- Wait 5 seconds (polling interval)

**If backend is offline:**
- Terminal will show "⚠️ Anchor backend offline"
- Restart with `bun demo`

**If volunteer not found:**
- Script auto-creates "plight" if missing
- Update bitchat username to match

## After the Demo

Show the actual incident in backend logs or Convex dashboard (optional).

## Demo Flow Summary

```
1. bun demo                    → Start services
2. Show phone (bitchat ready)  → Volunteers standing by
3. bun demo:trigger            → Flood detected, alerts sent
4. Show phone (messages arrive)→ Tasks received via mesh
5. Type response on phone      → Volunteer accepts
6. Show backend logs           → Response recorded
```

Total demo time: **2-3 minutes**

## Production Deployment

For actual deployment:
- Deploy backend to Koyeb/Railway
- Deploy frontend to Vercel
- Run BLE bridge on Raspberry Pi or Mac Mini in field
- Flood monitor runs continuously (10-minute intervals)
- Real alerts trigger automatically when conditions met

Everything is configured and ready for production in this codebase.
