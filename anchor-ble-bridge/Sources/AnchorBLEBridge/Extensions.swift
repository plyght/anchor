import Foundation
import CommonCrypto

extension Data {
    public init?(hexString: String) {
        let clean = hexString.replacingOccurrences(of: " ", with: "")
        let len = clean.count / 2
        var data = Data(capacity: len)
        var index = clean.startIndex
        for _ in 0..<len {
            let nextIndex = clean.index(index, offsetBy: 2)
            if let byte = UInt8(clean[index..<nextIndex], radix: 16) {
                data.append(byte)
            } else {
                return nil
            }
            index = nextIndex
        }
        self = data
    }
    
    public func hexEncodedString() -> String {
        return map { String(format: "%02x", $0) }.joined()
    }
    
    public func sha256Fingerprint() -> String {
        var hash = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
        self.withUnsafeBytes {
            _ = CC_SHA256($0.baseAddress, CC_LONG(self.count), &hash)
        }
        return hash.map { String(format: "%02x", $0) }.joined()
    }
}

struct TransportConfig {
    static let nostrConvKeyPrefixLength = 16
    static let nostrShortKeyDisplayLength = 8
    static let compressionThresholdBytes = 256
}
