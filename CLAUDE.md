# Aviation Weather MCP Server

## Project Overview
- Model Context Protocol (MCP) server for aviation weather data
- Uses aviationweather.gov API (official NOAA/NWS source)
- Built with TypeScript, Express.js, and MCP SDK
- Provides real-time aviation weather tools for LLMs

## Development Commands
- `npm run dev` - Development mode with auto-reload
- `npm run build` - TypeScript compilation
- `npm run test` - Jest test suite
- `npm run ci` - Full CI pipeline (lint + test + build)
- `npm run lint:fix` - Auto-fix linting issues

## Code Style & Standards
- Use conventional commits format (`feat:`, `fix:`, `docs:`, `ci:`, etc.)
- TypeScript with strict typing and ES modules
- ESLint with modern flat config
- Prefer explicit error handling over throwing exceptions
- Use `_` prefix for unused function parameters

## Architecture Patterns
- Service layer: `AviationWeatherService` handles all API interactions
- Tool registration: Separate files for weather, analysis, and airport tools
- Error handling: Custom `WeatherError` type with error codes
- Rate limiting: 1-second delay between API requests
- Timeout handling: 10-second timeout with AbortController

## Key Technical Details
- Node.js 22.0.0+ required for ES module support
- Jest 30.0.0 for testing with ESM configuration
- Flight categories: VFR (e3000ft/e5SM), MVFR (1000-2999ft/3-4SM), IFR (500-999ft/1-2SM), LIFR (<500ft/<1SM)
- API base URL: `https://aviationweather.gov/api/data`

## Testing Strategy
- Comprehensive unit tests with mocked HTTP calls
- Test coverage for all tools and services
- Flight category determination logic thoroughly tested
- Use `jest.mock()` for external dependencies

## CI/CD Pipeline
- GitHub Actions on Node.js 18.x, 20.x, 22.x
- Runs lint + test + build on every push/PR
- Release workflow for version tags
- Codecov integration ready

## Deployment
- Status: TBD (deployment documentation pending)
- Requires Node.js hosting with ES module support
- Environment variables: PORT, HOST, NODE_ENV