import Foundation

enum LogCategory: String {
    case session
    case security
    case bluetooth
    case encryption
}

struct SecureLogger {
    static func debug(_ message: String, category: LogCategory = .session) {
        // Silenced for now
    }
    
    static func info(_ message: Any, category: LogCategory = .session) {
        // Silenced for now
    }
    
    static func warning(_ message: Any, category: LogCategory = .session) {
        // Silenced for now
    }
    
    static func error(_ message: Any, context: String? = nil, category: LogCategory = .session) {
        print("[\(category.rawValue)] ERROR: \(message)")
        if let ctx = context {
            print("  Context: \(ctx)")
        }
    }
    
    // Compatibility methods for structured logging
    enum LogOperation {
        case load, create, delete
    }
    
    static func logKeyOperation(_ operation: LogOperation, keyType: String, success: Bool) {
        // Silenced
    }
}
