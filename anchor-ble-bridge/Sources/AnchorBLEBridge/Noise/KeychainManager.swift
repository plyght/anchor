import Foundation

protocol KeychainManagerProtocol {
    func saveIdentityKey(_ key: Data, forKey: String) -> Bool
    func getIdentityKey(forKey: String) -> Data?
    func deleteIdentityKey(forKey: String) -> Bool
    func saveSessionKey(_ key: Data, forPeer: String) -> Bool
    func getSessionKey(forPeer: String) -> Data?
    func deleteSessionKey(forPeer: String) -> Bool
    func secureClear(_ data: inout Data)
}

class InMemoryKeychainManager: KeychainManagerProtocol {
    private var storage: [String: Data] = [:]
    private let queue = DispatchQueue(label: "keychain.manager", attributes: .concurrent)
    
    func saveIdentityKey(_ key: Data, forKey: String) -> Bool {
        queue.sync(flags: .barrier) {
            storage[forKey] = key
        }
        return true
    }
    
    func getIdentityKey(forKey: String) -> Data? {
        queue.sync {
            return storage[forKey]
        }
    }
    
    func deleteIdentityKey(forKey: String) -> Bool {
        queue.sync(flags: .barrier) {
            storage.removeValue(forKey: forKey)
        }
        return true
    }
    
    func saveSessionKey(_ key: Data, forPeer: String) -> Bool {
        queue.sync(flags: .barrier) {
            storage["session_\(forPeer)"] = key
        }
        return true
    }
    
    func getSessionKey(forPeer: String) -> Data? {
        queue.sync {
            return storage["session_\(forPeer)"]
        }
    }
    
    func deleteSessionKey(forPeer: String) -> Bool {
        queue.sync(flags: .barrier) {
            storage.removeValue(forKey: "session_\(forPeer)")
        }
        return true
    }
    
    func secureClear(_ data: inout Data) {
        data.withUnsafeMutableBytes { bytes in
            memset(bytes.baseAddress, 0, bytes.count)
        }
        data = Data()
    }
}
