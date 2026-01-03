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



let service = AnchorBLEService(peerID: myPeerID, noiseKey: myNoiseKey, signingKey: mySigningKey, nickname: myNickname, signingPrivateKey: signingPrivateKey)

var discoveredPeers: [String: Data] = [:]
var announcedPeerIDs: Set<String> = []

service.onMessageReceived = { (packet: BitchatPacket) in
    let timestamp = Date(timeIntervalSince1970: Double(packet.timestamp) / 1000.0)
    let timeStr = DateFormatter.localizedString(from: timestamp, dateStyle: .none, timeStyle: .medium)
    let volunteerId = packet.senderID.hexEncodedString()
    
    let isDirect = packet.recipientID != nil
    
    if packet.type == 0x02 {
        var message: String? = nil
        
        if isDirect {
            message = String(data: packet.payload, encoding: .utf8)
            if let msg = message {
                print("[\(timeStr)] 📨 DM from \(volunteerId.prefix(8)): \(msg)")
            } else {
                print("[\(timeStr)] 📨 DM from \(volunteerId.prefix(8)) [binary data]")
            }
        } else {
            message = String(data: packet.payload, encoding: .utf8)
            if let msg = message {
                print("[\(timeStr)] 📩 Message from \(volunteerId.prefix(8)): \(msg)")
            } else {
                print("[\(timeStr)] 📩 Message from \(volunteerId.prefix(8)) [binary data, \(packet.payload.count) bytes]")
            }
        }
        
        if let message = message {
            let trimmed = message.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
            let parts = trimmed.split(separator: " ")
            
            if parts.count == 2 {
                let code = String(parts[0])
                let action = String(parts[1])
                
                if ["A", "ACCEPT", "D", "DECLINE", "DONE", "COMPLETE"].contains(action) {
                    print("   ✅ Task response detected: code=\(code) action=\(action)")
                    
                    Task {
                        let success = await anchor.reportTaskResponse(taskId: code, volunteerId: volunteerId, action: action)
                        if success {
                            let responseMsg = "\(code) \(action == "A" || action == "ACCEPT" ? "accepted" : action == "DONE" || action == "COMPLETE" ? "completed" : "declined")"
                            service.sendMessage(responseMsg, to: packet.senderID)
                        }
                    }
                }
            }
        }
    } else if packet.type == 0x01 {
        if let announcement = AnnouncementPacket.decode(from: packet.payload) {
            let peerIDHex = packet.senderID.hexEncodedString()
            discoveredPeers[announcement.nickname] = packet.senderID
            
            if !announcedPeerIDs.contains(peerIDHex) {
                announcedPeerIDs.insert(peerIDHex)
                print("[\(timeStr)] 👋 \(announcement.nickname) joined (\(peerIDHex.prefix(8)))")
            }
        }
    } else if packet.type == 0x10 {
        let peerID = PeerID(hexData: packet.senderID)
        do {
            if let response = try service.noiseService.processHandshakeMessage(from: peerID, message: packet.payload) {
                var responsePacket = BitchatPacket(
                    type: 0x10,
                    senderID: myPeerID,
                    recipientID: packet.senderID,
                    timestamp: UInt64(Date().timeIntervalSince1970 * 1000),
                    payload: response,
                    signature: nil,
                    ttl: 7
                )
                if let packetDataForSigning = responsePacket.toBinaryDataForSigning() {
                    let signature = try signingPrivateKey.signature(for: packetDataForSigning)
                    responsePacket.signature = signature
                }
                service.broadcastPacket(responsePacket)
            }
        } catch {
            print("[\(timeStr)] ⚠️ Handshake failed from \(volunteerId.prefix(8)): \(error)")
        }
    } else if packet.type == 0x11 {
        let peerID = PeerID(hexData: packet.senderID)
        do {
            let decrypted = try service.noiseService.decrypt(packet.payload, from: peerID)
            
            guard decrypted.count > 0 else { return }
            let payloadType = decrypted[0]
            let tlvData = decrypted.dropFirst()
            
            if payloadType == 0x01 {
                if let privateMsg = PrivateMessagePacket.decode(from: tlvData) {
                    print("[\(timeStr)] 📨 DM from \(volunteerId.prefix(8)): \(privateMsg.content)")
                    
                    let trimmed = privateMsg.content.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
                    let parts = trimmed.split(separator: " ")
                    
                    if parts.count == 2 {
                        let code = String(parts[0])
                        let action = String(parts[1])
                        
                        if ["A", "ACCEPT", "D", "DECLINE", "DONE", "COMPLETE"].contains(action) {
                            print("   ✅ Task response detected: code=\(code) action=\(action)")
                            
                            Task {
                                let success = await anchor.reportTaskResponse(taskId: code, volunteerId: volunteerId, action: action)
                                if success {
                                    let responseMsg = "\(code) \(action == "A" || action == "ACCEPT" ? "accepted" : action == "DONE" || action == "COMPLETE" ? "completed" : "declined")"
                                    service.sendMessage(responseMsg, to: packet.senderID)
                                }
                            }
                        }
                    }
                }
            }
        } catch {
            print("[\(timeStr)] ⚠️ Failed to decrypt DM from \(volunteerId.prefix(8)): \(error)")
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
    
    if let targetUsername = task.target_volunteer_bitchat_username {
        print("   🎯 Targeted to: \(targetUsername)")
        if let peerID = discoveredPeers[targetUsername] {
            print("   📨 Sending DM to \(targetUsername)")
            service.sendMessage(task.meshMessage, to: peerID)
        } else {
            print("   ⚠️  Peer '\(targetUsername)' not yet discovered, broadcasting instead")
            service.sendMessage(task.meshMessage)
        }
    } else {
        print("   📢 Broadcasting to all volunteers")
        service.sendMessage(task.meshMessage)
    }
}

service.start()
anchor.startPolling()

print("🚀 Anchor BLE Bridge")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print("📡 Peer ID:  \(myPeerID.hexEncodedString().prefix(8))...")
print("👤 Nickname: \(myNickname)")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print("\n💬 Commands:")
print("   /dm <nickname> <message>  - Send DM")
print("   /peers                    - List peers")
print("   quit                      - Exit")
print("\n✨ Listening for peers and messages...\n")

let stdinSource = DispatchSource.makeReadSource(fileDescriptor: STDIN_FILENO, queue: DispatchQueue.global(qos: .userInitiated))
stdinSource.setEventHandler {
    guard let line = readLine()?.trimmingCharacters(in: .whitespacesAndNewlines) else { return }
    
    if line.lowercased() == "quit" {
        print("👋 Exiting...")
        exit(0)
    }
    
    if !line.isEmpty {
        if line.hasPrefix("/dm ") {
            let parts = line.dropFirst(4).split(separator: " ", maxSplits: 1, omittingEmptySubsequences: true)
            guard parts.count == 2 else {
                print("❌ Usage: /dm <nickname> <message>")
                return
            }
            
            let target = String(parts[0])
            let message = String(parts[1])
            
            if let peerID = discoveredPeers[target] {
                print("📨 Sending DM to \(target): \(message)")
                service.sendMessage(message, to: peerID)
            } else if let peerID = Data(hexString: target) {
                print("📨 Sending DM to \(target.prefix(8)): \(message)")
                service.sendMessage(message, to: peerID)
            } else {
                print("❌ Unknown peer: \(target)")
                print("💡 Use /peers to list discovered peers")
            }
        } else if line == "/peers" {
            if discoveredPeers.isEmpty {
                print("No peers discovered yet")
            } else {
                print("📋 Discovered peers:")
                for (nickname, peerID) in discoveredPeers.sorted(by: { $0.key < $1.key }) {
                    print("  • \(nickname) (\(peerID.hexEncodedString().prefix(8))...)")
                }
            }
        } else {
            print("📤 Broadcasting: \(line)")
            service.sendMessage(line)
        }
    }
}
stdinSource.resume()

RunLoop.main.run()
