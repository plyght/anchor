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
    dependencies: [],
    targets: [
        .target(
            name: "AnchorBLEBridge",
            dependencies: []),
        .executableTarget(
            name: "AnchorBLECLI",
            dependencies: ["AnchorBLEBridge"]),
        .testTarget(
            name: "AnchorBLEBridgeTests",
            dependencies: ["AnchorBLEBridge"]),
    ]
)
