import CoreAudio
import Foundation

let aggregateUID = "juan.builtin-mic-only"
let aggregateName = "MacBook Mic (pinned)"

func address(_ selector: AudioObjectPropertySelector, _ scope: AudioObjectPropertyScope = kAudioObjectPropertyScopeGlobal) -> AudioObjectPropertyAddress {
    AudioObjectPropertyAddress(mSelector: selector, mScope: scope, mElement: kAudioObjectPropertyElementMain)
}

func fail(_ message: String) -> Never {
    FileHandle.standardError.write("pin-builtin-mic: \(message)\n".data(using: .utf8)!)
    exit(0)
}

func allDevices() -> [AudioDeviceID] {
    var addr = address(kAudioHardwarePropertyDevices)
    var size: UInt32 = 0
    guard AudioObjectGetPropertyDataSize(AudioObjectID(kAudioObjectSystemObject), &addr, 0, nil, &size) == noErr else { return [] }
    var devices = [AudioDeviceID](repeating: 0, count: Int(size) / MemoryLayout<AudioDeviceID>.size)
    guard AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &addr, 0, nil, &size, &devices) == noErr else { return [] }
    return devices
}

func transportType(_ device: AudioDeviceID) -> UInt32 {
    var addr = address(kAudioDevicePropertyTransportType)
    var value: UInt32 = 0
    var size = UInt32(MemoryLayout<UInt32>.size)
    AudioObjectGetPropertyData(device, &addr, 0, nil, &size, &value)
    return value
}

func hasInput(_ device: AudioDeviceID) -> Bool {
    var addr = address(kAudioDevicePropertyStreams, kAudioObjectPropertyScopeInput)
    var size: UInt32 = 0
    return AudioObjectGetPropertyDataSize(device, &addr, 0, nil, &size) == noErr && size > 0
}

func uid(_ device: AudioDeviceID) -> String? {
    var addr = address(kAudioDevicePropertyDeviceUID)
    var value: Unmanaged<CFString>?
    var size = UInt32(MemoryLayout<Unmanaged<CFString>?>.size)
    guard AudioObjectGetPropertyData(device, &addr, 0, nil, &size, &value) == noErr, let value else { return nil }
    return value.takeRetainedValue() as String
}

func device(withUID target: String) -> AudioDeviceID? {
    allDevices().first { uid($0) == target }
}

func defaultInput() -> AudioDeviceID {
    var addr = address(kAudioHardwarePropertyDefaultInputDevice)
    var value = AudioDeviceID(0)
    var size = UInt32(MemoryLayout<AudioDeviceID>.size)
    AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &addr, 0, nil, &size, &value)
    return value
}

func setDefaultInput(_ device: AudioDeviceID) -> OSStatus {
    var addr = address(kAudioHardwarePropertyDefaultInputDevice)
    var value = device
    return AudioObjectSetPropertyData(AudioObjectID(kAudioObjectSystemObject), &addr, 0, nil, UInt32(MemoryLayout<AudioDeviceID>.size), &value)
}

guard let builtIn = allDevices().first(where: { transportType($0) == kAudioDeviceTransportTypeBuiltIn && hasInput($0) }),
      let builtInUID = uid(builtIn) else {
    fail("no built-in microphone, skipping")
}

var aggregate = device(withUID: aggregateUID)
if aggregate == nil {
    let description: [String: Any] = [
        kAudioAggregateDeviceNameKey: aggregateName,
        kAudioAggregateDeviceUIDKey: aggregateUID,
        kAudioAggregateDeviceIsPrivateKey: 0,
        kAudioAggregateDeviceSubDeviceListKey: [[kAudioSubDeviceUIDKey: builtInUID]],
        kAudioAggregateDeviceMainSubDeviceKey: builtInUID,
    ]
    var created = AudioDeviceID(0)
    let status = AudioHardwareCreateAggregateDevice(description as CFDictionary, &created)
    guard status == noErr else { fail("creating \(aggregateName) failed with status \(status)") }
    aggregate = created
    print("pin-builtin-mic: created \(aggregateName)")
}

if defaultInput() == aggregate! {
    print("pin-builtin-mic: \(aggregateName) is already the default input")
} else {
    let status = setDefaultInput(aggregate!)
    guard status == noErr else { fail("setting \(aggregateName) as default input failed with status \(status)") }
    print("pin-builtin-mic: set \(aggregateName) as the default input")
}
