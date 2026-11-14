import ctypes
import os
import signal
import socket
import sys
import time

LIBHIDAPI = "@libhidapi@"

VENDOR, PRODUCT, USAGE_PAGE = 0x3297, 0x1969, 0xFF60
CMD_PAIRING_INIT = 1
EVT_LAYER, EVT_KEYDOWN, EVT_KEYUP = 5, 6, 7
REPORT_SIZE = 32
POLL_SECONDS = 5
PAIR_SECONDS = 60
FLUSH_SECONDS = 10
READ_TIMEOUT_MS = 1000


class DeviceInfo(ctypes.Structure):
    pass


DeviceInfo._fields_ = [
    ("path", ctypes.c_char_p),
    ("vendor_id", ctypes.c_ushort),
    ("product_id", ctypes.c_ushort),
    ("serial_number", ctypes.c_void_p),
    ("release_number", ctypes.c_ushort),
    ("manufacturer_string", ctypes.c_void_p),
    ("product_string", ctypes.c_void_p),
    ("usage_page", ctypes.c_ushort),
    ("usage", ctypes.c_ushort),
    ("interface_number", ctypes.c_int),
    ("next", ctypes.POINTER(DeviceInfo)),
    ("bus_type", ctypes.c_int),
]

hid = ctypes.CDLL(LIBHIDAPI)
hid.hid_init.restype = ctypes.c_int
hid.hid_darwin_set_open_exclusive.argtypes = [ctypes.c_int]
hid.hid_darwin_set_open_exclusive.restype = None
hid.hid_enumerate.argtypes = [ctypes.c_ushort, ctypes.c_ushort]
hid.hid_enumerate.restype = ctypes.POINTER(DeviceInfo)
hid.hid_free_enumeration.argtypes = [ctypes.POINTER(DeviceInfo)]
hid.hid_free_enumeration.restype = None
hid.hid_open_path.argtypes = [ctypes.c_char_p]
hid.hid_open_path.restype = ctypes.c_void_p
hid.hid_write.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_size_t]
hid.hid_write.restype = ctypes.c_int
hid.hid_read_timeout.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_size_t, ctypes.c_int]
hid.hid_read_timeout.restype = ctypes.c_int
hid.hid_close.argtypes = [ctypes.c_void_p]
hid.hid_close.restype = None


def say(message):
    print(time.strftime("%Y-%m-%d %H:%M:%S"), message, file=sys.stderr, flush=True)


class Log:
    def __init__(self, directory):
        self.directory = directory
        self.date = None
        self.lines = []
        self.last_us = 0
        self.last_flush = time.monotonic()

    def write(self, event, row="", col="", layer=""):
        now = max(time.time_ns() // 1000, self.last_us + 1)
        self.last_us = now
        date = time.strftime("%Y-%m-%d", time.localtime(now / 1_000_000))
        if date != self.date:
            self.flush()
            self.date = date
        self.lines.append(f"{now}\t{event}\t{row}\t{col}\t{layer}\n")

    def tick(self):
        if time.monotonic() - self.last_flush >= FLUSH_SECONDS:
            self.flush()

    def flush(self):
        if self.lines:
            os.makedirs(self.directory, exist_ok=True)
            with open(os.path.join(self.directory, f"{self.date}.tsv"), "a") as file:
                file.writelines(self.lines)
            self.lines = []
        self.last_flush = time.monotonic()


def find_keyboard():
    first = hid.hid_enumerate(VENDOR, PRODUCT)
    path = None
    node = first
    while node:
        if node.contents.usage_page == USAGE_PAGE:
            path = node.contents.path
            break
        node = node.contents.next
    if first:
        hid.hid_free_enumeration(first)
    return path


def pair(device):
    report = bytes([0, CMD_PAIRING_INIT]) + bytes(REPORT_SIZE - 1)
    return hid.hid_write(device, report, len(report)) >= 0


def record(path, log):
    device = hid.hid_open_path(path)
    if not device:
        say("could not open the Moonlander")
        return
    try:
        if not pair(device):
            say("could not pair with the Moonlander")
            return
        say("connected")
        log.write("connect")
        last_pair = time.monotonic()
        buffer = (ctypes.c_ubyte * REPORT_SIZE)()
        while True:
            read = hid.hid_read_timeout(device, buffer, REPORT_SIZE, READ_TIMEOUT_MS)
            if read < 0:
                break
            if read > 0:
                if buffer[0] == EVT_KEYDOWN:
                    log.write("down", buffer[2], buffer[1])
                elif buffer[0] == EVT_KEYUP:
                    log.write("up", buffer[2], buffer[1])
                elif buffer[0] == EVT_LAYER:
                    log.write("layer", layer=buffer[1])
            if time.monotonic() - last_pair >= PAIR_SECONDS:
                if not pair(device):
                    break
                last_pair = time.monotonic()
            log.tick()
        say("disconnected")
        log.write("disconnect")
    finally:
        hid.hid_close(device)
        log.flush()


def stop(signum, frame):
    raise SystemExit(0)


def main():
    root = sys.argv[1]
    host = socket.gethostname().split(".")[0]
    log = Log(os.path.join(root, "events", host))
    signal.signal(signal.SIGTERM, stop)
    hid.hid_init()
    hid.hid_darwin_set_open_exclusive(0)
    say(f"recording to {root}")
    try:
        while True:
            if os.path.isdir(root):
                path = find_keyboard()
                if path:
                    record(path, log)
            time.sleep(POLL_SECONDS)
    finally:
        log.flush()


main()
