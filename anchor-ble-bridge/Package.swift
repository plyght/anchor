// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "AnchorBLEBridge",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .library(
            name: "AnchorBLEBridge",
            targets: ["AnchorBLEBridge"]),
        .executable(
            name: "anchor-ble-cli",
            targets: ["AnchorBLECLI"]),
    ],
    dependencies: [
        .package(url: "https://github.com/swift-server/async-http-client.git", from: "1.9.0")
    ],
    targets: [
        .target(
            name: "AnchorBLEBridge",
            dependencies: [
                .product(name: "AsyncHTTPClient", package: "async-http-client")
            ]),
        .executableTarget(
            name: "AnchorBLECLI",
            dependencies: ["AnchorBLEBridge"]),
        .testTarget(
            name: "AnchorBLEBridgeTests",
            dependencies: ["AnchorBLEBridge"]),
    ]
)
