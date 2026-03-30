# Integrated Water Information System (IWIS) - Frontend Dashboard

This is the Next.js frontend for the Integrated Water Information System (IWIS). It provides a real-time, interactive dashboard for monitoring the ecological health of Hartbeespoort Dam, visualizing sensor data, and submitting citizen scientist reports.

## Features
* **Interactive GIS Map:** Visualizes live sensor locations, pollution hotspots, and geotagged citizen reports.
* **Live Dashboards:** Displays time-series graphs for water quality trends (nitrates, temperature, pH) and current weather conditions.
* **Dynamic Alerts:** Surfaces real-time automated alerts from the backend when ecological danger thresholds are crossed.
* **Real-Time EDA:** A dedicated Data Analysis view featuring a live, color-coded Pearson correlation matrix to track environmental variables.
* **Citizen Reporting:** A dedicated form for field workers and citizens to log environmental concerns with map-pinning capabilities.

## Prerequisites
* Node.js (v18+)
* npm, pnpm, or yarn

## Installation & Setup

**1. Clone the repo 
```bash
git clone git@github.com:LiefsEmma/iwis-frontend.git
```

**2. Install dependencies**
```bash
npm install
```

**3. Configure enviornment variables**

> Create a `.env.local` file in the root of the repo `iwis-frontend and define the backend API URL
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## Running the application
**1. Start the development server**
```bash
npm run dev
```

## Project structure
- `src/app/page.tsx`: Main dashboard view layout.
- `src/app/reports/new/page.tsx`: Citizen report submission form.
- `src/app/data-analysis/page.tsx`: Real-time exploratory data analysis and correlation matrix.
- `src/components/`: Resuable UI components (Maps, Charts).
- `src/lib/`; Data fetching logic
