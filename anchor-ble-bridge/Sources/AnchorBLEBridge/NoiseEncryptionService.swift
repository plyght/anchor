import Foundation
import CryptoKit

public class NoiseEncryptionService {
    private let staticIdentityKey: Curve25519.KeyAgreement.PrivateKey
    public let staticIdentityPublicKey: Curve25519.KeyAgreement.PublicKey
    private let signingKey: Curve25519.Signing.PrivateKey
    public let signingPublicKey: Curve25519.Signing.PublicKey
    
    private let sessionManager: NoiseSessionManager
    private let keychain: KeychainManagerProtocol
    
    var onHandshakeRequired: ((PeerID) -> Void)?
    var onSessionEstablished: ((PeerID) -> Void)?
    
    public init() {
        self.keychain = InMemoryKeychainManager()
        
        if let identityData = keychain.getIdentityKey(forKey: "noiseStaticKey"),
           let key = try? Curve25519.KeyAgreement.PrivateKey(rawRepresentation: identityData) {
            self.staticIdentityKey = key
        } else {
            self.staticIdentityKey = Curve25519.KeyAgreement.PrivateKey()
            _ = keychain.saveIdentityKey(staticIdentityKey.rawRepresentation, forKey: "noiseStaticKey")
        }
        
        if let signingData = keychain.getIdentityKey(forKey: "ed25519SigningKey"),
           let key = try? Curve25519.Signing.PrivateKey(rawRepresentation: signingData) {
            self.signingKey = key
        } else {
            self.signingKey = Curve25519.Signing.PrivateKey()
            _ = keychain.saveIdentityKey(signingKey.rawRepresentation, forKey: "ed25519SigningKey")
        }
        
        self.staticIdentityPublicKey = staticIdentityKey.publicKey
        self.signingPublicKey = signingKey.publicKey
        
        self.sessionManager = NoiseSessionManager(localStaticKey: staticIdentityKey, keychain: keychain)
        
        sessionManager.onSessionEstablished = { [weak self] peerID, _ in
            self?.onSessionEstablished?(peerID)
        }
    }
    
    func initiateHandshake(with peerID: PeerID) throws -> Data {
        return try sessionManager.initiateHandshake(with: peerID)
    }
    
    func processHandshakeMessage(from peerID: PeerID, message: Data) throws -> Data? {
        return try sessionManager.handleIncomingHandshake(from: peerID, message: message)
    }
    
    func hasEstablishedSession(with peerID: PeerID) -> Bool {
        return sessionManager.getSession(for: peerID)?.isEstablished() ?? false
    }
    
    func encrypt(_ data: Data, for peerID: PeerID) throws -> Data {
        guard hasEstablishedSession(with: peerID) else {
            onHandshakeRequired?(peerID)
            throw NoiseEncryptionError.handshakeRequired
        }
        return try sessionManager.encrypt(data, for: peerID)
    }
    
    func decrypt(_ data: Data, from peerID: PeerID) throws -> Data {
        guard hasEstablishedSession(with: peerID) else {
            throw NoiseEncryptionError.sessionNotEstablished
        }
        return try sessionManager.decrypt(data, from: peerID)
    }
    
    func signPacket(_ packet: BitchatPacket) -> BitchatPacket? {
        guard let packetData = packet.toBinaryDataForSigning() else {
            return nil
        }
        
        guard let signature = try? signingKey.signature(for: packetData) else {
            return nil
        }
        
        var signedPacket = packet
        signedPacket.signature = signature
        return signedPacket
    }
}

enum NoiseEncryptionError: Error {
    case handshakeRequired
    case sessionNotEstablished
    case encryptionFailed
    case decryptionFailed
}
