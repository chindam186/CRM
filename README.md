# ABC Insurance Claims Workspace

Single React (Vite) app with a dashboard landing page and mocked data to match the case study.

## Structure
- src/: React UI

## Quick start
- npm install
- npm run dev

## Notes
- Mock data and document operations are stubbed for the case study.
- RBAC is simulated in the UI for UX.

## PDF Streaming Server

To stream large PDFs locally for testing:

### Prerequisites
- Python 3.x installed on your system.

### Setup
1. Place your large PDF file in the `PDF/` directory within the project root (e.g., `PDF/sample-2.pdf`).

### Running the Server
1. Open a terminal in the project root directory.
2. (Optional) Set the environment variable for a specific PDF:  
   `STREAM_PDF_PATH=PDF/sample-2.pdf`
3. Run the server:  
   `python tools/pdf_stream_server.py`
4. The server will start on `http://localhost:9000/pdf` (default port 9000, configurable via `STREAM_PORT`).

### Usage in UI
1. In the React app, enable "Use streamed PDF".
2. Use the URL `http://localhost:9000/pdf` for the PDF source.

### Stopping the Server
- Press `Ctrl+C` in the terminal to stop the server.

