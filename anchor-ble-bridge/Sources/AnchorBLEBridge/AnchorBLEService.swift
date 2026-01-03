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
    
    public init(peerID: Data, noiseKey: Data, signingKey: Data, nickname: String, signingPrivateKey: Curve25519.Signing.PrivateKey) {
        self.myPeerID = peerID
        self.myNoiseKey = noiseKey
        self.mySigningKey = signingKey
        self.myNickname = nickname
        self.signingPrivateKey = signingPrivateKey
        super.init()
        
        centralManager = CBCentralManager(delegate: self, queue: queue)
        peripheralManager = CBPeripheralManager(delegate: self, queue: queue)
    }
    
    public func start() {
        SecureLogger.info("Starting Anchor BLE service", category: .bluetooth)
        
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
                SecureLogger.info("✅ Signed announce packet (\(signature.count) bytes)", category: .bluetooth)
            } catch {
                SecureLogger.error("Failed to sign announce: \(error)", category: .bluetooth)
            }
        }
        
        SecureLogger.info("📢 Announce: nickname=\(myNickname) peerID=\(actualPeerID.prefix(8)) to \(connectedPeripherals.count)p+\(subscribedCentrals.count)c", category: .bluetooth)
        broadcastPacket(packet)
        
        queue.asyncAfter(deadline: .now() + 30.0) { [weak self] in
            self?.sendAnnounce()
        }
    }
    
    public func sendMessage(_ content: String) {
        let packet = BitchatPacket(
            type: 0x02,
            senderID: myPeerID,
            recipientID: nil,
            timestamp: UInt64(Date().timeIntervalSince1970 * 1000),
            payload: Data(content.utf8),
            signature: nil,
            ttl: 7
        )
        
        broadcastPacket(packet)
    }
    
    private func broadcastPacket(_ packet: BitchatPacket) {
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
        
        SecureLogger.info("BLE peripheral setup complete", category: .bluetooth)
    }
    
    private func startAdvertising() {
        let advertisementData: [String: Any] = [
            CBAdvertisementDataServiceUUIDsKey: [Self.serviceUUID],
            CBAdvertisementDataLocalNameKey: "Anchor"
        ]
        peripheralManager?.startAdvertising(advertisementData)
        SecureLogger.info("Started BLE advertising", category: .bluetooth)
    }
    
    private func startScanning() {
        centralManager?.scanForPeripherals(
            withServices: nil,
            options: [CBCentralManagerScanOptionAllowDuplicatesKey: false]
        )
        SecureLogger.info("Started BLE scanning", category: .bluetooth)
    }
}

extension AnchorBLEService: CBCentralManagerDelegate {
    public func centralManagerDidUpdateState(_ central: CBCentralManager) {
        SecureLogger.info("Central state: \(central.state.rawValue)", category: .bluetooth)
        
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
        
        SecureLogger.info("🔗 Connecting to \(peripheral.name ?? "Unknown") (RSSI: \(RSSI))", category: .bluetooth)
        peripheral.delegate = self
        connectedPeripherals.append(peripheral)
        central.connect(peripheral, options: nil)
    }
    
    public func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        SecureLogger.info("Connected: \(peripheral.name ?? "Unknown") (\(peripheral.identifier))", category: .bluetooth)
        peripheral.discoverServices([Self.serviceUUID])
    }
    
    public func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        if let error = error {
            SecureLogger.error("Disconnected: \(peripheral.name ?? "Unknown") - Error: \(error.localizedDescription)", category: .bluetooth)
        } else {
            SecureLogger.info("Disconnected: \(peripheral.name ?? "Unknown") (clean disconnect)", category: .bluetooth)
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
        SecureLogger.info("Peripheral state: \(peripheral.state.rawValue)", category: .bluetooth)
        
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
        SecureLogger.info("Service added", category: .bluetooth)
    }
    
    public func peripheralManager(_ peripheral: CBPeripheralManager, central: CBCentral, didSubscribeTo characteristic: CBCharacteristic) {
        SecureLogger.info("Central subscribed: \(central.identifier)", category: .bluetooth)
        subscribedCentrals.append(central)
        
        queue.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            self?.sendAnnounce()
        }
    }
    
    public func peripheralManager(_ peripheral: CBPeripheralManager, central: CBCentral, didUnsubscribeFrom characteristic: CBCharacteristic) {
        SecureLogger.info("Central unsubscribed: \(central.identifier)", category: .bluetooth)
        subscribedCentrals.removeAll { $0 == central }
    }
    
    public func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveWrite requests: [CBATTRequest]) {
        for request in requests {
            guard let data = request.value else { continue }
            
            if let packet = BitchatPacket.from(data) {
                SecureLogger.info("RX packet from \(packet.senderID.hexEncodedString())", category: .bluetooth)
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
        
        guard let characteristic = service.characteristics?.first(where: { $0.uuid == Self.characteristicUUID }) else {
            SecureLogger.warning("Characteristic not found on \(peripheral.name ?? "?")", category: .bluetooth)
            return
        }
        
        if characteristic.properties.contains(.notify) {
            peripheral.setNotifyValue(true, for: characteristic)
        } else {
            SecureLogger.warning("Characteristic doesn't support notify", category: .bluetooth)
        }
    }
    
    public func peripheral(_ peripheral: CBPeripheral, didUpdateNotificationStateFor characteristic: CBCharacteristic, error: Error?) {
        if let error = error {
            SecureLogger.error("Error updating notification state on \(peripheral.name ?? "?"): \(error.localizedDescription)", category: .bluetooth)
            return
        }
        
        if characteristic.isNotifying {
            SecureLogger.info("✅ Successfully subscribed to notifications from \(peripheral.name ?? "?")", category: .bluetooth)
        } else {
            SecureLogger.warning("Unsubscribed from notifications on \(peripheral.name ?? "?")", category: .bluetooth)
        }
    }
    
    public func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        if let error = error {
            SecureLogger.error("Error receiving notification: \(error.localizedDescription)", category: .bluetooth)
            return
        }
        
        guard let data = characteristic.value, !data.isEmpty else { return }
        
        if let packet = BitchatPacket.from(data) {
            SecureLogger.info("RX packet from \(packet.senderID.hexEncodedString())", category: .bluetooth)
            onMessageReceived?(packet)
        }
    }
}
