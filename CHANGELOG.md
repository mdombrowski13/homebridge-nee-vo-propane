# Changelog

## 1.0.3

- Delay the first cloud poll until after Homebridge startup and unref polling timers so verification/startup teardown can complete cleanly.

## 1.0.2

- Fix `config.schema.json` required field declarations for JSON Schema compliance.

## 1.0.1

- Correct package and README wording to describe the Humidity Sensor, Battery, and custom Propane services accurately.
- Update documented Node.js support to the current Homebridge-supported LTS versions.

## 1.0.0

- Initial public release of `homebridge-nee-vo-propane`.
- Add Homebridge platform support for Otodata / Nee-Vo propane tank sensors.
- Include Homebridge UI configuration schema, npm metadata, and public release documentation.
