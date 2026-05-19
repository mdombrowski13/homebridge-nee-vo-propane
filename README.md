# homebridge-nee-vo-propane

A [Homebridge](https://homebridge.io) plugin that integrates Otodata / Nee-Vo propane tank sensors into Apple HomeKit.

Monitor your propane level as a percentage, track estimated gallons remaining, and trigger automations when your tank runs low — all from the Home app.

[![verified-by-homebridge](https://img.shields.io/badge/homebridge-verified-blueviolet?color=%23491F59&style=for-the-badge&logoColor=%23FFFFFF&logo=homebridge)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

---

## How It Works

Otodata wireless tank sensors report propane levels to the Nee-Vo cloud. Nee-Vo provides a public share page for each tank at `https://nv.otodata.com/d/<shareId>`. This plugin uses a JSON endpoint inferred from that share page to retrieve tank telemetry on a configurable schedule, and exposes your tank to HomeKit using a Humidity Sensor service for the propane percentage tile, a Battery service for the low-level alert, and a custom Propane service for gallons remaining and tank capacity metadata.

> **Important:** Nee-Vo has not published or documented this API. The endpoint used by this plugin was discovered by inspecting the network requests made by the share page. It could change or disappear without any notice. See [Known Limitations](#known-limitations).

The sensor hardware updates at most once per hour, so the plugin defaults to polling once every 24 hours to keep API load minimal while still keeping your data reasonably fresh.

---

## Requirements

- [Homebridge](https://homebridge.io) v1.8.5 or later
- Node.js v20, v22, or v24
- An Otodata / Nee-Vo propane tank sensor
- Your tank's share link ID from the Nee-Vo app or web portal

---

## Finding Your Share ID

Nee-Vo provides a public share page for each tank. When you share your tank, you get a URL in this format:

```
https://nv.otodata.com/d/FJZvjg
                         ^^^^^^
                         this is your shareId
```

You can find or generate this link in the Nee-Vo app under your tank's sharing settings. The share page displays your current tank level in a browser and is the intended public-facing URL.

This plugin infers a JSON API endpoint from that same share ID:

```
https://nv.otodata.com/api/devices/FJZvjg
```

To confirm your share ID is working, visit your share page URL in a browser — you should see your tank's current level displayed. If that works, the plugin should be able to retrieve the underlying data.

---

## Installation

### From npm

```bash
npm install -g homebridge-nee-vo-propane
```

Then add the platform block to your `config.json` (see Configuration below) and restart Homebridge.

### Via Homebridge UI

1. Open the Homebridge UI
2. Go to **Plugins** and search for `homebridge-nee-vo-propane`
3. Click **Install**
4. Configure via the plugin settings form (see Configuration below)
5. Restart Homebridge

### From Git

On your Homebridge server:

```bash
git clone <repository-url>
cd homebridge-nee-vo-propane
npm install
npm run build
sudo npm install -g .
```

Then add the platform block to your `config.json` (see Configuration below) and restart Homebridge.

**To update to a newer version:**

```bash
cd homebridge-nee-vo-propane
git pull
npm install
npm run build
sudo npm install -g .
sudo hb-service restart
```

---

## Configuration

### Homebridge UI

After installing the plugin, click the **Settings** button to open the configuration form. All fields include descriptions and validation.

### Manual config.json

Add a platform entry to the `platforms` array in your Homebridge `config.json`:

```json
{
  "platforms": [
    {
      "platform": "PropaneTank",
      "name": "Propane Tank",
      "shareId": "YOUR_SHARE_ID",
      "tankCapacityGallons": 500,
      "pollIntervalMinutes": 1440,
      "lowThreshold": 10,
      "apiBaseUrl": "https://nv.otodata.com/api/devices"
    }
  ]
}
```

### Configuration Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `platform` | string | ✅ | — | Must be `PropaneTank` |
| `name` | string | ✅ | — | Display name in HomeKit |
| `shareId` | string | ✅ | — | Your Nee-Vo share token |
| `tankCapacityGallons` | number | ✅ | — | Total tank capacity in gallons |
| `pollIntervalMinutes` | number | — | `1440` | How often to poll the API (minimum 60) |
| `lowThreshold` | number | — | `30` | % level that triggers the low alert |
| `apiBaseUrl` | string | — | `https://nv.otodata.com/api/devices` | Base URL for the Nee-Vo JSON endpoint. Only change this if the endpoint moves |

> **Note:** If `pollIntervalMinutes` is set below 60, the plugin will automatically use 60 and log a warning. The sensor hardware does not update more frequently than once per hour, so polling below 60 minutes returns stale data.

---

## HomeKit Behavior

The tank appears in the Home app primarily as a **Humidity Sensor** so the room tile can display the propane percentage. It also exposes a **Battery** service that maps propane percentage to HomeKit's low-battery alert behavior.

| Element | Behavior |
|---|---|
| Room tile | Humidity Sensor shows propane level as a percentage (e.g. "69%") |
| Low battery alert | Battery service triggers when propane level drops below `lowThreshold` |
| Automations | Appears under "A sensor detects something" — trigger when level drops below threshold |
| Siri | "Hey Siri, what is my propane level?" |
| Gallons remaining | Exposed through a custom Propane service; visible in advanced HomeKit apps (e.g. Eve, Home+) |

> **Tip:** In the Home app go to **Automation → + → Add Automation → A sensor detects something**, select Propane Tank, and trigger when the level drops below your threshold. Use "Notify when run" on the automation or a Shortcuts action to send a custom notification.

---

## Known Limitations

- **Uses an inferred, undocumented API endpoint** — Nee-Vo has not published this API. It was discovered by inspecting the network requests made by the share page at `https://nv.otodata.com/d/<shareId>`. Nee-Vo could change, move, or remove it at any time without notice and without breaking their own product
- The sensor updates **at most once per hour** — this is a hardware constraint, not a plugin limitation
- Gallons remaining is **derived** from the percentage and your configured capacity, not read directly from the sensor
- No real-time push updates — the plugin is poll-based only

---

## Troubleshooting

**The accessory isn't appearing in HomeKit**
- Check the Homebridge logs for any errors on startup
- Confirm your `shareId` is correct by visiting `https://nv.otodata.com/api/devices/YOUR_SHARE_ID` in a browser
- Restart Homebridge after any config change

**The level isn't updating**
- The sensor hardware updates at most once per hour — if `lastRead` in the API response isn't changing, the sensor may be offline or out of range
- Check the Homebridge logs to confirm polls are running

**Homebridge UI isn't showing a settings form**
- Ensure you're on Homebridge UI v4.x or later

---

## Future Enhancements

- Adaptive polling based on `lastRead` age
- Estimated days remaining based on usage history
- Multi-tank support
- Historical usage tracking

---

## License

MIT

---

## Acknowledgements

Built on top of [Homebridge](https://homebridge.io) and the unofficial Otodata / Nee-Vo share API.
