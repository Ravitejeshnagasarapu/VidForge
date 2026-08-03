<h1 align="center">VidForge</h1>

<p align="center">
  <strong>A modern YouTube downloader built with Java, featuring a responsive web interface, real-time download tracking, and support for high-quality video and audio downloads.</strong>
</p>

<p align="center">

![Java](https://img.shields.io/badge/Java-25_LTS-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2023-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

</p>

---

## Overview

VidForge is a desktop-oriented YouTube downloader that combines a Java backend with a modern web-based interface to provide a simple and efficient download experience. The application uses **yt-dlp** as its download engine and **FFmpeg** for media processing, allowing users to download videos and audio in multiple formats while receiving live progress updates throughout the download process.

The backend manages download sessions, communicates with external tools, processes metadata, and streams real-time events to the frontend using **Server-Sent Events (SSE)**. The frontend presents this information through an interactive interface with live progress tracking, download history, thumbnail previews, and configurable download options.

---

## Key Features

- Download videos in multiple resolutions, including Best Available, 1080p, 1440p, and 4K (when available)
- Extract audio in MP3 and FLAC formats
- Real-time download progress with speed, ETA, and status updates
- Automatic thumbnail retrieval and local caching
- Download cancellation support
- Metadata, thumbnail, and subtitle embedding
- Browser cookie support for restricted content
- Custom output directory selection
- Automatic retry for recoverable network failures
- Live download history
- Responsive dark-themed user interface

---

## Technology Stack

| Category | Technology |
|-----------|------------|
| Backend | Java 25 LTS |
| Frontend | HTML5, CSS3, JavaScript |
| Download Engine | yt-dlp |
| Media Processing | FFmpeg |
| Communication | Server-Sent Events (SSE) |

---

## Project Structure

```text
VidForge/
├── Backend/
│   ├── cache/
│   ├── logs/
│   ├── Main.java
│   ├── DownloadManager.java
│   ├── DownloadController.java
│   ├── DownloadRequest.java
│   └── ...
│
├── Frontend/
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── favicon.svg
│
└── .gitignore
```

---

## Prerequisites

Before running the application, ensure the following software is installed and available in your system **PATH**.

| Software | Version |
|----------|---------|
| Java | 25.0.1 LTS or later |
| yt-dlp | Latest Stable Release |
| FFmpeg | Latest Stable Release |

Verify the installation using:

```bash
java --version
yt-dlp --version
ffmpeg -version
```

---

## Installation

Clone the repository:

```bash
git clone https://github.com/Ravitejeshnagasarapu/VidForge.git
cd VidForge
```

### Install yt-dlp

Download the latest release from:

https://github.com/yt-dlp/yt-dlp/releases/latest

After installation, add the executable to your system **PATH**.

### Install FFmpeg

Download FFmpeg from:

https://ffmpeg.org/download.html

Add the **bin** directory to your system **PATH** after installation.

---

## Running the Application

Start the backend server from the project root.

```bash
java Backend/Main.java
```

Once the server starts, open your browser and navigate to:

```text
http://localhost:8000
```
