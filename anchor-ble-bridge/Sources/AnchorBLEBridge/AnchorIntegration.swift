import Foundation
import AsyncHTTPClient

public class AnchorIntegration {
    private let httpClient: HTTPClient
    private let backendURL: String
    private var pollTimer: Timer?
    private var backendOffline = false
    private var dispatchedTaskIds: Set<String> = []
    
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
                return
            }
            
            if backendOffline {
                backendOffline = false
                print("✅ Anchor backend reconnected")
            }
            
            let body = try await response.body.collect(upTo: 1024 * 1024)
            let tasksResponse = try JSONDecoder().decode(TasksResponse.self, from: body)
            
            for task in tasksResponse.tasks {
                if !dispatchedTaskIds.contains(task._id) {
                    dispatchedTaskIds.insert(task._id)
                    onTaskReceived?(task)
                }
            }
        } catch {
            if !backendOffline {
                backendOffline = true
                print("⚠️  Anchor backend offline (will retry silently)")
            }
        }
    }
    
    public struct TaskResponseResult {
        public let success: Bool
        public let isTargeted: Bool
    }
    
    public func reportTaskResponse(taskId: String, volunteerId: String, action: String) async -> TaskResponseResult {
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
                print("Reported \(action) from \(volunteerId.prefix(8)) for task \(taskId)")
                
                let bodyData = try await response.body.collect(upTo: 1024 * 1024)
                let responseData = try JSONDecoder().decode(TaskResponseData.self, from: bodyData)
                
                return TaskResponseResult(success: true, isTargeted: responseData.is_targeted ?? false)
            } else {
                print("Response \(response.status.code) for task \(taskId)")
                return TaskResponseResult(success: false, isTargeted: false)
            }
        } catch {
            print("Failed to report task response: \(error)")
            return TaskResponseResult(success: false, isTargeted: false)
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
    public let target_volunteer_bitchat_username: String?
    
    public var meshMessage: String {
        return "\(title)\n\(description)\nReply: \(acceptance_code) A/D/DONE"
    }
    
    public var targetBitchatUsername: String? {
        return target_volunteer_bitchat_username
    }
}

struct TaskResponse: Codable {
    let volunteer_id: String
    let action: String
}

struct TasksResponse: Codable {
    let tasks: [AnchorTask]
}

struct TaskResponseData: Codable {
    let success: Bool
    let task_id: String
    let status: String
    let is_targeted: Bool?
}
