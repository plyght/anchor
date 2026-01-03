import Foundation
import AsyncHTTPClient

public class AnchorIntegration {
    private let httpClient: HTTPClient
    private let backendURL: String
    private var pollTimer: Timer?
    
    public var onTaskReceived: ((AnchorTask) -> Void)?
    
    public init(backendURL: String = "http://localhost:8000") {
        self.backendURL = backendURL
        self.httpClient = HTTPClient(eventLoopGroupProvider: .singleton)
    }
    
    deinit {
        try? httpClient.syncShutdown()
    }
    
    public func startPolling(interval: TimeInterval = 5.0) {
        pollTimer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { [weak self] _ in
            Task {
                await self?.pollDispatchedTasks()
            }
        }
        SecureLogger.info("Started polling anchor backend every \(interval)s", category: .session)
    }
    
    public func stopPolling() {
        pollTimer?.invalidate()
        pollTimer = nil
    }
    
    private func pollDispatchedTasks() async {
        do {
            let url = "\(backendURL)/api/tasks?status=dispatched"
            let request = HTTPClientRequest(url: url)
            let response = try await httpClient.execute(request, timeout: .seconds(10))
            
            guard response.status == .ok else {
                SecureLogger.warning("Task poll failed: HTTP \(response.status.code)", category: .session)
                return
            }
            
            let body = try await response.body.collect(upTo: 1024 * 1024)
            let tasks = try JSONDecoder().decode([AnchorTask].self, from: body)
            
            for task in tasks {
                onTaskReceived?(task)
            }
        } catch {
            SecureLogger.error("Failed to poll tasks: \(error)", category: .session)
        }
    }
    
    public func reportTaskResponse(taskId: String, volunteerId: String, action: String) async {
        do {
            let url = "\(backendURL)/api/tasks/\(taskId)/respond"
            var request = HTTPClientRequest(url: url)
            request.method = .POST
            request.headers.add(name: "Content-Type", value: "application/json")
            
            let body = TaskResponse(volunteer_id: volunteerId, action: action)
            let jsonData = try JSONEncoder().encode(body)
            request.body = .bytes(jsonData)
            
            let response = try await httpClient.execute(request, timeout: .seconds(10))
            
            if response.status == .ok {
                SecureLogger.info("Reported \(action) from \(volunteerId) for task \(taskId)", category: .session)
            } else {
                SecureLogger.warning("Failed to report response: HTTP \(response.status.code)", category: .session)
            }
        } catch {
            SecureLogger.error("Failed to report task response: \(error)", category: .session)
        }
    }
}

public struct AnchorTask: Codable {
    public let _id: String
    public let title: String
    public let description: String
    public let acceptance_code: String
    public let required_skills: [String]?
    public let location: String?
    public let target_volunteer_id: String?
    
    public var meshMessage: String {
        if let target = target_volunteer_id {
            return "TASK#\(_id): \(description) | Code: \(acceptance_code) [ASSIGNED TO YOU]"
        }
        return "TASK#\(_id): \(description) | Code: \(acceptance_code)"
    }
    
    public var recipientPeerID: Data? {
        guard let target = target_volunteer_id else { return nil }
        return Data(hexString: target)
    }
}

struct TaskResponse: Codable {
    let volunteer_id: String
    let action: String
}
