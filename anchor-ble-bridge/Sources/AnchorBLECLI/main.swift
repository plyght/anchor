import Foundation
import AnchorBLEBridge
import CryptoKit

let signingPrivateKey = Curve25519.Signing.PrivateKey()
let mySigningKey = signingPrivateKey.publicKey.rawRepresentation

let myNoiseKey = Data((0..<32).map { _ in UInt8.random(in: 0...255) })

let peerIDString = myNoiseKey.sha256Fingerprint().prefix(16)
guard let myPeerID = Data(hexString: String(peerIDString)) else {
    fatalError("Failed to create peer ID")
}

let myNickname = "anchor-alerts"

print("🔑 Noise key SHA256: \(myNoiseKey.sha256Fingerprint())")
print("🆔 Derived peer ID:  \(peerIDString)")
print("✅ Peer ID matches:  \(myPeerID.hexEncodedString() == peerIDString)")

let service = AnchorBLEService(peerID: myPeerID, noiseKey: myNoiseKey, signingKey: mySigningKey, nickname: myNickname, signingPrivateKey: signingPrivateKey)

service.onMessageReceived = { (packet: BitchatPacket) in
    let timestamp = Date(timeIntervalSince1970: Double(packet.timestamp) / 1000.0)
    let timeStr = DateFormatter.localizedString(from: timestamp, dateStyle: .none, timeStyle: .medium)
    let volunteerId = packet.senderID.hexEncodedString()
    
    let isDirect = packet.recipientID != nil
    let prefix = isDirect ? "📨 DM" : "📩 Message"
    
    if packet.type == 0x02 {
        if let message = String(data: packet.payload, encoding: .utf8) {
            print("[\(timeStr)] \(prefix) from \(volunteerId.prefix(8)): \(message)")
            
            let trimmed = message.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
            let parts = trimmed.split(separator: " ")
            
            if parts.count == 2 {
                let code = String(parts[0])
                let action = String(parts[1])
                
                if ["A", "ACCEPT", "D", "DECLINE", "DONE", "COMPLETE"].contains(action) {
                    print("   ✅ Task response detected: code=\(code) action=\(action)")
                    
                    Task {
                        await anchor.reportTaskResponse(taskId: code, volunteerId: volunteerId, action: action)
                    }
                }
            }
        } else {
            print("[\(timeStr)] 📩 Message from \(volunteerId.prefix(8)) [binary data, \(packet.payload.count) bytes]")
        }
    } else if packet.type == 0x01 {
        if let announcement = AnnouncementPacket.decode(from: packet.payload) {
            print("[\(timeStr)] 👋 \(announcement.nickname) announced (\(packet.senderID.hexEncodedString().prefix(8)))")
        } else {
            print("[\(timeStr)] 👋 Peer announced (failed to decode): \(packet.senderID.hexEncodedString().prefix(8)) | payload: \(packet.payload.count) bytes")
        }
    } else if packet.type == 0x03 {
        print("[\(timeStr)] 👋 \(packet.senderID.hexEncodedString().prefix(8)) left")
    } else if packet.type == 0x20 {
        // Fragment packet - ignore
    } else {
        print("[\(timeStr)] ⚠️ Unknown packet type 0x\(String(format: "%02X", packet.type)) from \(packet.senderID.hexEncodedString().prefix(8))")
    }
}

let anchorBackendURL = ProcessInfo.processInfo.environment["ANCHOR_BACKEND_URL"] ?? "http://localhost:8000"
let anchor = AnchorIntegration(backendURL: anchorBackendURL)

anchor.onTaskReceived = { task in
    print("\n🚨 NEW TASK: \(task.title)")
    print("   \(task.description)")
    print("   Code: \(task.acceptance_code)")
    
    if let targetVolunteer = task.target_volunteer_id {
        print("   🎯 Targeted to: \(targetVolunteer.prefix(8))")
        service.sendMessage(task.meshMessage, to: task.recipientPeerID)
    } else {
        print("   📢 Broadcasting to all volunteers")
        service.sendMessage(task.meshMessage)
    }
}

service.start()
anchor.startPolling()

print("🚀 Anchor BLE Bridge started")
print("📡 Peer ID: \(myPeerID.hexEncodedString())")
print("👤 Nickname: \(myNickname)")
print("\n✨ Waiting for bitchat peers...")
print("💡 Open bitchat iOS app nearby to test connection")
print("\nType a message and press Enter to send, or 'quit' to exit\n")

let stdinSource = DispatchSource.makeReadSource(fileDescriptor: STDIN_FILENO, queue: DispatchQueue.global(qos: .userInitiated))
stdinSource.setEventHandler {
    guard let line = readLine()?.trimmingCharacters(in: .whitespacesAndNewlines) else { return }
    
    if line.lowercased() == "quit" {
        print("👋 Exiting...")
        exit(0)
    }
    
    if !line.isEmpty {
        print("📤 Sending: \(line)")
        service.sendMessage(line)
    }
}
stdinSource.resume()

RunLoop.main.run()
