import Foundation

enum LogCategory: String {
    case session
    case security
    case bluetooth
}

struct SecureLogger {
    static func debug(_ message: String, category: LogCategory = .session) {
        print("[\(category)] DEBUG: \(message)")
    }
    
    static func info(_ message: String, category: LogCategory = .session) {
        print("[\(category)] INFO: \(message)")
    }
    
    static func warning(_ message: String, category: LogCategory = .session) {
        print("[\(category)] WARN: \(message)")
    }
    
    static func error(_ message: String, category: LogCategory = .session) {
        print("[\(category)] ERROR: \(message)")
    }
}
