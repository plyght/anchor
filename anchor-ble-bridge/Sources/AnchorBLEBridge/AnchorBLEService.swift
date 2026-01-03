import Foundation
import CoreBluetooth
import CryptoKit

public class AnchorBLEService: NSObject {
    
    static let serviceUUID = CBUUID(string: "F47B5E2D-4A9E-4C5A-9B3F-8E1D2C3A4B5C")
    static let characteristicUUID = CBUUID(string: "A1B2C3D4-E5F6-4A5B-8C9D-0E1F2A3B4C5D")
    
    private var centralManager: CBCentralManager?
    private var peripheralManager: CBPeripheralManager?
    private var characteristic: CBMutableCharacteristic?
    
    private var connectedPeripherals: [CBPeripheral] = []
    private var subscribedCentrals: [CBCentral] = []
    
    private let queue = DispatchQueue(label: "com.anchor.ble", qos: .userInitiated)
    
    public var myPeerID: Data
    public var myNoiseKey: Data
    public var mySigningKey: Data
    public var myNickname: String
    public var signingPrivateKey: Curve25519.Signing.PrivateKey
    public var onMessageReceived: ((BitchatPacket) -> Void)?
    
    public let noiseService: NoiseEncryptionService
    private var pendingDMs: [PeerID: [(content: String, messageID: String)]] = [:]
    
    public init(peerID: Data, noiseKey: Data, signingKey: Data, nickname: String, signingPrivateKey: Curve25519.Signing.PrivateKey) {
        self.myPeerID = peerID
        self.myNoiseKey = noiseKey
        self.mySigningKey = signingKey
        self.myNickname = nickname
        self.signingPrivateKey = signingPrivateKey
        self.noiseService = NoiseEncryptionService()
        super.init()
        
        centralManager = CBCentralManager(delegate: self, queue: queue)
        peripheralManager = CBPeripheralManager(delegate: self, queue: queue)
        
        noiseService.onHandshakeRequired = { [weak self] peerID in
            guard let self = self else { return }
            do {
                let handshakeData = try self.noiseService.initiateHandshake(with: peerID)
                var packet = BitchatPacket(
                    type: 0x10,
                    senderID: self.myPeerID,
                    recipientID: Data(hexString: peerID.id),
                    timestamp: UInt64(Date().timeIntervalSince1970 * 1000),
                    payload: handshakeData,
                    signature: nil,
                    ttl: 7
                )
                if let packetDataForSigning = packet.toBinaryDataForSigning() {
                    let signature = try self.signingPrivateKey.signature(for: packetDataForSigning)
                    packet.signature = signature
                }
                self.broadcastPacket(packet)
            } catch {
                SecureLogger.error("Failed to initiate handshake: \(error)", category: .bluetooth)
            }
        }
        
        noiseService.onSessionEstablished = { [weak self] peerID in
            guard let self = self, let messages = self.pendingDMs[peerID] else { return }
            for (content, _) in messages {
                self.sendPrivateMessage(content, to: Data(hexString: peerID.id) ?? Data())
            }
            self.pendingDMs.removeValue(forKey: peerID)
        }
    }
    
    public func start() {
        queue.asyncAfter(deadline: .now() + 2.0) { [weak self] in
            self?.sendAnnounce()
        }
    }
    
    private func sendAnnounce() {
        let announcement = AnnouncementPacket(
            nickname: myNickname,
            noisePublicKey: myNoiseKey,
            signingPublicKey: mySigningKey,
            directNeighbors: []
        )
        
        guard let payload = announcement.encode() else {
            SecureLogger.error("Failed to encode announcement", category: .bluetooth)
            return
        }
        
        let derivedPeerID = myNoiseKey.sha256Fingerprint().prefix(16)
        let actualPeerID = myPeerID.hexEncodedString()
        
        if derivedPeerID != actualPeerID {
            SecureLogger.error("⚠️ PEER ID MISMATCH! Derived: \(derivedPeerID) vs Actual: \(actualPeerID)", category: .bluetooth)
        }
        
        var packet = BitchatPacket(
            type: 0x01,
            senderID: myPeerID,
            recipientID: nil,
            timestamp: UInt64(Date().timeIntervalSince1970 * 1000),
            payload: payload,
            signature: nil,
            ttl: 7
        )
        
        if let packetDataForSigning = packet.toBinaryDataForSigning() {
            do {
                let signature = try signingPrivateKey.signature(for: packetDataForSigning)
                packet.signature = signature
            } catch {
                SecureLogger.error("Failed to sign announce: \(error)", category: .bluetooth)
            }
        }
        
        broadcastPacket(packet)
        
        queue.asyncAfter(deadline: .now() + 30.0) { [weak self] in
            self?.sendAnnounce()
        }
    }
    
    public func sendMessage(_ content: String, to recipientPeerID: Data? = nil) {
        if let recipientPeerID = recipientPeerID {
            sendPrivateMessage(content, to: recipientPeerID)
        } else {
            sendBroadcastMessage(content)
        }
    }
    
    private func sendBroadcastMessage(_ content: String) {
        let payload = Data(content.utf8)
        
        var packet = BitchatPacket(
            type: 0x02,
            senderID: myPeerID,
            recipientID: nil,
            timestamp: UInt64(Date().timeIntervalSince1970 * 1000),
            payload: payload,
            signature: nil,
            ttl: 7
        )
        
        if let packetDataForSigning = packet.toBinaryDataForSigning() {
            do {
                let signature = try signingPrivateKey.signature(for: packetDataForSigning)
                packet.signature = signature
            } catch {
                SecureLogger.error("Failed to sign message: \(error)", category: .bluetooth)
            }
        }
        
        broadcastPacket(packet)
    }
    
    private func sendPrivateMessage(_ content: String, to recipientPeerID: Data) {
        let peerID = PeerID(hexData: recipientPeerID)
        
        let messageID = UUID().uuidString
        
        if !noiseService.hasEstablishedSession(with: peerID) {
            if pendingDMs[peerID] == nil {
                pendingDMs[peerID] = []
            }
            pendingDMs[peerID]?.append((content: content, messageID: messageID))
            initiateHandshakeIfNeeded(with: peerID)
            return
        }
        
        let privateMessage = PrivateMessagePacket(messageID: messageID, content: content)
        guard let tlvData = privateMessage.encode() else {
            SecureLogger.error("Failed to encode private message TLV", category: .bluetooth)
            return
        }
        
        var messagePayload = Data([0x01])
        messagePayload.append(tlvData)
        
        do {
            let encrypted = try noiseService.encrypt(messagePayload, for: peerID)
            
            var packet = BitchatPacket(
                type: 0x11,
                senderID: myPeerID,
                recipientID: recipientPeerID,
                timestamp: UInt64(Date().timeIntervalSince1970 * 1000),
                payload: encrypted,
                signature: nil,
                ttl: 7
            )
            
            if let packetDataForSigning = packet.toBinaryDataForSigning() {
                let signature = try signingPrivateKey.signature(for: packetDataForSigning)
                packet.signature = signature
            }
            
            broadcastPacket(packet)
        } catch {
            SecureLogger.error("Failed to encrypt DM: \(error)", category: .bluetooth)
        }
    }
    
    private func initiateHandshakeIfNeeded(with peerID: PeerID) {
        guard !noiseService.hasEstablishedSession(with: peerID) else { return }
        
        do {
            let handshakeData = try noiseService.initiateHandshake(with: peerID)
            
            var packet = BitchatPacket(
                type: 0x10,
                senderID: myPeerID,
                recipientID: Data(hexString: peerID.id),
                timestamp: UInt64(Date().timeIntervalSince1970 * 1000),
                payload: handshakeData,
                signature: nil,
                ttl: 7
            )
            
            if let packetDataForSigning = packet.toBinaryDataForSigning() {
                let signature = try signingPrivateKey.signature(for: packetDataForSigning)
                packet.signature = signature
            }
            
            broadcastPacket(packet)
        } catch {
            SecureLogger.error("Failed to initiate handshake: \(error)", category: .bluetooth)
        }
    }
    
    private func sendPendingDMs(to peerID: PeerID) {
        guard let messages = pendingDMs[peerID], !messages.isEmpty else { return }
        
        for (content, _) in messages {
            sendPrivateMessage(content, to: Data(hexString: peerID.id) ?? Data())
        }
        
        pendingDMs.removeValue(forKey: peerID)
    }
    
    public func broadcastPacket(_ packet: BitchatPacket) {
        guard let data = packet.toBinaryData(padding: false) else {
            SecureLogger.error("Failed to encode packet", category: .bluetooth)
            return
        }
        
        for peripheral in connectedPeripherals {
            guard peripheral.state == .connected else { continue }
            if let service = peripheral.services?.first(where: { $0.uuid == Self.serviceUUID }),
               let char = service.characteristics?.first(where: { $0.uuid == Self.characteristicUUID }) {
                peripheral.writeValue(data, for: char, type: .withoutResponse)
            }
        }
        
        if let char = characteristic, !subscribedCentrals.isEmpty {
            peripheralManager?.updateValue(data, for: char, onSubscribedCentrals: nil)
        }
    }
    
    private func setupPeripheral() {
        let char = CBMutableCharacteristic(
            type: Self.characteristicUUID,
            properties: [.read, .write, .writeWithoutResponse, .notify],
            value: nil,
            permissions: [.readable, .writeable]
        )
        
        let service = CBMutableService(type: Self.serviceUUID, primary: true)
        service.characteristics = [char]
        
        peripheralManager?.add(service)
        self.characteristic = char
        
    }
    
    private func startAdvertising() {
        guard let peripheralManager = peripheralManager, peripheralManager.state == .poweredOn else {
            return
        }
        
        peripheralManager.startAdvertising([CBAdvertisementDataServiceUUIDsKey: [Self.serviceUUID]])
    }
    
    private func startScanning() {
        centralManager?.scanForPeripherals(
            withServices: nil,
            options: [CBCentralManagerScanOptionAllowDuplicatesKey: false]
        )
    }
}

extension AnchorBLEService: CBCentralManagerDelegate {
    public func centralManagerDidUpdateState(_ central: CBCentralManager) {
        
        if central.state == .poweredOn {
            startScanning()
        }
    }
    
    public func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String : Any], rssi RSSI: NSNumber) {
        let serviceUUIDs = advertisementData[CBAdvertisementDataServiceUUIDsKey] as? [CBUUID] ?? []
        let hasOurService = serviceUUIDs.contains(Self.serviceUUID)
        
        guard hasOurService else {
            return
        }
        
        guard !connectedPeripherals.contains(peripheral) else {
            return
        }
        
        peripheral.delegate = self
        connectedPeripherals.append(peripheral)
        central.connect(peripheral, options: nil)
    }
    
    public func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        peripheral.discoverServices([Self.serviceUUID])
    }
    
    public func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        if let error = error {
            SecureLogger.error("Error updating notification state on \(peripheral.name ?? "?"): \(error.localizedDescription)", category: .bluetooth)
        }
        connectedPeripherals.removeAll { $0 == peripheral }
        
        centralManager?.scanForPeripherals(withServices: [Self.serviceUUID], options: [CBCentralManagerScanOptionAllowDuplicatesKey: false])
    }
    
    public func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        SecureLogger.error("Failed to connect to \(peripheral.name ?? "Unknown"): \(error?.localizedDescription ?? "unknown error")", category: .bluetooth)
        connectedPeripherals.removeAll { $0 == peripheral }
    }
}

extension AnchorBLEService: CBPeripheralManagerDelegate {
    public func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
        
        if peripheral.state == .poweredOn {
            setupPeripheral()
            startAdvertising()
        }
    }
    
    public func peripheralManager(_ peripheral: CBPeripheralManager, didAdd service: CBService, error: Error?) {
        if let error = error {
            SecureLogger.error("Error adding service: \(error.localizedDescription)", category: .bluetooth)
            return
        }
    }
    
    public func peripheralManager(_ peripheral: CBPeripheralManager, central: CBCentral, didSubscribeTo characteristic: CBCharacteristic) {
        subscribedCentrals.append(central)
        
        queue.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            self?.sendAnnounce()
        }
    }
    
    public func peripheralManager(_ peripheral: CBPeripheralManager, central: CBCentral, didUnsubscribeFrom characteristic: CBCharacteristic) {
        subscribedCentrals.removeAll { $0 == central }
    }
    
    public func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveWrite requests: [CBATTRequest]) {
        for request in requests {
            guard let data = request.value else { continue }
            
            if let packet = BitchatPacket.from(data) {
                onMessageReceived?(packet)
            }
            
            peripheral.respond(to: request, withResult: .success)
        }
    }
    
    public func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveRead request: CBATTRequest) {
        if request.characteristic.uuid == Self.characteristicUUID {
            request.value = myPeerID
            peripheral.respond(to: request, withResult: .success)
        } else {
            peripheral.respond(to: request, withResult: .attributeNotFound)
        }
    }
}

extension AnchorBLEService: CBPeripheralDelegate {
    public func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        if let error = error {
            SecureLogger.error("Error discovering services on \(peripheral.name ?? "?"): \(error.localizedDescription)", category: .bluetooth)
            return
        }
        
        guard let service = peripheral.services?.first(where: { $0.uuid == Self.serviceUUID }) else {
            SecureLogger.warning("Service not found on \(peripheral.name ?? "?")", category: .bluetooth)
            return
        }
        
        peripheral.discoverCharacteristics([Self.characteristicUUID], for: service)
    }
    
    public func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        if let error = error {
            SecureLogger.error("Error discovering characteristics: \(error.localizedDescription)", category: .bluetooth)
            return
        }
        
        guard let char = service.characteristics?.first(where: { $0.uuid == Self.characteristicUUID }) else {
            return
        }
        
        if char.properties.contains(.notify) {
            peripheral.setNotifyValue(true, for: char)
        }
    }
    
    public func peripheral(_ peripheral: CBPeripheral, didUpdateNotificationStateFor characteristic: CBCharacteristic, error: Error?) {
        if let error = error {
            SecureLogger.error("Error updating notification state on \(peripheral.name ?? "?"): \(error.localizedDescription)", category: .bluetooth)
        }
    }
    
    public func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        if let error = error {
            SecureLogger.error("Error receiving notification: \(error.localizedDescription)", category: .bluetooth)
            return
        }
        
        guard let data = characteristic.value, !data.isEmpty else { return }
        
        if let packet = BitchatPacket.from(data) {
            onMessageReceived?(packet)
        }
    }
}
