# VidForge

## A Java-Powered YouTube Media Downloader

VidForge is a fast and reliable YouTube media downloader built with Java, yt-dlp, and FFmpeg.

It provides a simple workflow for downloading YouTube videos or extracting audio while giving control over the desired format, quality, and output location. Metadata and thumbnails are always embedded, and subtitles are downloaded and embedded for video.

The application combines a Java-based download engine with a web interface to provide a streamlined media downloading experience.

## Overview

VidForge is designed around a straightforward workflow:

1. Provide a YouTube URL.
2. Select the required download mode.
3. Select the desired quality or audio format.
4. Start the download with metadata, thumbnails, and video subtitles enabled by default.
5. Start the download.
6. Monitor the download progress.
7. Receive the completed media file in the configured output directory.

Behind this simple workflow, VidForge handles metadata extraction, yt-dlp process execution, download progress processing, cancellation, retry handling, thumbnail management, file cleanup, and completion reporting.

The Java download engine launches yt-dlp as an external process and processes its output to track the state and progress of an active download.

## Core Capabilities

VidForge currently supports:

* YouTube video downloads
* YouTube audio downloads
* Best available video quality
* 1080p video downloads
* 1440p video downloads
* 2160p video downloads
* MP3 audio extraction
* FLAC audio extraction
* Metadata embedding
* Thumbnail embedding
* Subtitle embedding
* Custom output directories
* Download progress tracking
* Download cancellation
* Retry handling for recoverable failures
* Thumbnail downloading and caching
* Automatic cleanup of partial download files
* Live download status updates through Server-Sent Events

The supported video resolutions are Best Available, 1080p, 1440p, and 2160p.

Audio output currently supports MP3 and FLAC.

## Download Modes

VidForge supports two primary download modes:

### Video

Video downloads can use:

* Best Available
* 1080p
* 1440p
* 2160p

The downloader selects the appropriate yt-dlp format and uses FFmpeg-based processing when separate video and audio streams need to be combined.

### Audio

Audio downloads support:

* MP3
* FLAC

The audio pipeline selects the best available audio stream and uses yt-dlp post-processing to produce the requested audio format.

## Download Management

Each download is handled through its own download session.

A session keeps track of the cancellation state, running process, and execution thread. This allows VidForge to stop an active download when requested instead of simply abandoning the underlying process.
Active sessions are managed through a centralized session manager backed by a `ConcurrentHashMap`.

## Reliability

VidForge includes retry handling for failures that are considered recoverable, including connection failures, socket timeouts, unknown host errors, and certain network-related IO failures.

Only known transient network failures are retried. Invalid or unavailable videos, unsupported formats, and other permanent failures stop immediately instead of waiting through unnecessary backoff. When a retryable failure occurs, the downloader waits using an exponential backoff strategy before attempting the download again. The current configuration allows up to 5 attempts. yt-dlp's final error is included in the terminal message and the browser failure event.
If a download is cancelled or interrupted, VidForge also performs cleanup of incomplete download artifacts. The cleanup system detects files such as `.part`, `.temp`, `.ytdl`, and yt-dlp fragment files and removes them.

## Startup and Progress Responsiveness

Dependency checks run once per backend process, discard version-command output, and have a timeout so a stalled tool probe cannot block a download. yt-dlp skips redundant format-availability checks, uses bounded socket and retry settings, downloads segmented streams with up to 8 concurrent fragments, and limits progress updates to twice per second to reduce avoidable logging and event-stream overhead. In non-interactive terminals, progress and post-processing updates are printed as complete lines rather than overwritten in place.

## Live Progress and Status

VidForge uses Server-Sent Events to communicate download events and status information from the Java backend to connected clients.

The backend can broadcast events such as:

* Download started
* Metadata ready
* Thumbnail ready
* Download completed
* Download failed

The SSE layer also maintains a heartbeat connection to keep active clients connected during long-running downloads.

## Thumbnail Handling

VidForge includes a dedicated thumbnail pipeline.

When a download begins, the application attempts to retrieve the video's thumbnail asynchronously. Downloaded thumbnails are cached locally so that previously retrieved thumbnails can be reused instead of downloaded again.
If the primary thumbnail URL is unavailable, the thumbnail downloader attempts alternative YouTube thumbnail resolutions before reporting a failure.

## Project Architecture

At a high level, VidForge follows this flow:

```text
User
  |
  v
Web Interface
  |
  v
Java HTTP Layer
  |
  v
Download Request
  |
  v
Download Session
  |
  +--------------------+
  |                    |
  v                    v
Metadata Extraction    Thumbnail Pipeline
  |                    |
  v                    v
yt-dlp Process         Thumbnail Cache
  |
  v
Download + Processing
  |
  v
FFmpeg / Media Processing
  |
  v
Output File
```

The frontend provides the user-facing download interface, while the Java backend handles request processing and orchestrates the underlying download pipeline. The frontend also presents the architecture as a pipeline consisting of dependency validation, URL ingestion, metadata extraction, option selection, yt-dlp execution, and browser cookie handling.

## Technology Stack

### Backend

* Java
* Java HTTP Server
* yt-dlp
* FFmpeg
* Server-Sent Events
* Java concurrency utilities
* Java NIO file APIs

### Frontend

* HTML
* CSS
* JavaScript
* Lucide Icons

### Media Processing

* yt-dlp for media extraction and downloading
* FFmpeg for media processing and stream merging

## Current Output Configuration

By default, VidForge stores downloaded audio and video files in the user's Downloads directory. In a Chromium-based browser, select **Browse** (or click the output-folder field) to choose a destination. The browser keeps the full path private; VidForge displays the folder name, transfers the completed file into the selected folder, and removes its temporary copy from Downloads. On browsers without the File System Access API, enter a local folder path manually.

```text
~/Downloads/
```

If no folder is selected, downloads are saved directly to `~/Downloads`.

## Features

### Media Downloads

* Download YouTube videos using the configured video quality.
* Download audio independently from video.
* Select between multiple video quality options.
* Select between MP3 and FLAC for audio downloads.
* Automatically process separate video and audio streams when required.
* Use FFmpeg for media processing and stream merging.

### Video Quality Options

VidForge provides the following video quality selections:

* Best Available
* 1080p
* 1440p
* 2160p

The selected resolution is converted into the corresponding download configuration before the request is passed to the download engine.

### Audio Formats

Audio downloads support:

* MP3
* FLAC

The requested audio format is passed through the download request and used to configure the yt-dlp post-processing pipeline.

### Download Customization

Each download request includes the selected output directory when configured. Media processing is automatic:

* Metadata embedding
* Thumbnail embedding
* Subtitle download and embedding for video

The backend also selects browser cookies automatically if authentication is required.

### Download Progress

VidForge provides live download status and progress information while a download is running.

The backend reads the output generated by yt-dlp, processes progress information, and broadcasts download events to connected clients using Server-Sent Events.

The frontend includes a live download interface with information such as:

* Current download state
* Current file
* Progress
* Download speed
* Download statistics
* Active codec
* Live download history

### Download Cancellation

Active downloads can be cancelled through their associated download session.

When cancellation is requested, VidForge:

* Marks the download as cancelled.
* Stops the running yt-dlp process.
* Interrupts the associated execution thread.
* Removes the completed session from the active session manager.

This allows long-running downloads to be stopped without leaving the underlying process running.

### Retry Handling

VidForge includes retry handling for recoverable download failures.

The backend identifies failures such as connection problems, socket timeouts, unknown host errors, and certain IO failures as retryable conditions.

Retry attempts use an exponential backoff strategy rather than immediately repeating the failed request.

### Thumbnail Management

VidForge includes a dedicated thumbnail pipeline for downloaded media.

The system can:

* Download thumbnails asynchronously.
* Cache downloaded thumbnails locally.
* Reuse an existing cached thumbnail.
* Try alternative YouTube thumbnail resolutions when the primary thumbnail is unavailable.

This separates thumbnail handling from the main download execution path.

### Partial Download Cleanup

VidForge includes automatic cleanup for incomplete download artifacts.

The cleanup system identifies files such as:

* `.part`
* `.temp`
* `.ytdl`
* yt-dlp fragment files

and attempts to remove them after interrupted or incomplete operations.

### Session Management

Each active download receives its own session.

The session manager maintains active sessions in a thread-safe `ConcurrentHashMap`, allowing downloads to be created, retrieved, cancelled, and removed independently.

### Web Interface

VidForge includes a browser-based interface for interacting with the download engine.

The interface provides:

* YouTube URL input
* Download configuration
* Download pipeline visualization
* Live progress information
* Download history
* Architecture visualization
* Interactive simulator

The frontend is designed around the Java download pipeline and provides a visual representation of how a request moves through dependency validation, URL ingestion, metadata extraction, option selection, and yt-dlp execution.

### Browser Cookie Support

VidForge includes browser cookie handling as part of its download pipeline for cases where authenticated browser session information is required.

The frontend architecture describes browser cookie decryption alongside yt-dlp execution as part of the subprocess stage.

### Metadata and Media Information

The download pipeline performs metadata and information extraction before the media download stage.

The frontend architecture represents this stage as the extraction core, including information such as:

* Title
* View count
* Duration
* Playlist or video identification

This information is used as part of the download workflow.
## How VidForge Works

VidForge follows a request-driven download pipeline. A download starts from the frontend, is converted into a structured request, processed by the Java backend, and finally executed through yt-dlp and FFmpeg.

The overall workflow is:

```text
YouTube URL
    |
    v
Frontend Request
    |
    v
Java HTTP Server
    |
    v
Download Request Validation
    |
    v
Download Session Creation
    |
    v
Metadata and Media Information
    |
    v
Download Configuration
    |
    v
yt-dlp Process
    |
    +----------------------+
    |                      |
    v                      v
Video Stream          Audio Stream
    |                      |
    +----------+-----------+
               |
               v
        FFmpeg Processing
               |
               v
        Final Media File
               |
               v
       Download Completion
```

### 1. URL Submission

The process begins when a YouTube URL is submitted through the frontend.

The frontend collects the URL together with the selected download configuration and sends the request to the Java backend.

The web interface is designed around a URL ingestion stage followed by metadata extraction and download format selection.

### 2. Request Processing

The Java HTTP layer receives the download request and converts the incoming request data into a structured `DownloadRequest`.

The request can contain:

* YouTube URL
* Download mode
* Video resolution
* Audio format
* Output directory

Metadata, thumbnails, and video subtitles are enabled automatically. Browser cookies are selected by the backend only when authentication is required.

### 3. Download Session Creation

After the request is accepted, VidForge creates a dedicated download session.

Each session maintains the state required to control an active download, including:

* Cancellation state
* Running process
* Execution thread

Active sessions are tracked by the session manager so that individual downloads can be accessed and cancelled independently.

### 4. Metadata and Media Information

Before the main download operation, the pipeline can obtain information about the requested media.

The application uses this stage to determine information such as the media title, duration, view count, and whether the supplied URL represents a video or playlist.

This information can then be used by the frontend to represent the current download and by the backend to configure the download process.

### 5. Download Configuration

The selected download mode and quality are converted into yt-dlp configuration.

For video downloads, VidForge maps the requested resolution to a format selection strategy.

For example:

```text
Best Available
    -> Best available video and audio

1080p
    -> Video up to 1080p + best available audio

1440p
    -> Video up to 1440p + best available audio

2160p
    -> Video up to 2160p + best available audio
```

For audio downloads, the selected audio format determines the corresponding yt-dlp post-processing configuration.

### 6. yt-dlp Execution

VidForge uses yt-dlp as the underlying media extraction and download engine.

The Java backend builds the required yt-dlp command and starts it as an external process.

The process configuration can include:

* Selected media format
* Output template
* Metadata and thumbnail embedding
* Subtitle downloading and embedding for video
* Automatic browser cookies when authentication is required
* Progress output

The backend then monitors the process while it is running.

### 7. Media Processing

When the selected media requires additional processing, FFmpeg is used as part of the media pipeline.

For high-quality video downloads, video and audio may be obtained as separate streams and then combined into the final output file.

The frontend architecture represents this stage as yt-dlp execution followed by media processing and stream handling.

### 8. Progress Monitoring

While yt-dlp is running, VidForge reads the process output and extracts progress information.

The backend can track information such as:

* Download percentage
* Download speed
* Current state
* Current file
* Completion status

The resulting events are broadcast to connected clients through Server-Sent Events.

This allows the frontend to display the state of a running download instead of waiting for the process to finish before updating the user interface.

### 9. Cancellation

If the user cancels an active download, the backend locates the corresponding download session and requests cancellation.

The cancellation process terminates the associated yt-dlp process and interrupts the execution thread.

The session is then removed from the active session manager.

### 10. Retry Handling

If yt-dlp fails because of a recoverable network-related problem, VidForge can retry the operation.

The retry system identifies specific network and IO failures as retryable and uses exponential backoff between attempts.
This prevents an immediate sequence of repeated requests when a temporary network problem occurs.

### 11. Thumbnail Processing

Thumbnail handling runs as a separate part of the media workflow.

VidForge can download the thumbnail, store it in a local cache, and reuse the cached version when available.
If a requested thumbnail resolution cannot be retrieved, the thumbnail downloader can attempt alternative resolutions.

### 12. Completion and Cleanup

After the download process finishes, VidForge determines whether the operation completed successfully or failed.

For incomplete or interrupted downloads, the cleanup system removes temporary artifacts such as:

```text
.part
.temp
.ytdl
.ytdl-fragments
```

This prevents interrupted downloads from leaving unnecessary temporary files behind.

Once the operation is complete, the download session is removed from the active session manager.

### End-to-End Summary

In simplified form, the complete VidForge workflow is:

```text
User
  |
  v
Submit YouTube URL
  |
  v
Build DownloadRequest
  |
  v
Create DownloadSession
  |
  v
Validate and Configure Request
  |
  v
Extract Media Information
  |
  v
Build yt-dlp Command
  |
  v
Start yt-dlp Process
  |
  +--------------------------+
  |                          |
  v                          v
Progress Monitoring      Thumbnail Handling
  |                          |
  +------------+-------------+
               |
               v
        Media Processing
               |
               v
        FFmpeg Processing
               |
               v
        Final Output File
               |
               v
       Completion / Cleanup
               |
               v
       Remove Active Session
```
## Architecture

VidForge is organized around a Java-based download engine that coordinates HTTP request handling, download sessions, yt-dlp process execution, progress reporting, thumbnail processing, retry handling, and cleanup.

The application separates request handling from download execution and uses dedicated components for managing active sessions, cancellation, thumbnails, retries, and temporary files.

### High-Level Architecture

```text
+----------------------+
|     Web Frontend     |
|  HTML / CSS / JS     |
+----------+-----------+
           |
           | HTTP / SSE
           v
+----------------------+
|   HTTP Server Layer  |
| DownloadController   |
+----------+-----------+
           |
           v
+----------------------+
|   Download Manager   |
|   DownloadManager    |
+----------+-----------+
           |
           +---------------------+
           |                     |
           v                     v
+----------------------+   +----------------------+
| Download Session     |   | Thumbnail Pipeline   |
| Session Manager      |   | ThumbnailDownloader  |
+----------+-----------+   +----------+-----------+
           |                          |
           v                          v
+----------------------+   +----------------------+
| yt-dlp Process       |   | Thumbnail Cache      |
| Execution            |   | ThumbnailCache       |
+----------+-----------+   +----------------------+
           |
           v
+----------------------+
| FFmpeg / Media       |
| Processing           |
+----------+-----------+
           |
           v
+----------------------+
| Final Output Files   |
+----------------------+

Supporting Components:
- RetryPolicy
- CleanupManager
- CancellationToken
- DownloadRequest
- DownloadSession
- DownloadMode
- Resolution
- AudioFormat
```

### Architecture Layers

VidForge can be viewed as several cooperating layers.

#### 1. Frontend Layer

The frontend provides the user interface for submitting URLs, selecting download options, monitoring downloads, and viewing download information.

The interface is implemented using:

* HTML
* CSS
* JavaScript

The frontend communicates with the Java backend and receives live download information through the application's event stream.

The current interface also includes an interactive representation of the Java download pipeline and its major processing stages.

#### 2. HTTP Layer

`DownloadController` acts as the HTTP-facing layer of the backend.

It is responsible for handling download-related requests and exposing endpoints for:

* Starting downloads
* Cancelling downloads
* Receiving live download events

The controller receives the request data, creates the corresponding download request, and passes the operation to the download manager.

This keeps HTTP request handling separate from the actual download execution logic.

#### 3. Download Management Layer

`DownloadManager` coordinates the main download operation.

Its responsibilities include:

* Receiving download requests
* Validating required configuration
* Preparing download settings
* Starting download execution
* Running yt-dlp
* Monitoring process output
* Handling retries
* Managing cancellation
* Reporting download events
* Handling completion and failure

The manager is therefore the central orchestration component of the backend.

#### 4. Request Model

`DownloadRequest` represents the configuration associated with a download.

The request contains information such as:

* URL
* Download mode
* Video resolution
* Audio format
* Output directory

Metadata, thumbnails, and video subtitles are always enabled. The backend selects browser cookies automatically when authentication is required.

#### 5. Download Session Layer

VidForge uses a session-based model for active downloads.

`DownloadSession` stores the state associated with an individual running download, including its cancellation token, process reference, and execution thread.

`DownloadSessionManager` maintains the collection of active sessions.

It uses a `ConcurrentHashMap` so that sessions can be accessed and modified safely while download operations are running concurrently.

The session manager provides operations for:

* Adding sessions
* Finding sessions
* Removing sessions
* Cancelling sessions
* Checking whether a session exists
* Retrieving active sessions

This design allows each download to be controlled independently.

#### 6. Process Execution Layer

The actual media download is performed by launching yt-dlp as an external process.

The Java backend constructs the required command based on the download request and starts the process using Java's process execution APIs.

The process output is then read by the backend so that download progress and status information can be processed while the operation is running.

This approach keeps yt-dlp responsible for media extraction while Java manages the surrounding application logic.

#### 7. Progress and Event Layer

VidForge includes an event broadcasting mechanism for communicating download status to connected clients.

The backend broadcasts events such as:

* Download started
* Metadata ready
* Thumbnail ready
* Download completed
* Download failed

These events are exposed through Server-Sent Events so the frontend can receive updates without repeatedly polling the backend.

The event broadcaster also maintains active client connections and sends heartbeat messages to keep long-running connections alive.

#### 8. Thumbnail Layer

Thumbnail handling is separated from the primary download execution path.

`ThumbnailDownloader` is responsible for retrieving thumbnails, while `ThumbnailCache` handles local caching.

The thumbnail component can:

* Download thumbnails
* Check for an existing cached thumbnail
* Save newly downloaded thumbnails
* Try alternative thumbnail resolutions
* Return the resulting thumbnail path

This allows thumbnail processing to operate independently from the main media download process.

#### 9. Retry Layer

`RetryPolicy` defines the retry behavior used by the download engine.

The implementation distinguishes between retryable and non-retryable failures.

Examples of retryable conditions include:

* Connection failures
* Socket timeouts
* Unknown host errors
* Certain network-related IO failures

The retry policy also calculates the delay between attempts using exponential backoff.
This keeps retry behavior isolated from the rest of the download orchestration logic.

#### 10. Cleanup Layer

`CleanupManager` handles temporary and incomplete download artifacts.

It is responsible for identifying and removing files associated with interrupted or incomplete yt-dlp operations.

The cleanup logic recognizes temporary extensions and yt-dlp fragment files such as:

```text
.part
.temp
.ytdl
.ytdl-fragments
```

It can also perform cleanup based on a specific download identifier.

This prevents temporary download artifacts from accumulating in the output directories.

### Core Java Components

The main backend components can be summarized as follows:

| Component                | Responsibility                                               |
| ------------------------ | ------------------------------------------------------------ |
| `Main`                   | Application entry point and application-level initialization |
| `DownloadController`     | HTTP request handling                                        |
| `DownloadManager`        | Main download orchestration                                  |
| `DownloadRequest`        | Represents download configuration                            |
| `DownloadSession`        | Stores state for an active download                          |
| `DownloadSessionManager` | Tracks active download sessions                              |
| `CancellationToken`      | Controls download cancellation                               |
| `RetryPolicy`            | Determines retry behavior and backoff                        |
| `ThumbnailDownloader`    | Downloads thumbnails                                         |
| `ThumbnailCache`         | Stores and retrieves cached thumbnails                       |
| `CleanupManager`         | Removes incomplete download artifacts                        |
| `DownloadMode`           | Defines download modes                                       |
| `Resolution`             | Defines supported video resolutions                          |
| `AudioFormat`            | Defines supported audio formats                              |

### Component Interaction

The main backend interaction can be summarized as:

```text
DownloadController
        |
        v
DownloadManager
        |
        +----------------------+
        |                      |
        v                      v
DownloadSession       ThumbnailDownloader
        |                      |
        v                      v
yt-dlp Process          ThumbnailCache
        |
        +----------------------+
        |
        +--> RetryPolicy
        |
        +--> CancellationToken
        |
        +--> CleanupManager
        |
        v
Download Completion
```

The architecture keeps the core download operation centralized in `DownloadManager` while supporting functionality such as retries, cancellation, thumbnails, sessions, and cleanup through separate components.

### Design Characteristics

The current architecture emphasizes:

* Separation of HTTP handling from download execution
* Independent management of active download sessions
* Explicit cancellation support
* Dedicated retry handling
* Separate thumbnail processing
* Local thumbnail caching
* Temporary-file cleanup
* Live event delivery through Server-Sent Events
* External process orchestration through Java
* Configuration-driven media selection

This structure allows the individual parts of the downloader to evolve independently while keeping the main download workflow coordinated through the download manager.

## Download Pipeline

VidForge processes each download through a sequence of stages handled by the Java backend. The pipeline combines request parsing, metadata extraction, session management, yt-dlp execution, progress parsing, default media processing, retry handling, thumbnail processing, and cleanup.

### Pipeline Overview

```text
Download Request
      |
      v
Request Parsing
      |
      v
URL Cleaning
      |
      v
Dependency Validation
      |
      v
Download Session
      |
      v
Metadata Extraction
      |
      v
Download Configuration
      |
      v
Thumbnail Processing
      |
      v
Build yt-dlp Command
      |
      v
Start yt-dlp Process
      |
      v
Read Process Output
      |
      v
Parse Progress and Status
      |
      +----------------------+
      |                      |
      v                      v
Retry on Failure       Cancellation Check
      |                      |
      +----------+-----------+
                 |
                 v
       Media Post-Processing
                 |
                 v
        Download Completion
                 |
                 v
             Cleanup
                 |
                 v
        Remove Session
```

### 1. Request Parsing

The download starts with a `DownloadRequest`.

The request contains the information required to configure the download:

```text
- URL
- Download mode
- Video resolution
- Audio format
- Output folder
```

`DownloadRequest.parseJson()` converts the incoming JSON into the corresponding Java objects and configuration values.

The request parser supports the application's numbered download modes as well as string-based mode, resolution, and audio format values.

### 2. URL Cleaning

Before metadata extraction, VidForge normalizes the supplied YouTube URL.

The URL handling logic:

* Adds `https://` when the URL does not contain a protocol.
* Recognizes YouTube URLs.
* Preserves relevant `v` and `list` query parameters.
* Removes unrelated query parameters.

This produces a cleaner URL for the downstream yt-dlp operations.

### 3. Dependency Validation

Before the downloader is initialized, VidForge verifies that the required external commands are available.

The application checks for:

```text
yt-dlp
ffmpeg
```

If yt-dlp is unavailable, the application reports that it is not installed or not available through the system PATH.

If FFmpeg is unavailable, VidForge raises an `FFmpegMissingError` because FFmpeg is required for merging and converting media.

### 4. Download Session Creation

Each download receives a unique download ID and an associated `DownloadSession`.

The session provides access to:

* Cancellation state
* Running process
* Execution thread

The `DownloadManager` retrieves the session before starting the download and uses its cancellation token throughout the pipeline.

### 5. Metadata Extraction

Before starting the actual media download, VidForge requests metadata from yt-dlp.

The metadata extraction process executes:

```text
yt-dlp --dump-json --no-playlist <URL>
```

The resulting JSON is parsed to obtain information including:

```text
- Video ID
- Thumbnail URL
- Title
- Uploader
- Duration
- View count
- Height
- Audio codec
- Video codec
- Extension
- Format information
```

The complete raw JSON response is also retained for additional format and codec analysis.

### 6. Authentication Fallback

If metadata extraction fails because the requested content requires authentication, VidForge attempts browser-cookie based access.

The implementation checks for authentication-related conditions such as:

```text
- Sign in
- Age restricted
- Private video
- Members only
- Premium
- Requires authentication
```

When metadata extraction requires authentication, the downloader tries the available browser cookie stores in sequence:

```text
- Chrome
- Edge
- Brave
- Firefox
```

It attempts the browsers sequentially until metadata extraction succeeds or all configured options fail.

### 7. Active Codec Detection

After metadata extraction, VidForge determines an active codec description for the requested download.

For audio requests, the system can identify formats such as:

```text
- MP3
- FLAC
- M4A
- AAC
- Opus
- Vorbis
```

For video requests, it determines a resolution label and combines it with the detected audio codec.

This information is included in the metadata event sent to the frontend.

### 8. Thumbnail Processing

After metadata becomes available, VidForge starts thumbnail processing.

The thumbnail service receives the media ID and thumbnail URL and processes the thumbnail separately from the primary download execution.

If thumbnail processing succeeds, a `THUMBNAIL_READY` event is broadcast to connected clients.

This allows the frontend to receive thumbnail information without waiting for the entire media download to finish.

### 9. Building the yt-dlp Command

The download command is constructed dynamically from the `DownloadRequest` and extracted metadata.

The base command includes:

```text
yt-dlp
--newline
--no-warnings
--windows-filenames
```

The remaining arguments depend on whether the request is an audio or video download.

### 10. Video Download Configuration

For video downloads, VidForge builds a format selector based on the requested resolution.

For Best Available:

```text
bestvideo+bestaudio/best
```

For a requested resolution:

```text
bestvideo[height<=RESOLUTION]+bestaudio/bestvideo+bestaudio/best
```

The selected streams are then configured to be merged into the default video output format, which is currently MP4.

### 11. Audio Download Configuration

For audio downloads, VidForge selects the best available audio stream:

```text
bestaudio/best
```

It then enables audio extraction and specifies the requested audio format.

The current audio configuration uses the selected format with audio quality `0`.

### 12. Output File Configuration

The output directory is selected from the request.

If a custom output directory is supplied, VidForge creates it when needed and uses it.

Otherwise, it uses the configured default directory:

```text
~/Downloads
```

The output filename is generated using the media title and YouTube ID, with a resolution suffix for video downloads when applicable.

Example structure:

```text
%(title)s_%(id)s_1080p.mp4
```

### 13. Default Media Processing

The command builder always embeds metadata and thumbnails. Video downloads also always download and embed subtitles.

Metadata:

```text
--embed-metadata
```

Thumbnail:

```text
--embed-thumbnail
```

Subtitles for video:

```text
--write-subs
--embed-subs
--sub-langs en,.*
--compat-options no-live-chat
```

These flags are added automatically and are not configurable per download.

### 14. Concurrent Fragment Configuration

VidForge configures yt-dlp to process multiple fragments concurrently.

The current configuration specifies:

```text
--concurrent-fragments 8
```

This value is defined centrally in `Main.Config.CONCURRENT_FRAGMENTS`.
Progress output is explicitly enabled, emitted as newline-delimited records, and throttled with `--progress-delta 0.5` so the backend can parse it without flooding the terminal or event stream.

### 15. Automatic Browser Cookies

If metadata extraction requires authentication, VidForge automatically tries the configured browsers. When a browser succeeds, that browser's cookies are also used for the media download:

```text
--cookies-from-browser <browser>
```

to the yt-dlp command.

This allows the download process to use browser session information when required.

### 16. Starting the Download Process

Once the command has been constructed, VidForge creates a `ProcessBuilder` and starts yt-dlp as an external process.

The backend redirects the process error stream into the standard output stream so that the download manager can process the output through a single reader.

The running process is stored inside the download session, allowing it to be accessed later for cancellation.

### 17. Reading yt-dlp Output

A dedicated reader thread continuously reads the yt-dlp process output.

Each output line is:

1. Read from the process.
2. Logged by the backend.
3. Passed to `ProgressParser`.
4. Interpreted according to the current stage of the download.

The reader stops when the process finishes or the download is cancelled.

### 18. Progress Parsing

`ProgressParser` recognizes yt-dlp output patterns for:

* Download percentage
* Total size
* Download speed
* ETA
* Destination file
* Already downloaded files
* Media merging
* Metadata processing
* Thumbnail processing
* Format conversion
* Errors
* Warnings

The parser updates the internal `ProgressModel` and sends the resulting information to the frontend through SSE events.

A progress event contains information such as:

```text
- Download ID
- Percentage
- Speed
- ETA
- Total size
- Downloaded size
- Current file
- Stream type
- Active codec
```

### 19. Media Processing Stages

The progress parser also recognizes yt-dlp post-processing stages.

For example:

```text
[Merger]
    -> Merging files...

[Metadata]
    -> Adding metadata...

[ThumbnailsConvertor]
    -> Processing thumbnails...

[ExtractAudio]
[VideoConvertor]
    -> Converting formats...
```

These stages are reflected in the backend renderer and status events.

### 20. Retry Processing

If yt-dlp exits unsuccessfully, VidForge determines whether the failure is retryable.

The retry policy excludes user cancellation, interruption, and permanent extraction/download errors from retry processing. Known transient failures such as connection failures, socket timeouts, unknown host errors, HTTP 408/429/5xx responses, and interrupted reads can be retried. The last yt-dlp error line is preserved for the terminal and browser instead of being replaced by a generic exit-code message.

The download manager currently allows up to 5 attempts and uses an exponential backoff based on a base value of 2.

### 21. Cancellation During Execution

Cancellation is checked throughout the download pipeline.

If the cancellation token is triggered:

* The active operation stops.
* The running process can be terminated through the session.
* The download is treated as cancelled rather than retried.
* Partial files are cleaned up.
* A failure event indicating cancellation is sent to connected clients.

The download manager explicitly checks the cancellation token before and during major pipeline stages.

### 22. Completion

When yt-dlp exits with code `0`, the download is considered successful.

The download statistics are then used to construct the completion result, including:

```text
- Download ID
- Title
- Thumbnail
- Output path
- File size
- Format
- Status
```

A `DOWNLOAD_COMPLETE` SSE event is then broadcast to connected clients.

### 23. Cleanup

If a download is cancelled or interrupted, VidForge invokes `CleanupManager`.

The cleanup process scans the configured audio and video directories and removes recognized partial artifacts, including:

```text
.part
.temp
.ytdl
.fXX.mp4
.fXX.m4a
.fXX.webm
```

Failed deletion attempts are retried before the file is finally scheduled for deletion on exit when necessary.

### 24. Session Removal

Regardless of whether the download succeeds, fails, or is cancelled, the download session is removed from the active session manager in the `finally` block.

This ensures that completed or terminated downloads do not remain registered as active sessions.

### Complete Pipeline

The complete execution sequence can therefore be summarized as:

```text
1. Receive DownloadRequest
       |
2. Validate URL
       |
3. Clean YouTube URL
       |
4. Validate yt-dlp and FFmpeg
       |
5. Create DownloadSession
       |
6. Extract metadata using yt-dlp
       |
7. Attempt browser cookies if authentication is required
       |
8. Determine active codec and media information
       |
9. Start thumbnail processing
       |
10. Build yt-dlp command
       |
11. Start yt-dlp process
       |
12. Read process output
       |
13. Parse progress and status
       |
14. Broadcast SSE events
       |
15. Process media and merge streams when required
       |
16. Retry recoverable failures
       |
17. Handle cancellation when requested
       |
18. Generate completion statistics
       |
19. Clean partial files when necessary
       |
20. Remove download session
```
## Tech Stack

### Backend

* Java
* Java HTTP Server
* yt-dlp
* FFmpeg
* Server-Sent Events (SSE)

### Frontend

* HTML
* CSS
* JavaScript

### Development Tools

* Git
* GitHub
* PowerShell / Terminal

## Project Structure

```text id="q7m2xz"
VidForge/
|
+-- Backend/
|   |
|   +-- AudioFormat.java
|   +-- CancellationToken.java
|   +-- CleanupManager.java
|   +-- DownloadController.java
|   +-- DownloadManager.java
|   +-- DownloadMode.java
|   +-- DownloadRequest.java
|   +-- DownloadSession.java
|   +-- DownloadSessionManager.java
|   +-- Exceptions.java
|   +-- ImageLoader.java
|   +-- Main.java
|   +-- Resolution.java
|   +-- RetryPolicy.java
|   +-- ThumbnailCache.java
|   +-- ThumbnailDownloader.java
|   +-- ThumbnailService.java
|
+-- Frontend/
|   |
|   +-- favicon.svg
|   +-- index.html
|   +-- script.js
|   +-- style.css
|
+-- .gitignore
+-- README.md
```

The repository intentionally excludes generated files, compiled Java classes, temporary download artifacts, logs, caches, local configuration files, and other development-specific files through `.gitignore`.

## Requirements

Before running VidForge, the required external dependencies must be available in the system environment.

### Required

* Java Development Kit (JDK)
* yt-dlp
* FFmpeg
* A modern web browser

The backend verifies the availability of yt-dlp and FFmpeg when a download request starts.

## Running the Backend

From the `Backend` directory, compile the Java source files and start the application.

The backend starts an HTTP server on port `8080` and registers the download controller routes.
For safety, the server binds to the local loopback interface and is not directly accessible from other devices on the network.

```powershell
cd Backend

javac -d ../bin *.java

java -cp ../bin Main
```

Once started, the backend is available at:

```text
http://localhost:8080
```

## Running the Frontend

The backend serves the frontend and API from the same origin. After starting
the backend, open:

```text
http://localhost:8080
```

The frontend communicates with the backend to submit YouTube download requests and receive live download events. Only HTTP(S) URLs hosted on YouTube domains are accepted.

## Configuration

Several backend defaults are defined in `Main.Config`.

Current defaults include:

```text id="7q8m1c"
Default output:
~/Downloads

Maximum retries:
5

Retry backoff base:
2

Concurrent fragments:
8

Default video extension:
mp4

Default audio extension:
mp3
```

The application also defines browser options used when authentication fallback is required:

```text
Chrome
Edge
Brave
Firefox
```

These values are centralized in the backend configuration rather than being scattered throughout the download implementation.

## Important Notes

* VidForge relies on yt-dlp for media extraction and downloading.
* FFmpeg is required for media merging and conversion.
* Download availability and supported media formats depend on the source and yt-dlp.
* Browser-cookie based authentication depends on the local browser environment and available session data.
* Downloaded media is stored locally according to the configured output directory.
* Temporary and incomplete download files are cleaned when the application handles interrupted or cancelled downloads.
* This repository represents the current state of the personal VidForge project and its implementation.

## Project Status

VidForge is an actively developed personal project.

The project has been built and refined around a complete Java download pipeline with a browser-based interface, live progress reporting, download session management, retry handling, thumbnail processing, cancellation support, and cleanup mechanisms.

The implementation may continue to evolve as new improvements, fixes, and experiments are made.

## Personal Project

VidForge is a personal software project created for learning, experimentation, development practice, and building a deeper understanding of:

* Java application architecture
* HTTP server development
* External process execution
* Media download pipelines
* yt-dlp integration
* FFmpeg based media processing
* Concurrent task management
* Server-Sent Events
* Frontend and backend integration
* Error handling and retry strategies
* File and cache management

The project is maintained as part of my personal development work and is not presented as an open-source project or community-maintained software package.

## Final Note

VidForge started as a practical project for building a complete media downloading workflow from the ground up.

Rather than relying entirely on a pre-built application layer, the project focuses on understanding and implementing the surrounding engineering required to turn yt-dlp and FFmpeg into a structured application with its own request handling, download sessions, progress system, cancellation flow, retry mechanism, thumbnail pipeline, and browser interface.

The project continues to serve as a practical exploration of Java backend development, system integration, and full-stack application engineering.
