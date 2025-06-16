# Aviation Weather MCP Server - Usage Examples

## Tool Examples

### Get METAR

Get current weather observation for Denver International:
```json
{
  "tool": "get-metar",
  "parameters": {
    "stations": "KDEN"
  }
}
```

Get METAR for multiple airports:
```json
{
  "tool": "get-metar",
  "parameters": {
    "stations": "KDEN,KLAS,KPHX",
    "hoursBack": 3
  }
}
```

### Get TAF

Get forecast for Los Angeles International:
```json
{
  "tool": "get-taf",
  "parameters": {
    "stations": "KLAX"
  }
}
```

### Get PIREPs

Get pilot reports for Colorado area:
```json
{
  "tool": "get-pireps",
  "parameters": {
    "minLat": 37.0,
    "maxLat": 41.0,
    "minLon": -109.0,
    "maxLon": -102.0,
    "hoursBack": 6
  }
}
```

### Get Weather Along Route

Check weather for a flight from Denver to Las Vegas with Phoenix as alternate:
```json
{
  "tool": "get-weather-along-route",
  "parameters": {
    "departure": "KDEN",
    "destination": "KLAS",
    "alternates": "KPHX,KABQ"
  }
}
```

### Determine Flight Category

Check current flight category for an airport:
```json
{
  "tool": "determine-flight-category",
  "parameters": {
    "station": "KDEN"
  }
}
```

Or determine category from specific conditions:
```json
{
  "tool": "determine-flight-category",
  "parameters": {
    "ceiling": 2500,
    "visibility": 4
  }
}
```

### Check VFR Minimums

Check if conditions meet personal minimums:
```json
{
  "tool": "check-vfr-minimums",
  "parameters": {
    "stations": "KDEN,KBJC,KAPA",
    "minCeiling": 4000,
    "minVisibility": 7
  }
}
```

### Decode METAR

Decode a raw METAR string:
```json
{
  "tool": "decode-metar",
  "parameters": {
    "metar": "METAR KDEN 011234Z 27015G25KT 10SM FEW050 SCT100 BKN200 22/10 A2992 RMK AO2"
  }
}
```

### Get Station Info

Get airport information:
```json
{
  "tool": "get-station-info",
  "parameters": {
    "station": "KDEN"
  }
}
```

## Prompt Examples

### VFR Flight Analysis

```
Use prompt: vfr-flight-analysis
Arguments:
- departure: KDEN
- destination: KLAS
- alternates: KPHX,KABQ
- departureTime: in 2 hours
```

### Weather Briefing

```
Use prompt: weather-briefing
Arguments:
- airports: KDEN,KLAS,KPHX
- includeArea: true
```

### IFR Alternate Requirements

```
Use prompt: ifr-alternate-requirements
Arguments:
- destination: KDEN
- alternates: KCOS,KBJC,KAPA
- eta: 1800Z
```

## Sample Conversations

### Pre-flight Weather Check

**User**: "What's the weather like for a VFR flight from Denver to Las Vegas this afternoon?"

**Assistant**: I'll check the weather conditions for your VFR flight from Denver to Las Vegas. Let me gather the current and forecast weather data.

[Uses get-weather-along-route tool]
[Uses determine-flight-category tool]
[Uses get-airmets tool]

Based on the weather data:
- **KDEN (Denver)**: Currently VFR with clear skies...
- **KLAS (Las Vegas)**: MVFR conditions with...
- **En Route**: No significant weather hazards...

### Weather Minimums Check

**User**: "I have personal minimums of 5000ft ceiling and 8 miles visibility. Can I fly VFR in the Denver area today?"

**Assistant**: I'll check the current conditions at Denver area airports against your personal minimums.

[Uses check-vfr-minimums tool with minCeiling: 5000, minVisibility: 8]

The results show:
- **KDEN**: Does not meet minimums - ceiling at 3500ft
- **KBJC**: Meets minimums - ceiling at 8000ft, visibility 10SM
- **KAPA**: Meets minimums - clear skies, visibility 10SM

## Error Handling

The server provides detailed error messages when:
- Invalid airport codes are provided
- Weather data is unavailable
- Network timeouts occur
- Invalid parameters are passed

Example error response:
```json
{
  "content": [{
    "type": "text",
    "text": "Error: Station KZZZ not found"
  }],
  "isError": true
}
```