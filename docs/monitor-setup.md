# Monitor Setup - CalDigit TS4 Dual Monitor Configuration

## Current Configuration (Updated 2025-01-15)

1. **LG ULTRAGEAR (Main)** - 2560x1440 @ 144Hz, Landscape - via TS4 DisplayPort
2. **Built-in Retina Display** - 3456x2234, MacBook Pro 16" Liquid Retina XDR
3. **LG ULTRAGEAR (Secondary)** - 1440x2560 @ 144Hz, Portrait (90° rotation) - via TS4 Thunderbolt downstream port

**Status:**
- Both LG monitors set to **DisplayPort 1.2 mode** (not 1.4)
- Dock: CalDigit TS4 Thunderbolt firmware: v39.1

## Hardware

### Monitors

- **Model:** LG UltraGear 27GP850-B
  **Amazon link:** https://www.amazon.de/-/en/dp/B08VS8YG8H?th=1

**Display Specs:**
- **Size:** 27 inches
- **Resolution:** QHD (2560 x 1440)
- **Panel:** Nano IPS
- **Response Time:** 1ms (GtG)
- **Aspect Ratio:** 16:9
- **Refresh Rate:** Up to 180Hz (overclocked) / 165Hz (native) via DisplayPort 1.4

**Connectivity:**
- 1x DisplayPort 1.4
- 2x HDMI 2.0
- 2x USB 3.0 Type-A (downstream)
- 1x USB 3.0 Type-B (upstream)
- 1x 3.5mm headphone jack

**Gaming Features:**
- NVIDIA G-Sync Compatible
- AMD FreeSync Premium
- VESA DisplayHDR 400

**Serials:**
- Monitor 1 (Main): 110MAVDNHZ43 (2021)
- Monitor 2 (Secondary): 202MANJJ4647 (2022)

### Dock

- **Model:** CalDigit TS4 Thunderbolt 4 Dock
- **Firmware:**: Thunderbolt: v39.1 (latest)
- **Cable**: Anker Thunderbolt 4 Cable (2.3 ft, 240W, 40Gbps)
  - **Amazon order**: https://www.amazon.de/your-orders/order-details?orderID=305-5764384-4292361&ref=ppx_yo2ov_dt_b_fed_order_details

**Thunderbolt Connection:** 40 Gbps to MacBook Pro

> [!WARNING]
> Both LG ULTRAGEAR monitors MUST be set to DisplayPort 1.2 to avoid screen blinking issues with Apple Silicon Macs + CalDigit TS4.
> - https://www.connectpro.com/blogs/news/known-video-issue-with-caldigit-ts4-docking-station-and-m1-m2-macbooks
> - https://discussions.apple.com/thread/254605412

## Bugs

Sometimes I run into this bug with aerospace: https://github.com/nikitabobko/AeroSpace/issues/413
