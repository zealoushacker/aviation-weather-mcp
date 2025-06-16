# Aviation Weather MCP Server

A Model Context Protocol (MCP) server that provides access to aviation weather data from aviationweather.gov. This server enables LLMs to fetch and analyze METAR, TAF, PIREPs, AIRMETs, and other aviation weather information.

## Features

### Weather Data Tools
- **get-metar** - Fetch current METAR observations
- **get-taf** - Fetch Terminal Aerodrome Forecasts
- **get-pireps** - Fetch pilot reports for a geographic area
- **get-airmets** - Fetch Airmen's Meteorological Information
- **get-weather-along-route** - Get weather for departure, destination, and alternates
- **get-weather-by-radius** - Get weather within a specified radius of an airport

### Analysis Tools
- **determine-flight-category** - Determine VFR/MVFR/IFR/LIFR conditions
- **check-vfr-minimums** - Check if conditions meet specified VFR minimums
- **decode-metar** - Decode raw METAR into human-readable format
- **get-station-info** - Get detailed airport/station information

### Prompts
- **vfr-flight-analysis** - Comprehensive VFR flight planning analysis
- **weather-briefing** - Generate a pilot weather briefing
- **ifr-alternate-requirements** - Check IFR alternate requirements

## Installation

### From Source

```bash
git clone https://github.com/zealoushacker/aviation-weather-mcp.git
cd aviation-weather-mcp
npm install
npm run build
```

### Using NPX (when published)

```bash
npx aviation-weather-mcp
```

## Usage

### As a standalone server

The server runs as an HTTP server that can be deployed locally or remotely:

```bash
# From source
node dist/index.js

# Or using npm script
npm start

# Development mode with auto-reload
npm run dev
```

The server will start and display:
- Server URL: `http://localhost:3000` (or configured PORT)
- MCP endpoint: `http://localhost:3000/mcp`
- Health check: `http://localhost:3000/health`

### In Claude Desktop or Claude.ai

For local development, add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "aviation-weather": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

For remote deployment (e.g., on a cloud server):

```json
{
  "mcpServers": {
    "aviation-weather": {
      "url": "https://your-server.com/mcp"
    }
  }
}
```

After adding the configuration, restart Claude Desktop or refresh Claude.ai to connect to the MCP server.

### Testing with MCP Inspector

You can test and debug this server using the MCP Inspector. See the [official MCP Inspector documentation](https://modelcontextprotocol.io/docs/tools/inspector) for installation and usage instructions.

### Environment Variables

- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)
- `NODE_ENV` - Environment mode (development/production)

## Example Tool Usage

### Get METAR for an airport
```json
{
  "tool": "get-metar",
  "parameters": {
    "stations": "KDEN",
    "hoursBack": 2
  }
}
```

### Check weather along a route
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

### Determine flight category
```json
{
  "tool": "determine-flight-category",
  "parameters": {
    "station": "KDEN"
  }
}
```

### Get weather within radius
```json
{
  "tool": "get-weather-by-radius",
  "parameters": {
    "centerAirport": "KDEN",
    "radiusNm": 50,
    "includeMetar": true,
    "includeTaf": true,
    "includePireps": true
  }
}
```

## Data Sources

This server fetches real-time data from:
- [aviationweather.gov](https://aviationweather.gov) - Official NOAA/NWS aviation weather

## Requirements

- Node.js 22.0.0 or higher
- npm or yarn
- Internet connection for accessing aviationweather.gov API

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build TypeScript
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Run full CI pipeline (lint + test + build)
npm run ci
```

## Continuous Integration

This project uses GitHub Actions for automated testing and deployment:

- **CI Pipeline**: Runs on every push and pull request
  - Tests against Node.js 18.x, 20.x, and 22.x
  - Runs linting, tests, and build verification
  - Uploads code coverage reports

- **Release Pipeline**: Runs on version tags
  - Creates GitHub releases
  - Builds and validates the project
  - Ready for NPM publishing (when uncommented)

## API Rate Limits

The aviationweather.gov API does not require authentication, but please be respectful of the service:
- The server implements a 1-second delay between consecutive API requests
- Requests timeout after 10 seconds
- Consider caching responses when appropriate

## Deployment

Deployment documentation is TBD. The server is designed to run on any Node.js hosting platform that supports ES modules.

## Environment Variables

- `NODE_ENV` - Set to 'development' for debug logging
- `PORT` - Port for HTTP transport (default: 3000)

## Project Structure

```
aviation-weather-mcp/
├── src/
│   ├── index.ts           # Main server entry point
│   ├── tools/             # MCP tool implementations
│   ├── prompts/           # MCP prompt templates
│   ├── services/          # Weather API client
│   └── types/             # TypeScript type definitions
├── examples/              # Usage examples
├── dist/                  # Compiled JavaScript
└── package.json
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Disclaimer

This tool is for informational purposes only. Always obtain an official weather briefing before flight. The developer assumes no responsibility for decisions made based on this data.