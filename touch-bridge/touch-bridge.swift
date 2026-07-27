// touch-bridge.swift — make the exhibition touch panel work on macOS.
//
// WHY THIS EXISTS
// The panel (wch.cn "TouchScreen", 0x27c0:0x0859) reports on a HID *digitizer*
// interface (usage page 0x0D, usage 0x04). macOS reads those reports and then
// discards them: it has no digitizer-to-cursor path for third-party panels, so
// nothing ever reaches the window server, let alone the browser. The panel also
// exposes a mouse interface (usage page 0x01, usage 0x02) that macOS *would*
// understand, but the controller stays silent on it.
//
// So we bridge it in userspace: read the digitizer's contacts ourselves and
// synthesize native mouse events with CGEvent. No kernel extension, no Apple
// DriverKit entitlement — just two permissions on whichever app launches this:
//   · Input Monitoring  → to read the HID reports
//   · Accessibility     → to post the synthesized events
//
// Single pointer by design. The interface is built on pointer events throughout,
// so taps and drags all work; only multi-finger pinch is lost.
//
// ENV KNOBS (all optional)
//   TOUCH_DISPLAY=<n>  target display index (default: first external display)
//   TOUCH_FLIP_X=1     mirror horizontally
//   TOUCH_FLIP_Y=1     mirror vertically
//   TOUCH_SWAP_XY=1    swap axes (panel mounted rotated)
//   TOUCH_DRYRUN=1     print coordinates, post no events (for calibration)
//   TOUCH_VERBOSE=1    log every contact update

import Foundation
import IOKit
import IOKit.hid
import CoreGraphics
import ApplicationServices

let VID = 0x27c0, PID = 0x0859

// Unbuffered: this is run as a live console tool and its log must survive a kill.
setvbuf(stdout, nil, _IONBF, 0)

let env      = ProcessInfo.processInfo.environment
let flipX    = env["TOUCH_FLIP_X"]  == "1"
let flipY    = env["TOUCH_FLIP_Y"]  == "1"
let swapXY   = env["TOUCH_SWAP_XY"] == "1"
let dryRun   = env["TOUCH_DRYRUN"]  == "1"
let verbose  = env["TOUCH_VERBOSE"] == "1"

// ── Target display ───────────────────────────────────────────────────────────
// The panel is the external screen; the built-in Retina display is not it.
func pickDisplay() -> CGDirectDisplayID {
    var count: UInt32 = 0
    CGGetActiveDisplayList(0, nil, &count)
    var ids = [CGDirectDisplayID](repeating: 0, count: Int(count))
    CGGetActiveDisplayList(count, &ids, &count)

    if let s = env["TOUCH_DISPLAY"], let i = Int(s), i >= 0, i < ids.count { return ids[i] }
    for id in ids where CGDisplayIsBuiltin(id) == 0 { return id }
    return CGMainDisplayID()
}
let display = pickDisplay()

// ── Contact tracking ─────────────────────────────────────────────────────────
// A multi-touch digitizer repeats (tip switch, X, Y) once per contact, each in
// its own HID collection. Keying state by the parent collection's cookie keeps
// fingers from bleeding into each other; we then drive the cursor from the
// lowest-numbered contact that is actually down.
struct Contact { var x: Double?; var y: Double?; var tip = false }
var contacts: [UInt32: Contact] = [:]
var dirty = false

var isDown = false
var lastPoint = CGPoint.zero
var reportCount = 0

let source = CGEventSource(stateID: .hidSystemState)

func normalized(_ value: IOHIDValue, _ element: IOHIDElement) -> Double {
    let lo = Double(IOHIDElementGetLogicalMin(element))
    let hi = Double(IOHIDElementGetLogicalMax(element))
    guard hi > lo else { return 0 }
    let v = (Double(IOHIDValueGetIntegerValue(value)) - lo) / (hi - lo)
    return min(max(v, 0), 1)
}

func post(_ type: CGEventType, _ point: CGPoint) {
    guard let e = CGEvent(mouseEventSource: source, mouseType: type,
                          mouseCursorPosition: point, mouseButton: .left) else { return }
    e.setIntegerValueField(.mouseEventClickState, value: 1)
    e.post(tap: .cghidEventTap)
}

// Collapse one HID report's worth of element updates into a single event.
func flush() {
    guard dirty else { return }
    dirty = false

    let active = contacts
        .filter { $0.value.tip && $0.value.x != nil && $0.value.y != nil }
        .min { $0.key < $1.key }

    guard let c = active?.value, var nx = c.x, var ny = c.y else {
        if isDown {                       // last finger lifted
            isDown = false
            if verbose || dryRun { print("UP    at \(lastPoint)") }
            if !dryRun { post(.leftMouseUp, lastPoint) }
        }
        return
    }

    if swapXY { swap(&nx, &ny) }
    if flipX { nx = 1 - nx }
    if flipY { ny = 1 - ny }

    let b = CGDisplayBounds(display)
    let point = CGPoint(x: b.origin.x + nx * b.width,
                        y: b.origin.y + ny * b.height)
    lastPoint = point

    let type: CGEventType = isDown ? .leftMouseDragged : .leftMouseDown
    if !isDown { isDown = true }

    if verbose || dryRun {
        print(String(format: "%@ norm=(%.3f, %.3f) → screen=(%.0f, %.0f)",
                     type == .leftMouseDown ? "DOWN " : "DRAG ", nx, ny, point.x, point.y))
    }
    if !dryRun { post(type, point) }
}

// ── HID plumbing ─────────────────────────────────────────────────────────────
let manager = IOHIDManagerCreate(kCFAllocatorDefault, IOOptionBits(kIOHIDOptionsTypeNone))
IOHIDManagerSetDeviceMatching(manager, [
    kIOHIDVendorIDKey as String: VID,
    kIOHIDProductIDKey as String: PID,
] as CFDictionary)

let valueCB: IOHIDValueCallback = { _, _, _, value in
    let el = IOHIDValueGetElement(value)
    let page = IOHIDElementGetUsagePage(el)
    let usage = IOHIDElementGetUsage(el)

    // Group by the containing collection so each finger keeps its own slot.
    var key: UInt32 = 0
    if let parent = IOHIDElementGetParent(el) { key = UInt32(IOHIDElementGetCookie(parent)) }

    var c = contacts[key] ?? Contact(x: nil, y: nil)
    switch (page, usage) {
    case (0x01, 0x30): c.x = normalized(value, el)          // Generic Desktop → X
    case (0x01, 0x31): c.y = normalized(value, el)          // Generic Desktop → Y
    case (0x0D, 0x42): c.tip = IOHIDValueGetIntegerValue(value) != 0   // Digitizer → Tip Switch
    default: return
    }
    contacts[key] = c
    reportCount += 1
    dirty = true
}

IOHIDManagerRegisterInputValueCallback(manager, valueCB, nil)
IOHIDManagerScheduleWithRunLoop(manager, CFRunLoopGetCurrent(), CFRunLoopMode.defaultMode.rawValue)

// ── Startup report ───────────────────────────────────────────────────────────
print("══════════════════════════════════════════════════════════")
print("  touch-bridge — \(String(format: "0x%04X:0x%04X", VID, PID))")
print("══════════════════════════════════════════════════════════")

let opened = IOHIDManagerOpen(manager, IOOptionBits(kIOHIDOptionsTypeNone))
if opened != kIOReturnSuccess {
    print(String(format: "✗ cannot read the panel (0x%08X) — Input Monitoring not granted", opened))
    print("  Grant it to this app, then run again.")
    exit(1)
}
print("✓ HID access granted")

if !dryRun && !AXIsProcessTrusted() {
    print("✗ Accessibility not granted — events cannot be posted.")
    print("  Grant it to this app, then run again. (Or set TOUCH_DRYRUN=1 to test reading only.)")
    exit(1)
}
print(dryRun ? "· dry run — no events will be posted" : "✓ Accessibility granted")

let devices = (IOHIDManagerCopyDevices(manager) as? Set<IOHIDDevice>) ?? []
print("✓ \(devices.count) HID interface(s) matched")

let b = CGDisplayBounds(display)
print(String(format: "✓ target display %u — %.0f×%.0f at (%.0f, %.0f)%@",
             display, b.width, b.height, b.origin.x, b.origin.y,
             CGDisplayIsBuiltin(display) != 0 ? "  ⚠︎ BUILT-IN" : ""))

var orientation: [String] = []
if flipX { orientation.append("flip-X") }
if flipY { orientation.append("flip-Y") }
if swapXY { orientation.append("swap-XY") }
if !orientation.isEmpty { print("· orientation: \(orientation.joined(separator: ", "))") }

print("──────────────────────────────────────────────────────────")
print("  Touch the panel. Ctrl-C to stop.")
print("──────────────────────────────────────────────────────────")

// Coalesce at ~120 Hz so a full report is absorbed before we emit.
let timer = CFRunLoopTimerCreateWithHandler(kCFAllocatorDefault, CFAbsoluteTimeGetCurrent(),
                                            1.0 / 120.0, 0, 0) { _ in flush() }
CFRunLoopAddTimer(CFRunLoopGetCurrent(), timer, .defaultMode)

// Report silence loudly — that is the signal the panel itself is at fault.
let start = Date()
var lastSeen = 0
let watchdog = CFRunLoopTimerCreateWithHandler(kCFAllocatorDefault,
                                               CFAbsoluteTimeGetCurrent() + 10, 10, 0, 0) { _ in
    if reportCount == lastSeen && reportCount == 0 {
        print("… still nothing from the panel after \(Int(Date().timeIntervalSince(start)))s of listening")
    } else if reportCount != lastSeen {
        print("· \(reportCount) contact updates so far")
    }
    lastSeen = reportCount
}
CFRunLoopAddTimer(CFRunLoopGetCurrent(), watchdog, .defaultMode)

CFRunLoopRun()
