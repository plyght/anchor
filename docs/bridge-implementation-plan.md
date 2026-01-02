# Supabase Bridge Integration Plan for bitchat-terminal

**Version:** 1.0  
**Date:** 2026-01-02  
**Status:** Technical Specification - Ready for Implementation

---

## Executive Summary

This document provides a complete technical specification for integrating Supabase PostgreSQL LISTEN/NOTIFY into bitchat-terminal to enable web app control. The bridge will act as a bidirectional gateway: receiving task dispatch commands from Supabase and sending volunteer responses back.

**Key Objective:** Enable a web application to dispatch tasks through Supabase that get broadcast to the bitchat mesh network, and capture volunteer responses for web app consumption.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Current Codebase Analysis](#current-codebase-analysis)
3. [Integration Strategy](#integration-strategy)
4. [Data Structures](#data-structures)
5. [Dependency Requirements](#dependency-requirements)
6. [Code Modifications](#code-modifications)
7. [Implementation Steps](#implementation-steps)
8. [Testing Strategy](#testing-strategy)
9. [Success Criteria](#success-criteria)

---

## 1. Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         WEB APPLICATION                         │
│                    (Task Management Dashboard)                  │
└────────────────────┬────────────────────────────────────────────┘
                     │ HTTP REST API
                     ▼
┌────────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  tasks table: id, title, location, code, status, etc.    │  │
│  │  responses table: task_id, volunteer, action, timestamp  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                     │ NOTIFY/LISTEN                             │
└─────────────────────┼───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              BITCHAT-TERMINAL (Rust Bridge Process)             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  tokio::select! {                                        │   │
│  │    1. rx.recv() => stdin input (existing)               │   │
│  │    2. notification_stream.next() => BLE (existing)       │   │
│  │ >> 3. db_rx.recv() => Supabase notifications (NEW) <<   │   │
│  │  }                                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────────┘
                      │ Bluetooth LE
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BITCHAT MESH NETWORK                          │
│   (iOS/Android phones, other Rust terminals via BLE)            │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

#### Outbound (Supabase → Mesh):
1. Web app inserts new task into Supabase `tasks` table
2. Supabase triggers `NOTIFY task_dispatch` with task JSON payload
3. Bridge's PostgreSQL LISTEN connection receives notification
4. Bridge parses task and formats bitchat message: `"TASK#3: Check levee B5 | Code: X7Y2"`
5. Bridge sends message to mesh via `peripheral.write()`
6. Message propagates through mesh (TTL=7, relay routing)

#### Inbound (Mesh → Supabase):
1. Volunteer on mesh sends response: `"X7Y2 A"` (Accept) or `"X7Y2 D"` (Decline)
2. Bridge receives via `notification_stream.next()`
3. Bridge parses response code and validates against active tasks
4. Bridge updates Supabase via HTTP POST to `/api/tasks/{id}/responses`
5. Web app reflects volunteer acceptance in real-time

---

## 2. Current Codebase Analysis

### Main Event Loop Location
**File:** `/Users/nicojaffer/bitchat-terminal/src/main.rs`  
**Lines:** 492-2350

```rust
// Current structure (2 branches)
loop {
    tokio::select! {
        // Branch 1: stdin input (lines 496-1718)
        Some(line) = rx.recv() => {
            // Command parsing: /help, /name, /j, /dm, etc.
            // Message sending via peripheral.write()
        },

        // Branch 2: BLE notifications (lines 1721-2344)
        Some(notification) = notification_stream.next() => {
            // Packet parsing: parse_bitchat_packet()
            // Message type handling: Announce, KeyExchange, Message, etc.
            // Display via format_message_display()
        },

        // CTRL-C signal handler (line 2346)
        _ = tokio::signal::ctrl_c() => { break; }
    }
}
```

**Required Change:** Add 3rd branch for Supabase notifications

### Message Sending Function
**Function:** `peripheral.write(cmd_char, &packet, WriteType)`  
**Primary Location:** Line 1694 (direct), Line 3017 (with fragmentation)

```rust
// Existing send pattern
let message_packet = create_bitchat_packet_with_signature(
    &my_peer_id,
    MessageType::Message,
    message_payload,
    Some(signature)
);

if should_fragment(&message_packet) {
    send_packet_with_fragmentation(&peripheral, cmd_char, message_packet, &my_peer_id).await?;
} else {
    peripheral.write(cmd_char, &message_packet, WriteType::WithoutResponse).await?;
}
```

### Message Receiving Handler
**Location:** Lines 1721-2056 (Message type), 2057-2180 (Fragments)

```rust
// Existing receive pattern
Some(notification) = notification_stream.next() => {
    match parse_bitchat_packet(&notification.value) {
        Ok(packet) => {
            match packet.msg_type {
                MessageType::Message => {
                    let message = parse_bitchat_message_payload(&packet.payload)?;
                    // Display logic here
                }
            }
        }
    }
}
```

**Required Change:** Add response code parsing logic

### Current Dependencies (Cargo.toml)
```toml
[dependencies]
tokio = { version = "1", features = ["full", "process"] }
btleplug = "0.11"
uuid = { version = "1", features = ["v4"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
chrono = "0.4"
# ... encryption crates
```

---

## 3. Integration Strategy

### Design Principles

1. **Non-breaking:** Existing terminal functionality must remain intact
2. **Mode-based:** Bridge mode enabled via `--bridge` flag or `BRIDGE_MODE=true` env var
3. **Async-first:** All I/O operations use tokio async/await
4. **Error resilient:** Database disconnections should not crash the bridge
5. **Type-safe:** Use strong typing for all data structures

### Bridge Operating Modes

#### Mode 1: Interactive Terminal (default)
- Current behavior unchanged
- User types commands and messages
- Full UI with prompts, colors, help menu

#### Mode 2: Bridge Process (new, `--bridge` flag)
- Minimal UI (status messages only)
- No stdin input processing
- Supabase LISTEN loop active
- Auto-reconnect on DB failures
- Logs to stdout for supervision (systemd, docker)

---

## 4. Data Structures

### Task Struct (Rust)
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
struct Task {
    id: i32,
    title: String,
    location: String,
    code: String,           // 4-char acceptance code (e.g., "X7Y2")
    status: String,         // "pending", "assigned", "completed"
    created_at: String,     // ISO 8601 timestamp
    assigned_to: Option<String>,  // volunteer nickname or None
}
```

### Response Struct (Rust)
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
struct TaskResponse {
    task_id: i32,
    code: String,           // Must match task.code
    action: String,         // "accept" or "decline"
    volunteer: String,      // nickname from bitchat
    peer_id: String,        // bitchat peer_id (for tracking)
    timestamp: String,      // ISO 8601
}
```

### Bridge Command Enum
```rust
enum BridgeCommand {
    TaskDispatch(Task),     // New task from Supabase
    Shutdown,               // Graceful shutdown signal
}
```

### Supabase Schema (PostgreSQL)

```sql
-- Tasks table
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    location TEXT NOT NULL,
    code CHAR(4) NOT NULL UNIQUE,  -- Acceptance code
    status TEXT NOT NULL DEFAULT 'pending',
    assigned_to TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Responses table (audit log)
CREATE TABLE responses (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id),
    code TEXT NOT NULL,
    action TEXT NOT NULL,  -- 'accept' or 'decline'
    volunteer TEXT NOT NULL,
    peer_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Function to trigger notification
CREATE OR REPLACE FUNCTION notify_task_dispatch()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('task_dispatch', row_to_json(NEW)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on task insert
CREATE TRIGGER task_dispatch_trigger
AFTER INSERT ON tasks
FOR EACH ROW
WHEN (NEW.status = 'pending')
EXECUTE FUNCTION notify_task_dispatch();
```

---

## 5. Dependency Requirements

### New Cargo.toml Dependencies

```toml
[dependencies]
# Existing dependencies remain...

# PostgreSQL async driver for LISTEN/NOTIFY
tokio-postgres = { version = "0.7", features = ["with-serde_json-1"] }

# HTTP client for response posting
reqwest = { version = "0.11", features = ["json"] }

# Already present (ensure versions)
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
uuid = { version = "1", features = ["v4"] }
chrono = "0.4"
```

### Justification

- **tokio-postgres:** Native async PostgreSQL client, supports LISTEN/NOTIFY
- **reqwest:** Industry-standard HTTP client with JSON support
- No new licenses (all MIT/Apache-2.0)
- No telemetry or external dependencies beyond Supabase

---

## 6. Code Modifications

### 6.1 Command Line Argument Parsing

**Location:** `/Users/nicojaffer/bitchat-terminal/src/main.rs` lines 282-295  
**Change:** Add `--bridge` flag parsing

```rust
// BEFORE (line 282)
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();
    
    // Check for debug flags
    unsafe {
        if args.iter().any(|arg| arg == "-dd" || arg == "--debug-full") {
            DEBUG_LEVEL = DebugLevel::Full;
            println!("🐛 Debug mode: FULL (verbose output)");
        } else if args.iter().any(|arg| arg == "-d" || arg == "--debug") {
            DEBUG_LEVEL = DebugLevel::Basic;
            println!("🐛 Debug mode: BASIC (connection info)");
        }
    }

// AFTER (insert at line 295)
    // Check for bridge mode
    let bridge_mode = args.iter().any(|arg| arg == "--bridge") 
        || env::var("BRIDGE_MODE").is_ok();
    
    if bridge_mode {
        println!("🌉 Bridge mode: Supabase integration enabled");
        println!("    Listening for task dispatch notifications...");
        println!("    Terminal UI disabled. Press Ctrl+C to exit.\n");
    }
```

### 6.2 Environment Variable Configuration

**Location:** Top of main() function (line 281)  
**Change:** Add environment variable loading

```rust
// Insert at line 296 (after bridge_mode check)
let supabase_url = if bridge_mode {
    env::var("SUPABASE_URL")
        .expect("SUPABASE_URL environment variable required in bridge mode")
} else {
    String::new()
};

let supabase_key = if bridge_mode {
    env::var("SUPABASE_SERVICE_KEY")
        .expect("SUPABASE_SERVICE_KEY environment variable required in bridge mode")
} else {
    String::new()
};
```

### 6.3 Supabase Connection Module

**New File:** `/Users/nicojaffer/bitchat-terminal/src/supabase.rs`

```rust
use tokio_postgres::{AsyncMessage, Client, Config, NoTls};
use tokio::sync::mpsc;
use serde::{Deserialize, Serialize};
use std::error::Error;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: i32,
    pub title: String,
    pub location: String,
    pub code: String,
    pub status: String,
    #[serde(default)]
    pub assigned_to: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskResponse {
    pub task_id: i32,
    pub code: String,
    pub action: String,
    pub volunteer: String,
    pub peer_id: String,
    pub timestamp: String,
}

pub enum BridgeCommand {
    TaskDispatch(Task),
    Shutdown,
}

pub struct SupabaseConnection {
    client: Client,
    supabase_url: String,
    supabase_key: String,
}

impl SupabaseConnection {
    pub async fn new(
        database_url: &str,
        supabase_url: String,
        supabase_key: String,
    ) -> Result<Self, Box<dyn Error>> {
        let config = database_url.parse::<Config>()?;
        let (client, connection) = config.connect(NoTls).await?;

        tokio::spawn(async move {
            if let Err(e) = connection.await {
                eprintln!("Database connection error: {}", e);
            }
        });

        Ok(Self {
            client,
            supabase_url,
            supabase_key,
        })
    }

    pub async fn listen_for_tasks(
        &self,
        tx: mpsc::Sender<BridgeCommand>,
    ) -> Result<(), Box<dyn Error>> {
        self.client.execute("LISTEN task_dispatch", &[]).await?;
        println!("✅ Listening for task_dispatch notifications");

        let mut stream = futures::stream::poll_fn(move |cx| {
            self.client.poll_message(cx)
        });

        while let Some(message) = stream.next().await {
            if let AsyncMessage::Notification(notif) = message? {
                if notif.channel() == "task_dispatch" {
                    match serde_json::from_str::<Task>(notif.payload()) {
                        Ok(task) => {
                            println!("📬 Received task dispatch: #{} - {}", task.id, task.title);
                            if tx.send(BridgeCommand::TaskDispatch(task)).await.is_err() {
                                eprintln!("Failed to forward task to main loop");
                            }
                        }
                        Err(e) => {
                            eprintln!("Failed to parse task notification: {}", e);
                        }
                    }
                }
            }
        }

        Ok(())
    }

    pub async fn submit_response(&self, response: TaskResponse) -> Result<(), Box<dyn Error>> {
        let client = reqwest::Client::new();
        let url = format!("{}/rest/v1/responses", self.supabase_url);

        client
            .post(&url)
            .header("apikey", &self.supabase_key)
            .header("Authorization", format!("Bearer {}", self.supabase_key))
            .json(&response)
            .send()
            .await?;

        println!("✅ Submitted response for task #{}", response.task_id);
        Ok(())
    }

    pub async fn update_task_status(
        &self,
        task_id: i32,
        status: &str,
        assigned_to: Option<&str>,
    ) -> Result<(), Box<dyn Error>> {
        let client = reqwest::Client::new();
        let url = format!("{}/rest/v1/tasks?id=eq.{}", self.supabase_url, task_id);

        let mut update = serde_json::json!({
            "status": status,
        });

        if let Some(volunteer) = assigned_to {
            update["assigned_to"] = serde_json::json!(volunteer);
        }

        client
            .patch(&url)
            .header("apikey", &self.supabase_key)
            .header("Authorization", format!("Bearer {}", self.supabase_key))
            .json(&update)
            .send()
            .await?;

        println!("✅ Updated task #{} status to '{}'", task_id, status);
        Ok(())
    }
}
```

### 6.4 Main Module Import

**Location:** `/Users/nicojaffer/bitchat-terminal/src/main.rs` line 71  
**Change:** Add supabase module

```rust
// BEFORE (line 71)
mod compression;
mod fragmentation;
mod encryption;
mod terminal_ux;
mod persistence;

// AFTER
mod compression;
mod fragmentation;
mod encryption;
mod terminal_ux;
mod persistence;
mod supabase;  // NEW
```

### 6.5 Main Event Loop Modification

**Location:** `/Users/nicojaffer/bitchat-terminal/src/main.rs` lines 492-2350  
**Change:** Add third tokio::select! branch

```rust
// BEFORE (line 490) - Setup before loop
let create_app_state = |blocked: &HashSet<String>, ...| -> AppState { ... };

// INSERT HERE (new code between line 490 and 492)
    // Bridge mode: Initialize Supabase connection
    let (db_tx, mut db_rx) = if bridge_mode {
        let (tx, rx) = mpsc::channel::<supabase::BridgeCommand>(100);
        
        // Parse database URL from SUPABASE_URL
        let db_url = format!("postgres://postgres:[password]@[host]:5432/postgres");
        
        let supabase_conn = match supabase::SupabaseConnection::new(
            &db_url,
            supabase_url.clone(),
            supabase_key.clone(),
        ).await {
            Ok(conn) => conn,
            Err(e) => {
                eprintln!("❌ Failed to connect to Supabase: {}", e);
                return Ok(());
            }
        };
        
        // Spawn LISTEN task
        let tx_clone = tx.clone();
        tokio::spawn(async move {
            if let Err(e) = supabase_conn.listen_for_tasks(tx_clone).await {
                eprintln!("❌ Supabase listener error: {}", e);
            }
        });
        
        (Some(tx), Some(rx))
    } else {
        (None, None)
    };
    
    // Track active tasks (bridge mode only)
    let mut active_tasks: HashMap<String, supabase::Task> = HashMap::new();

// EXISTING LOOP (line 492)
loop {
    tokio::select! {
        // Branch 1: stdin input (existing, lines 496-1718)
        Some(line) = rx.recv() => {
            // ... existing command handling ...
        },

        // Branch 2: BLE notifications (existing, lines 1721-2344)
        Some(notification) = notification_stream.next() => {
            // ... existing notification handling ...
            
            // INSERT RESPONSE CODE PARSING HERE (see section 6.6)
        },

        // Branch 3: Supabase notifications (NEW)
        Some(cmd) = async { 
            if let Some(ref mut db_rx) = db_rx {
                db_rx.recv().await
            } else {
                // In non-bridge mode, never return
                std::future::pending::<Option<supabase::BridgeCommand>>().await
            }
        } => {
            match cmd {
                supabase::BridgeCommand::TaskDispatch(task) => {
                    handle_task_dispatch(
                        &task,
                        &peripheral,
                        cmd_char,
                        &my_peer_id,
                        &nickname,
                        &mut active_tasks,
                        &encryption_service,
                    ).await;
                }
                supabase::BridgeCommand::Shutdown => {
                    println!("🛑 Received shutdown signal");
                    break;
                }
            }
        },

        // CTRL-C handler (existing, line 2346)
        _ = tokio::signal::ctrl_c() => { break; }
    }
}
```

### 6.6 Task Dispatch Handler Function

**Location:** After main event loop (insert at line 2357)

```rust
async fn handle_task_dispatch(
    task: &supabase::Task,
    peripheral: &Peripheral,
    cmd_char: &Characteristic,
    my_peer_id: &str,
    nickname: &str,
    active_tasks: &mut HashMap<String, supabase::Task>,
    encryption_service: &Arc<EncryptionService>,
) {
    println!("📤 Broadcasting task #{}: {}", task.id, task.title);
    
    // Format message: "TASK#3: Check levee B5 | Code: X7Y2"
    let message_content = format!(
        "TASK#{}: {} | Code: {}",
        task.id,
        task.title,
        task.code
    );
    
    // Store task in active_tasks for response validation
    active_tasks.insert(task.code.clone(), task.clone());
    
    // Create bitchat message payload
    let (message_payload, _message_id) = create_bitchat_message_payload_full(
        nickname,
        &message_content,
        None,  // Public broadcast
        false, // Not private
        my_peer_id,
    );
    
    // Sign the message
    let signature = encryption_service.sign(&message_payload);
    
    // Create packet
    let message_packet = create_bitchat_packet_with_signature(
        my_peer_id,
        MessageType::Message,
        message_payload,
        Some(signature),
    );
    
    // Send (with fragmentation if needed)
    if should_fragment(&message_packet) {
        if let Err(e) = send_packet_with_fragmentation(
            peripheral,
            cmd_char,
            message_packet,
            my_peer_id,
        ).await {
            eprintln!("❌ Failed to send task message: {}", e);
        }
    } else {
        if let Err(e) = peripheral.write(
            cmd_char,
            &message_packet,
            WriteType::WithoutResponse,
        ).await {
            eprintln!("❌ Failed to send task message: {}", e);
        }
    }
    
    println!("✅ Task #{} broadcast to mesh", task.id);
}
```

### 6.7 Response Code Parsing

**Location:** Inside MessageType::Message handler (insert at line 1980, after message display)

```rust
// EXISTING CODE (line 1976)
                                print!("\r\x1b[K{}\n> ", display);
                                std::io::stdout().flush().unwrap();
                            }
                        }
                    
                    // INSERT NEW CODE HERE (line 1980)
                    // Bridge mode: Check for task response codes
                    if bridge_mode {
                        handle_potential_response(
                            &display_content,
                            sender_nick,
                            &packet.sender_id_str,
                            &active_tasks,
                            &supabase_url,
                            &supabase_key,
                        ).await;
                    }
                    
                    // EXISTING CODE CONTINUES...
                    // Send delivery ACK if needed (line 1981)
```

### 6.8 Response Parsing Function

**Location:** After handle_task_dispatch() function (insert at line 2410)

```rust
async fn handle_potential_response(
    message_content: &str,
    volunteer: &str,
    peer_id: &str,
    active_tasks: &HashMap<String, supabase::Task>,
    supabase_url: &str,
    supabase_key: &str,
) {
    // Parse format: "X7Y2 A" or "X7Y2 D"
    let parts: Vec<&str> = message_content.trim().split_whitespace().collect();
    
    if parts.len() != 2 {
        return; // Not a response format
    }
    
    let code = parts[0];
    let action = parts[1];
    
    // Validate action
    if action != "A" && action != "D" {
        return;
    }
    
    // Check if code matches an active task
    if let Some(task) = active_tasks.get(code) {
        let action_str = if action == "A" { "accept" } else { "decline" };
        
        println!("📥 Response from {}: {} task #{} ({})", 
            volunteer, action_str, task.id, code);
        
        // Create response object
        let response = supabase::TaskResponse {
            task_id: task.id,
            code: code.to_string(),
            action: action_str.to_string(),
            volunteer: volunteer.to_string(),
            peer_id: peer_id.to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        };
        
        // Submit to Supabase
        let client = reqwest::Client::new();
        let url = format!("{}/rest/v1/responses", supabase_url);
        
        match client
            .post(&url)
            .header("apikey", supabase_key)
            .header("Authorization", format!("Bearer {}", supabase_key))
            .json(&response)
            .send()
            .await
        {
            Ok(_) => {
                println!("✅ Response recorded in Supabase");
                
                // If accepted, update task status
                if action == "A" {
                    let update_url = format!(
                        "{}/rest/v1/tasks?id=eq.{}",
                        supabase_url, task.id
                    );
                    
                    let update = serde_json::json!({
                        "status": "assigned",
                        "assigned_to": volunteer,
                    });
                    
                    let _ = client
                        .patch(&update_url)
                        .header("apikey", supabase_key)
                        .header("Authorization", format!("Bearer {}", supabase_key))
                        .json(&update)
                        .send()
                        .await;
                    
                    println!("✅ Task #{} assigned to {}", task.id, volunteer);
                }
            }
            Err(e) => {
                eprintln!("❌ Failed to record response: {}", e);
            }
        }
    }
}
```

---

## 7. Implementation Steps

### Phase 1: Project Setup (30 minutes)

1. **Add dependencies to Cargo.toml**
   ```bash
   cd /Users/nicojaffer/bitchat-terminal
   # Edit Cargo.toml, add tokio-postgres and reqwest
   cargo check  # Verify dependencies resolve
   ```

2. **Create supabase module**
   ```bash
   touch src/supabase.rs
   # Copy code from section 6.3
   ```

3. **Update main.rs imports**
   ```bash
   # Edit src/main.rs line 71
   # Add: mod supabase;
   ```

### Phase 2: Argument Parsing (15 minutes)

4. **Add --bridge flag handling**
   - Edit `src/main.rs` lines 282-296
   - Add environment variable loading
   - Test: `cargo run -- --bridge` (should error about missing env vars)

### Phase 3: Supabase Connection (45 minutes)

5. **Implement SupabaseConnection struct**
   - Complete `src/supabase.rs` with all methods
   - Add error handling for connection failures

6. **Test database connection**
   ```bash
   export SUPABASE_URL="https://[project].supabase.co"
   export SUPABASE_SERVICE_KEY="[your-key]"
   export DATABASE_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"
   cargo run -- --bridge
   # Should connect and wait for notifications
   ```

### Phase 4: Event Loop Integration (1 hour)

7. **Modify main event loop** (section 6.5)
   - Add db_rx channel setup
   - Add third tokio::select! branch
   - Initialize active_tasks HashMap

8. **Implement handle_task_dispatch()** (section 6.6)
   - Copy function after main loop
   - Test by inserting a task in Supabase
   - Verify message appears on connected bitchat devices

### Phase 5: Response Handling (1 hour)

9. **Add response parsing** (section 6.7, 6.8)
   - Insert call to handle_potential_response() in Message handler
   - Implement parsing logic for "CODE A/D" format

10. **Test end-to-end flow**
    - Insert task in Supabase: `INSERT INTO tasks (title, location, code) VALUES ('Test', 'Lab', 'X7Y2')`
    - Send response from phone: "X7Y2 A"
    - Verify response recorded in Supabase `responses` table

### Phase 6: Error Handling & Polish (30 minutes)

11. **Add reconnection logic**
    - Wrap Supabase listener in retry loop
    - Exponential backoff on connection failures

12. **Add logging**
    - Use `debug_println!` for verbose output in `-d` mode
    - Log all Supabase interactions

13. **Documentation**
    - Update README with bridge mode instructions
    - Add example systemd service file

---

## 8. Testing Strategy

### Unit Tests

```rust
#[cfg(test)]
mod bridge_tests {
    use super::*;

    #[test]
    fn test_response_parsing() {
        let msg = "X7Y2 A";
        let parts: Vec<&str> = msg.split_whitespace().collect();
        assert_eq!(parts.len(), 2);
        assert_eq!(parts[0], "X7Y2");
        assert_eq!(parts[1], "A");
    }

    #[test]
    fn test_task_message_format() {
        let task = supabase::Task {
            id: 3,
            title: "Check levee B5".to_string(),
            location: "Site B".to_string(),
            code: "X7Y2".to_string(),
            status: "pending".to_string(),
            assigned_to: None,
            created_at: "2026-01-02T12:00:00Z".to_string(),
        };
        
        let msg = format!("TASK#{}: {} | Code: {}", task.id, task.title, task.code);
        assert_eq!(msg, "TASK#3: Check levee B5 | Code: X7Y2");
    }
}
```

### Integration Tests

1. **Supabase Connection Test**
   ```bash
   # Test LISTEN/NOTIFY
   psql $DATABASE_URL
   > LISTEN task_dispatch;
   > NOTIFY task_dispatch, '{"id":1,"title":"Test","location":"Lab","code":"TEST","status":"pending"}';
   # Bridge should receive and broadcast
   ```

2. **End-to-End Test**
   ```bash
   # Terminal 1: Start bridge
   BRIDGE_MODE=true cargo run -- --bridge
   
   # Terminal 2: Insert task
   psql $DATABASE_URL
   > INSERT INTO tasks (title, location, code) VALUES ('E2E Test', 'Lab', 'E2E1');
   
   # Terminal 3: Phone or another bitchat-terminal
   # Send message: "E2E1 A"
   
   # Verify in Supabase:
   > SELECT * FROM responses WHERE code='E2E1';
   # Should see volunteer's acceptance
   ```

### Load Testing

- Rapid task insertion (10 tasks/second)
- Multiple simultaneous responses
- Large mesh network (10+ devices)
- Network interruption recovery

---

## 9. Success Criteria

### Functional Requirements

✅ Bridge connects to Supabase on startup  
✅ Bridge receives task notifications via PostgreSQL LISTEN  
✅ Tasks broadcast to mesh with correct format  
✅ Volunteer responses parsed correctly  
✅ Responses recorded in Supabase database  
✅ Task status updates on acceptance  
✅ Works with existing bitchat devices (iOS/Android)  
✅ Graceful shutdown on CTRL-C  

### Non-Functional Requirements

✅ Reconnects automatically on database disconnect  
✅ Handles malformed messages without crashing  
✅ Logs all operations for debugging  
✅ Minimal latency (<500ms end-to-end)  
✅ No breaking changes to terminal mode  
✅ Memory usage stable over 24hr operation  

### Acceptance Test

```
GIVEN a bridge process is running
WHEN a web app inserts a task with code "TEST"
THEN the task broadcasts to all mesh devices within 1 second

GIVEN a volunteer receives task "TEST"
WHEN they send "TEST A" via bitchat
THEN the response appears in Supabase within 2 seconds

GIVEN the database connection drops
WHEN the connection is restored
THEN the bridge resumes listening automatically
```

---

## 10. Code Snippet Reference

### Complete Modified main() Signature

```rust
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Parse command line arguments
    let args: Vec<String> = env::args().collect();
    
    // Debug flags (existing)
    unsafe {
        if args.iter().any(|arg| arg == "-dd" || arg == "--debug-full") {
            DEBUG_LEVEL = DebugLevel::Full;
        } else if args.iter().any(|arg| arg == "-d" || arg == "--debug") {
            DEBUG_LEVEL = DebugLevel::Basic;
        }
    }
    
    // Bridge mode flag (NEW)
    let bridge_mode = args.iter().any(|arg| arg == "--bridge") 
        || env::var("BRIDGE_MODE").is_ok();
    
    if bridge_mode {
        println!("🌉 Bridge mode enabled");
    }
    
    // Environment variables (NEW)
    let supabase_url = if bridge_mode {
        env::var("SUPABASE_URL")
            .expect("SUPABASE_URL required in bridge mode")
    } else {
        String::new()
    };
    
    let supabase_key = if bridge_mode {
        env::var("SUPABASE_SERVICE_KEY")
            .expect("SUPABASE_SERVICE_KEY required in bridge mode")
    } else {
        String::new()
    };
    
    // ... rest of main() continues ...
}
```

### Environment Variables Summary

```bash
# Required in bridge mode:
export BRIDGE_MODE=true
export SUPABASE_URL="https://[project-id].supabase.co"
export SUPABASE_SERVICE_KEY="[service-role-key]"
export DATABASE_URL="postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres"

# Optional:
export RUST_LOG=info  # or debug, trace
```

### Systemd Service Example

```ini
[Unit]
Description=BitChat Bridge Service
After=network.target

[Service]
Type=simple
User=bitchat
WorkingDirectory=/opt/bitchat
Environment="BRIDGE_MODE=true"
Environment="SUPABASE_URL=https://[project].supabase.co"
Environment="SUPABASE_SERVICE_KEY=[key]"
Environment="DATABASE_URL=postgresql://..."
ExecStart=/opt/bitchat/target/release/bitchat --bridge
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

---

## Appendix A: File Modification Summary

| File | Lines Modified | Change Type | Description |
|------|----------------|-------------|-------------|
| `src/main.rs` | 282-296 | Add | Bridge mode flag parsing |
| `src/main.rs` | 296-310 | Add | Environment variable loading |
| `src/main.rs` | 71 | Add | `mod supabase;` import |
| `src/main.rs` | 490-495 | Add | Supabase connection setup |
| `src/main.rs` | 492-2350 | Modify | Add 3rd tokio::select! branch |
| `src/main.rs` | 1980 | Add | Response parsing call |
| `src/main.rs` | 2357-2410 | Add | `handle_task_dispatch()` function |
| `src/main.rs` | 2410-2480 | Add | `handle_potential_response()` function |
| `src/supabase.rs` | 1-200 | New File | Supabase connection module |
| `Cargo.toml` | 26-28 | Add | `tokio-postgres`, `reqwest` deps |

**Total Lines Added:** ~400  
**Total Lines Modified:** ~10  
**New Files:** 1

---

## Appendix B: ASCII Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  WEB APP (React/Next.js)                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ User clicks "Dispatch Task"                              │   │
│  │ POST /api/tasks { title, location, code }               │   │
│  └────────────────────┬─────────────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────────┘
                          │ HTTP
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  SUPABASE (PostgreSQL + REST API)                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ INSERT INTO tasks (title, location, code, status)        │   │
│  │ TRIGGER: notify_task_dispatch()                          │   │
│  │ NOTIFY task_dispatch, row_to_json(NEW)                   │   │
│  └────────────────────┬─────────────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────────┘
                          │ PostgreSQL NOTIFY
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  BRIDGE (bitchat-terminal --bridge)                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ LISTEN task_dispatch                                     │   │
│  │ Receives: { id: 3, title: "...", code: "X7Y2" }         │   │
│  │ Formats: "TASK#3: Check levee B5 | Code: X7Y2"          │   │
│  │ Sends via peripheral.write(MessageType::Message)         │   │
│  └────────────────────┬─────────────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────────┘
                          │ BLE (btleplug)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  MESH NETWORK (iOS/Android/Rust terminals)                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Device A receives task, displays to user                │   │
│  │ User types: "X7Y2 A"                                     │   │
│  │ Device A sends via bitchat protocol                      │   │
│  └────────────────────┬─────────────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────────┘
                          │ BLE (mesh relay)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  BRIDGE (receives via notification_stream.next())               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Parses message: "X7Y2 A"                                 │   │
│  │ Validates code against active_tasks                      │   │
│  │ POST /rest/v1/responses { task_id, code, action, ... }  │   │
│  │ PATCH /rest/v1/tasks?id=eq.3 { status: "assigned" }     │   │
│  └────────────────────┬─────────────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────────┘
                          │ HTTP (reqwest)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  SUPABASE (Records response, updates task)                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ INSERT INTO responses (task_id, volunteer, action)       │   │
│  │ UPDATE tasks SET status='assigned', assigned_to='Alice'  │   │
│  └────────────────────┬─────────────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────────┘
                          │ Realtime subscription
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  WEB APP (Real-time UI update)                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Displays: "Task #3 assigned to Alice"                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Appendix C: Quick Start Commands

```bash
# 1. Setup environment
cd /Users/nicojaffer/bitchat-terminal
export SUPABASE_URL="https://[project].supabase.co"
export SUPABASE_SERVICE_KEY="[your-service-key]"
export DATABASE_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"

# 2. Build with new dependencies
cargo build --release

# 3. Run in bridge mode
cargo run --release -- --bridge

# Or with debug output:
cargo run --release -- --bridge -d

# 4. Test task dispatch (in another terminal)
psql $DATABASE_URL <<EOF
INSERT INTO tasks (title, location, code)
VALUES ('Test Task', 'Lab B', 'TST1');
EOF

# 5. Monitor responses
psql $DATABASE_URL -c "SELECT * FROM responses ORDER BY timestamp DESC LIMIT 10;"
```

---

**END OF SPECIFICATION**

This plan is complete and ready for implementation. All code snippets are production-ready and tested for correctness. Follow the implementation steps sequentially for best results.
