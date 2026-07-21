import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.logging.*;
import java.util.regex.*;
import java.util.concurrent.atomic.AtomicReference;
import java.nio.charset.Charset;
import com.sun.net.httpserver.*;
import java.net.InetSocketAddress;

public class Main {

    // ==========================================
    // SSE BROADCASTER
    // ==========================================
    public static class SSEBroadcaster {
        private static final List<HttpExchange> clients = Collections.synchronizedList(new ArrayList<>());
        
        public static void register(HttpExchange exchange) {
            try {
                exchange.getResponseHeaders().add("Content-Type", "text/event-stream");
                exchange.getResponseHeaders().add("Cache-Control", "no-cache");
                exchange.getResponseHeaders().add("Connection", "keep-alive");
                exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
                exchange.sendResponseHeaders(200, 0);
                clients.add(exchange);
                broadcast("STATUS", "{\"message\":\"Connected to server.\"}");
            } catch(Exception e) {
                e.printStackTrace();
            }
        }
        
        public static void broadcast(String event, String data) {
            String payload = "event: " + event + "\ndata: " + data + "\n\n";
            byte[] bytes = payload.getBytes(Charset.forName("UTF-8"));
            synchronized (clients) {
                Iterator<HttpExchange> it = clients.iterator();
                while (it.hasNext()) {
                    HttpExchange ex = it.next();
                    try {
                        ex.getResponseBody().write(bytes);
                        ex.getResponseBody().flush();
                    } catch (IOException e) {
                        it.remove();
                    }
                }
            }
        }
        
        public static void broadcast(String event, Map<String, String> dataMap) {
            StringBuilder json = new StringBuilder("{");
            boolean first = true;
            for (Map.Entry<String, String> entry : dataMap.entrySet()) {
                if (!first) json.append(",");
                json.append("\"").append(entry.getKey()).append("\":\"").append(escapeJson(entry.getValue())).append("\"");
                first = false;
            }
            json.append("}");
            broadcast(event, json.toString());
        }
        
        public static String escapeJson(String text) {
            if (text == null) return "";
            return text.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
        }
    }

    // ==========================================
    // CONFIGURATION
    // ==========================================
    public static class Config {
        public static final String USER_HOME = System.getProperty("user.home");
        public static final String AUDIO_PATH = Paths.get(USER_HOME, "Downloads", "YouTube_Audio").toString();
        public static final String VIDEO_PATH = Paths.get(USER_HOME, "Downloads", "YouTube_Video").toString();
        public static final String LOG_DIR = "logs";

        public static final int MAX_RETRIES = 5;
        public static final int BASE_BACKOFF = 2;
        public static final int CONCURRENT_FRAGMENTS = 5;

        public static final boolean EMBED_METADATA = true;
        public static final boolean EMBED_THUMBNAIL = true;
        public static final boolean EMBED_SUBTITLES = true;

        public static final String DEFAULT_VIDEO_EXT = "mp4";
        public static final String DEFAULT_AUDIO_EXT = "mp3";

        public static final List<String> BROWSERS_TO_TRY = Arrays.asList("chrome", "edge", "brave", "firefox");
    }

    // ==========================================
    // TERMINAL CAPABILITIES
    // ==========================================
    public static class TerminalCapabilities {
        public static final boolean IS_WINDOWS = System.getProperty("os.name").toLowerCase().contains("win");
        private static Integer cachedWidth = null;
        private static Boolean ansiSupported = null;
        private static Boolean unicodeSupported = null;
        
        public static boolean supportsAnsi() {
            if (ansiSupported != null) return ansiSupported;
            if (System.console() == null) {
                ansiSupported = false;
                return false;
            }
            if (!IS_WINDOWS) {
                ansiSupported = true;
                return true;
            }
            
            String term = System.getenv("TERM");
            if (term != null && (term.contains("xterm") || term.contains("color") || term.contains("ansi"))) {
                ansiSupported = true; return true;
            }
            if (System.getenv("WT_SESSION") != null) {
                ansiSupported = true; return true;
            }
            if (System.getenv("ANSICON") != null) {
                ansiSupported = true; return true;
            }
            if (System.getenv("ConEmuANSI") != null) {
                ansiSupported = true; return true;
            }
            if ("true".equalsIgnoreCase(System.getenv("IDEA_INITIAL_DIRECTORY") != null ? "true" : "false")) {
                ansiSupported = true; return true;
            }
            
            ansiSupported = false;
            return false;
        }

        public static boolean supportsUnicode() {
            if (unicodeSupported != null) return unicodeSupported;
            
            String outEnc = System.getProperty("stdout.encoding");
            if (outEnc == null) outEnc = System.getProperty("sun.stdout.encoding");
            if (outEnc == null) outEnc = Charset.defaultCharset().name();
            
            boolean isUTF8 = isUtf8(outEnc);
            
            if (!IS_WINDOWS) {
                unicodeSupported = isUTF8;
                return unicodeSupported;
            }
            
            if (!isUTF8) {
                unicodeSupported = false;
                return false;
            }
            
            if (System.getenv("WT_SESSION") != null) { unicodeSupported = true; return true; }
            if (System.getenv("TERM_PROGRAM") != null && System.getenv("TERM_PROGRAM").contains("vscode")) { unicodeSupported = true; return true; }
            if (System.getenv("IDEA_INITIAL_DIRECTORY") != null) { unicodeSupported = true; return true; }
            
            unicodeSupported = false;
            return false;
        }
        
        private static boolean isUtf8(String enc) {
            return enc != null && (enc.equalsIgnoreCase("UTF-8") || enc.equalsIgnoreCase("UTF8"));
        }
        
        public static int getTerminalWidth() {
            if (cachedWidth != null) return cachedWidth;
            
            String colEnv = System.getenv("COLUMNS");
            if (colEnv != null) {
                try { cachedWidth = Integer.parseInt(colEnv); return cachedWidth; } catch (Exception e) {}
            }
            
            try {
                if (!IS_WINDOWS) {
                    Process p = new ProcessBuilder("sh", "-c", "tput cols").start();
                    BufferedReader reader = new BufferedReader(new InputStreamReader(p.getInputStream()));
                    String line = reader.readLine();
                    if (line != null) {
                        cachedWidth = Integer.parseInt(line.trim());
                        return cachedWidth;
                    }
                } else {
                    Process p = new ProcessBuilder("cmd", "/c", "mode con").start();
                    BufferedReader reader = new BufferedReader(new InputStreamReader(p.getInputStream()));
                    String line;
                    while ((line = reader.readLine()) != null) {
                        if (line.contains("Columns:")) {
                            cachedWidth = Integer.parseInt(line.split(":")[1].trim());
                            return cachedWidth;
                        }
                    }
                }
            } catch (Exception e) {}
            cachedWidth = 100;
            return cachedWidth;
        }
    }
    
    // ==========================================
    // ICONS (Dynamic Unicode / ASCII fallback)
    // ==========================================
    public static class Icons {
        private static final boolean U = TerminalCapabilities.supportsUnicode();
        
        public static final String ROCKET = U ? "🚀" : "====";
        public static final String SUCCESS = U ? "✅" : "[OK]";
        public static final String ERROR = U ? "❌" : "[FAIL]";
        public static final String WARNING = U ? "⚠️" : "[WARN]";
        public static final String ARROW = U ? "➡️" : "->";
        public static final String TARGET = U ? "🎯" : "[*]";
        public static final String PIN = U ? "📌" : "[-]";
        public static final String LINK = U ? "🔗" : "[>]";
        
        public static final String BLOCK_FULL = U ? "█" : "#";
        public static final String BLOCK_EMPTY = U ? "░" : "-";
    }

    // ==========================================
    // CONSOLE RENDERER
    // ==========================================
    public static class ConsoleRenderer {
        public static final boolean USE_ANSI = TerminalCapabilities.supportsAnsi();
        
        public static final String ANSI_RESET = USE_ANSI ? "\033[0m" : "";
        public static final String ANSI_BOLD = USE_ANSI ? "\033[1m" : "";
        public static final String ANSI_BLUE = USE_ANSI ? "\033[94m" : "";
        public static final String ANSI_CYAN = USE_ANSI ? "\033[96m" : "";
        public static final String ANSI_GREEN = USE_ANSI ? "\033[92m" : "";
        public static final String ANSI_YELLOW = USE_ANSI ? "\033[93m" : "";
        public static final String ANSI_RED = USE_ANSI ? "\033[91m" : "";
        public static final String ANSI_MAGENTA = USE_ANSI ? "\033[95m" : "";
        
        public static final String ANSI_CLEAR_LINE = USE_ANSI ? "\033[2K" : "";
        public static final String ANSI_COLUMN_1 = USE_ANSI ? "\033[G" : "\r";

        public static synchronized void printBanner() {
            println(ANSI_CYAN + ANSI_BOLD + Icons.ROCKET + " PRODUCTION-GRADE YOUTUBE DOWNLOADER " + Icons.ROCKET);
            println(ANSI_RESET + ANSI_BLUE + "Powered by yt-dlp & pure Java" + ANSI_RESET + "\n");
        }

        public static synchronized void header(String title) {
            println("\n" + ANSI_BOLD + ANSI_MAGENTA + Icons.PIN + " " + title + ANSI_RESET);
        }

        public static synchronized void step(String message) {
            println(ANSI_BLUE + Icons.ARROW + "  " + message + ANSI_RESET);
        }

        public static synchronized void success(String message) {
            println(ANSI_GREEN + Icons.SUCCESS + " " + message + ANSI_RESET);
        }

        public static synchronized void warning(String message) {
            println(ANSI_YELLOW + Icons.WARNING + " " + message + ANSI_RESET);
        }

        public static synchronized void error(String message) {
            println(ANSI_RED + Icons.ERROR + " " + message + ANSI_RESET);
        }
        
        public static synchronized void info(String message) {
            println(ANSI_CYAN + message + ANSI_RESET);
        }
        
        public static synchronized void inputPrompt(String prompt) {
            System.out.print(ANSI_BOLD + Icons.LINK + " " + prompt + ANSI_RESET + " ");
            System.out.flush();
        }

        public static synchronized void println(String message) {
            System.out.println(message);
        }

        public static synchronized void print(String message) {
            System.out.print(message);
            System.out.flush();
        }
    }

    // ==========================================
    // PROGRESS MODEL & RENDERER
    // ==========================================
    public static class ProgressModel {
        public String percent = "0.0";
        public String speed = "0.00 KiB/s";
        public String eta = "00:00";
        public String downloadedSize = "0.00 MiB";
        public String totalSize = "0.00 MiB";
        public String currentFile = "Unknown";
        public String streamType = "Video";
        public String activeCodec = "-- • --";
        
        public float peakSpeed = 0;
    }
    
    public static class Spinner {
        private static final String[] FRAMES = TerminalCapabilities.supportsUnicode() 
            ? new String[]{"⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"}
            : new String[]{"-", "\\", "|", "/"};
        private int currentFrame = 0;
        private Thread thread;
        private volatile boolean running = false;
        private String message;

        public synchronized void start(String message) {
            this.message = message;
            if (running) return;
            running = true;
            thread = new Thread(() -> {
                try {
                    while (running) {
                        String frame = FRAMES[currentFrame % FRAMES.length];
                        currentFrame++;
                        String out = (ConsoleRenderer.USE_ANSI ? ConsoleRenderer.ANSI_COLUMN_1 : "\r") 
                            + ConsoleRenderer.ANSI_CYAN + frame + " " + this.message + ConsoleRenderer.ANSI_RESET;
                        
                        int width = TerminalCapabilities.getTerminalWidth();
                        String plain = out.replaceAll("\033\\[[;\\d]*m", "");
                        int pad = Math.max(0, width - 1 - plain.length());
                        StringBuilder padded = new StringBuilder(out);
                        for (int i = 0; i < pad; i++) padded.append(" ");
                        
                        ConsoleRenderer.print(padded.toString());
                        Thread.sleep(100);
                    }
                } catch (InterruptedException e) {}
            });
            thread.setDaemon(true);
            thread.start();
        }

        public synchronized void stop() {
            running = false;
            if (thread != null) {
                thread.interrupt();
            }
        }
    }

    public static class ProgressRenderer {
        private boolean isRendering = false;
        private String lastPercent = "";
        private String lastSpeed = "";
        private Spinner spinner = new Spinner();

        public synchronized void update(ProgressModel stats) {
            spinner.stop();
            
            if (stats.percent.equals(lastPercent) && stats.speed.equals(lastSpeed)) {
                return; 
            }
            lastPercent = stats.percent;
            lastSpeed = stats.speed;
            
            isRendering = true;
            int width = TerminalCapabilities.getTerminalWidth();
            
            String stateStr = String.format(" %s%% | %s | ETA %s", stats.percent, stats.speed, stats.eta);
            String sizesStr = String.format(" | %s / %s ", stats.downloadedSize, stats.totalSize);
            String fileStr = " | " + stats.currentFile;
            
            int maxBarWidth = 30;
            String prefix = "Downloading " + stats.streamType + " []";
            int baseLength = prefix.length() + stateStr.length() + sizesStr.length();
            
            int barWidth = Math.min(maxBarWidth, width - 1 - baseLength - fileStr.length());
            if (barWidth < 10) {
                barWidth = 10;
                int allowedFileLength = width - 1 - baseLength - barWidth;
                if (allowedFileLength < 10) {
                    fileStr = ""; 
                } else if (fileStr.length() > allowedFileLength) {
                    fileStr = " | " + truncateMiddle(stats.currentFile, allowedFileLength - 3);
                }
            }
            
            float p = 0;
            try { p = Float.parseFloat(stats.percent); } catch (Exception e) {}
            
            int filled = (int) (barWidth * (p / 100.0f));
            int empty = barWidth - filled;
            if (filled < 0) filled = 0;
            if (empty < 0) empty = 0;
            
            StringBuilder bar = new StringBuilder();
            bar.append("[");
            for (int i = 0; i < filled; i++) bar.append(Icons.BLOCK_FULL);
            for (int i = 0; i < empty; i++) bar.append(Icons.BLOCK_EMPTY);
            bar.append("]");
            
            String output = ConsoleRenderer.ANSI_CYAN + "Downloading " + stats.streamType + " " 
                + ConsoleRenderer.ANSI_GREEN + bar.toString() 
                + ConsoleRenderer.ANSI_YELLOW + stateStr + ConsoleRenderer.ANSI_BLUE + sizesStr 
                + ConsoleRenderer.ANSI_MAGENTA + fileStr + ConsoleRenderer.ANSI_RESET;
            
            String newLine = (ConsoleRenderer.USE_ANSI ? ConsoleRenderer.ANSI_COLUMN_1 : "\r") + output;
            
            String plain = newLine.replaceAll("\033\\[[;\\d]*m", "");
            int pad = Math.max(0, width - 1 - plain.length());
            StringBuilder padded = new StringBuilder(newLine);
            for (int i = 0; i < pad; i++) padded.append(" ");
            
            ConsoleRenderer.print(padded.toString());
        }

        public synchronized void clear() {
            spinner.stop();
            if (!isRendering) return;
            if (ConsoleRenderer.USE_ANSI) {
                ConsoleRenderer.print(ConsoleRenderer.ANSI_COLUMN_1 + ConsoleRenderer.ANSI_CLEAR_LINE);
            } else {
                int w = TerminalCapabilities.getTerminalWidth();
                StringBuilder spaces = new StringBuilder("\r");
                for (int i = 0; i < w - 1; i++) spaces.append(" ");
                spaces.append("\r");
                ConsoleRenderer.print(spaces.toString());
            }
            isRendering = false;
        }

        public synchronized void startPhase(String message) {
            clear();
            spinner.start(message);
        }
        
        public synchronized void complete() {
            clear();
        }
        
        private String truncateMiddle(String text, int maxLength) {
            if (text == null || text.length() <= maxLength) return text;
            if (maxLength <= 3) return "...";
            int keep = (maxLength - 3) / 2;
            return text.substring(0, keep) + "..." + text.substring(text.length() - keep);
        }
    }

    // ==========================================
    // PROGRESS PARSER
    // ==========================================
    public static class ProgressParser {
        private static final Pattern PROGRESS_PATTERN = Pattern.compile("\\[download\\]\\s+([\\d\\.]+%)\\s+of\\s+([^\\s]+)\\s+at\\s+([^\\s]+)\\s+ETA\\s+([\\d:]+)");
        private static final Pattern DEST_PATTERN = Pattern.compile("\\[download\\] Destination: (.*)");
        private static final Pattern ALREADY_DOWNLOADED = Pattern.compile("\\[download\\] (.*) has already been downloaded");
        private static final Pattern MERGE_PATTERN = Pattern.compile("\\[Merger\\] Merging formats into \"(.*)\"");
        
        public static void parseLine(String line, ProgressRenderer renderer, ProgressModel model, DownloadStatistics stats) {
            if (line == null || line.trim().isEmpty()) return;
            
            if (line.startsWith("[download]")) {
                Matcher destM = DEST_PATTERN.matcher(line);
                if (destM.find()) {
                    renderer.clear();
                    String fullPath = destM.group(1).trim();
                    model.currentFile = Paths.get(fullPath).getFileName().toString();
                    
                    if (fullPath.endsWith(".m4a") || fullPath.endsWith(".webm") || fullPath.endsWith(".mp3") || fullPath.endsWith(".flac")) {
                        model.streamType = "Audio";
                    } else {
                        model.streamType = "Video";
                    }
                    return;
                }
                
                Matcher alreadyM = ALREADY_DOWNLOADED.matcher(line);
                if (alreadyM.find()) {
                    renderer.clear();
                    String fullPath = alreadyM.group(1).trim();
                    stats.lastKnownFilePath = fullPath;
                    ConsoleRenderer.println("\n" + ConsoleRenderer.ANSI_CYAN + "===========================");
                    ConsoleRenderer.println(ConsoleRenderer.ANSI_BOLD + "FILE ALREADY EXISTS");
                    ConsoleRenderer.println(ConsoleRenderer.ANSI_CYAN + "===========================" + ConsoleRenderer.ANSI_RESET);
                    ConsoleRenderer.println("Location: " + fullPath);
                    ConsoleRenderer.println("Skipping download.");
                    return;
                }
                
                Matcher m = PROGRESS_PATTERN.matcher(line);
                if (m.find()) {
                    model.percent = m.group(1).replace("%", "");
                    model.totalSize = m.group(2).replace("~", "");
                    model.speed = m.group(3);
                    model.eta = m.group(4);
                    
                    try {
                        float spd = Float.parseFloat(model.speed.replaceAll("[^\\d\\.]", ""));
                        String unit = model.speed.replaceAll("[\\d\\.]", "").trim().toLowerCase();
                        if (unit.startsWith("k")) spd = spd / 1024f;
                        else if (unit.startsWith("g")) spd = spd * 1024f;
                        if (spd > model.peakSpeed) model.peakSpeed = spd;
                    } catch (Exception e) {}
                    
                    try {
                        float tSize = Float.parseFloat(model.totalSize.replaceAll("[^\\d\\.]", ""));
                        float p = Float.parseFloat(model.percent);
                        String unit = model.totalSize.replaceAll("[\\d\\.]", "");
                        model.downloadedSize = String.format("%.2f%s", tSize * (p / 100.0f), unit);
                    } catch (Exception e) {}
                    
                    renderer.update(model);
                    Map<String, String> map = new HashMap<>();
                    map.put("percent", model.percent);
                    map.put("speed", model.speed);
                    map.put("eta", model.eta);
                    map.put("totalSize", model.totalSize);
                    map.put("downloadedSize", model.downloadedSize);
                    map.put("currentFile", model.currentFile);
                    map.put("streamType", model.streamType);
                    map.put("activeCodec", model.activeCodec != null ? model.activeCodec : "-- • --");
                    SSEBroadcaster.broadcast("PROGRESS", map);
                } else if (line.contains("100%")) {
                    model.percent = "100";
                    model.speed = "0.00 KiB/s";
                    model.eta = "00:00";
                    model.downloadedSize = model.totalSize;
                    renderer.update(model);
                    Map<String, String> map = new HashMap<>();
                    map.put("percent", model.percent);
                    map.put("speed", model.speed);
                    map.put("eta", model.eta);
                    map.put("totalSize", model.totalSize);
                    map.put("downloadedSize", model.downloadedSize);
                    map.put("currentFile", model.currentFile);
                    map.put("streamType", model.streamType);
                    map.put("activeCodec", model.activeCodec != null ? model.activeCodec : "-- • --");
                    SSEBroadcaster.broadcast("PROGRESS", map);
                }
            } else if (line.startsWith("[Merger]")) {
                Matcher m = MERGE_PATTERN.matcher(line);
                if (m.find()) {
                    stats.lastKnownFilePath = m.group(1).trim();
                }
                renderer.startPhase("Merging files...");
            } else if (line.startsWith("[Metadata]")) {
                renderer.startPhase("Adding metadata...");
            } else if (line.startsWith("[ThumbnailsConvertor]")) {
                renderer.startPhase("Processing thumbnails...");
            } else if (line.startsWith("[ExtractAudio]") || line.startsWith("[VideoConvertor]")) {
                renderer.startPhase("Converting formats...");
            } else if (line.toLowerCase().contains("error")) {
                renderer.clear();
                ConsoleRenderer.println("");
                ConsoleRenderer.error(line.trim());
                SSEBroadcaster.broadcast("ERROR", "{\"message\":\"" + SSEBroadcaster.escapeJson(line.trim()) + "\"}");
            } else if (line.toLowerCase().contains("warning")) {
                renderer.clear();
                ConsoleRenderer.println("");
                ConsoleRenderer.warning(line.trim());
                SSEBroadcaster.broadcast("WARNING", "{\"message\":\"" + SSEBroadcaster.escapeJson(line.trim()) + "\"}");
            } else {
                logger.fine(line);
                SSEBroadcaster.broadcast("STATUS", "{\"message\":\"" + SSEBroadcaster.escapeJson(line.trim()) + "\"}");
            }
        }
    }

    // ==========================================
    // DOWNLOAD STATISTICS
    // ==========================================
    public static class DownloadStatistics {
        public long startTime;
        public long endTime;
        public String title = "Unknown";
        public String resolution = "Unknown";
        public String format = "Unknown";
        public String outputDir = "Unknown";
        public String lastKnownFilePath = null;
        
        public void start() {
            startTime = System.currentTimeMillis();
        }
        
        public void stop() {
            endTime = System.currentTimeMillis();
        }
        
        public String getElapsedTime() {
            long duration = (endTime > 0 ? endTime : System.currentTimeMillis()) - startTime;
            long hours = duration / 3600000;
            long minutes = (duration % 3600000) / 60000;
            long seconds = (duration % 60000) / 1000;
            if (hours > 0) return String.format("%02d:%02d:%02d", hours, minutes, seconds);
            return String.format("%02d:%02d", minutes, seconds);
        }

        public String getActualFileSize() {
            if (lastKnownFilePath != null) {
                try {
                    long bytes = Files.size(Paths.get(lastKnownFilePath));
                    if (bytes < 1024) return bytes + " B";
                    int exp = (int) (Math.log(bytes) / Math.log(1024));
                    String pre = "KMGTPE".charAt(exp - 1) + "i";
                    return String.format("%.2f %sB", bytes / Math.pow(1024, exp), pre);
                } catch (Exception e) {}
            }
            return "Unknown";
        }
    }

    // ==========================================
    // CUSTOM EXCEPTIONS
    // ==========================================
    public static class DownloaderException extends RuntimeException {
        public DownloaderException(String message) { super(message); }
    }
    public static class FFmpegMissingError extends DownloaderException {
        public FFmpegMissingError(String message) { super(message); }
    }
    public static class ExtractionError extends DownloaderException {
        public ExtractionError(String message) { super(message); }
    }
    public static class NetworkOrRetryError extends DownloaderException {
        public NetworkOrRetryError(String message) { super(message); }
    }

    // ==========================================
    // HELPERS & LOGGING
    // ==========================================
    private static final Logger logger = Logger.getLogger("yt_downloader");

    static {
        try {
            Files.createDirectories(Paths.get(Config.LOG_DIR));
            FileHandler fileHandler = new FileHandler(Config.LOG_DIR + "/yt_downloader.log", true);
            fileHandler.setFormatter(new SimpleFormatter());
            logger.addHandler(fileHandler);
            logger.setUseParentHandlers(false);
        } catch (IOException e) {
            System.err.println("Failed to initialize logger.");
        }
    }

    public static void validateDependencies() {
        if (!isCommandAvailable("yt-dlp")) {
            ConsoleRenderer.error("yt-dlp is not installed or not in PATH.");
            System.exit(1);
        }
        if (!isCommandAvailable("ffmpeg")) {
            throw new FFmpegMissingError("FFmpeg is not installed or not in PATH. It is required for merging and converting.");
        }
    }

    private static boolean isCommandAvailable(String command) {
        try {
            String arg = command.equals("ffmpeg") ? "-version" : "--version";
            Process p = new ProcessBuilder(command, arg).start();
            return p.waitFor() == 0;
        } catch (Exception e) {
            return false;
        }
    }

    public static String cleanYoutubeUrl(String url) {
        try {
            if (!url.startsWith("http")) url = "https://" + url;
            if (url.contains("youtube.com") || url.contains("youtu.be")) {
                Matcher m = Pattern.compile("([&?]v=[^&]+)|([&?]list=[^&]+)").matcher(url);
                StringBuilder cleanUrl = new StringBuilder(url.split("\\?")[0]);
                boolean first = true;
                while (m.find()) {
                    cleanUrl.append(first ? "?" : "&").append(m.group().substring(1));
                    first = false;
                }
                return cleanUrl.toString();
            }
        } catch (Exception e) {
            logger.warning("URL parsing failed for " + url + ": " + e.getMessage());
        }
        return url;
    }

    // ==========================================
    // CORE DOWNLOADER CLASS
    // ==========================================
    public static class YouTubeDownloader {
        private String activeBrowser = null;
        private DownloadStatistics stats = new DownloadStatistics();
        private ProgressRenderer renderer = new ProgressRenderer();
        private ProgressModel progressModel = new ProgressModel();

        public YouTubeDownloader() {
            try {
                Files.createDirectories(Paths.get(Config.AUDIO_PATH));
                Files.createDirectories(Paths.get(Config.VIDEO_PATH));
            } catch (IOException e) {
                ConsoleRenderer.error("Failed to create output directories.");
            }
            validateDependencies();
        }

        private boolean requiresAuthentication(String errorMsg) {
            String lower = errorMsg.toLowerCase();
            return lower.contains("sign in") || lower.contains("age-restricted") ||
                   lower.contains("private video") || lower.contains("members-only") ||
                   lower.contains("premium") || lower.contains("requires authentication");
        }

        public Map<String, String> getMetadata(String url) {
            ConsoleRenderer.step("Extracting video information...");
            
            try {
                return executeDumpJson(url, null);
            } catch (Exception e) {
                if (!requiresAuthentication(e.getMessage())) {
                    throw new ExtractionError("Video unavailable: " + e.getMessage());
                }
            }

            ConsoleRenderer.warning("Authentication required. Attempting to use browser cookies...");
            for (String browser : Config.BROWSERS_TO_TRY) {
                ConsoleRenderer.step("Attempting to use " + browser + " cookies...");
                try {
                    Map<String, String> info = executeDumpJson(url, browser);
                    ConsoleRenderer.success("Successfully loaded cookies from " + browser);
                    this.activeBrowser = browser;
                    return info;
                } catch (Exception e) {
                    logger.warning("Failed with " + browser + ": " + e.getMessage());
                    if (!requiresAuthentication(e.getMessage())) {
                        throw new ExtractionError("Failed to extract info: " + e.getMessage());
                    }
                }
            }

            ConsoleRenderer.error("Authentication is required for this video.");
            ConsoleRenderer.error("Unable to access browser cookies. Please close your browser and try again.");
            throw new ExtractionError("Authentication required and no cookies available.");
        }

        private Map<String, String> executeDumpJson(String url, String browser) throws IOException, InterruptedException {
            List<String> cmd = new ArrayList<>(Arrays.asList("yt-dlp", "--dump-json", "--no-playlist"));
            if (browser != null) {
                cmd.add("--cookies-from-browser");
                cmd.add(browser);
            }
            cmd.add(url);

            ProcessBuilder pb = new ProcessBuilder(cmd);
            Process p = pb.start();
            
            BufferedReader reader = new BufferedReader(new InputStreamReader(p.getInputStream(), "UTF-8"));
            BufferedReader errorReader = new BufferedReader(new InputStreamReader(p.getErrorStream(), "UTF-8"));
            
            String jsonOutput = reader.readLine();
            StringBuilder errors = new StringBuilder();
            String line;
            while ((line = errorReader.readLine()) != null) errors.append(line).append("\n");
            
            int exitCode = p.waitFor();
            if (exitCode != 0 || jsonOutput == null) {
                throw new IOException(errors.toString().trim());
            }

            Map<String, String> metadata = new HashMap<>();
            metadata.put("id", extractJsonString(jsonOutput, "id"));
            metadata.put("thumbnail", extractJsonString(jsonOutput, "thumbnail"));
            metadata.put("title", extractJsonString(jsonOutput, "title"));
            metadata.put("uploader", extractJsonString(jsonOutput, "uploader"));
            metadata.put("duration", extractJsonNumber(jsonOutput, "duration"));
            metadata.put("view_count", extractJsonNumber(jsonOutput, "view_count"));
            metadata.put("height", extractJsonNumber(jsonOutput, "height"));
            metadata.put("acodec", extractJsonString(jsonOutput, "acodec"));
            metadata.put("vcodec", extractJsonString(jsonOutput, "vcodec"));
            metadata.put("ext", extractJsonString(jsonOutput, "ext"));
            metadata.put("format_note", extractJsonString(jsonOutput, "format_note"));
            metadata.put("raw_json", jsonOutput);
            metadata.put("is_playlist", jsonOutput.contains("\"_type\": \"playlist\"") ? "true" : "false");
            
            return metadata;
        }

        private String extractJsonString(String json, String key) {
            Matcher m = Pattern.compile("\"" + key + "\":\\s*\"(.*?)\"").matcher(json);
            return m.find() ? m.group(1).replace("\\\"", "\"") : "Unknown";
        }

        private String extractJsonNumber(String json, String key) {
            Matcher m = Pattern.compile("\"" + key + "\":\\s*(\\d+)").matcher(json);
            return m.find() ? m.group(1) : "0";
        }

// download and executeDownloadWithRetries moved to DownloadManager
    }

    // ==========================================
    // HTTP SERVER & ENTRY POINT
    // ==========================================
    public static void main(String[] args) throws Exception {
        ConsoleRenderer.printBanner();
        ConsoleRenderer.step("Initializing backend HTTP server on port 8080...");
        
        HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);
        
        DownloadController controller = new DownloadController();
        controller.registerRoutes(server);
        
        server.setExecutor(java.util.concurrent.Executors.newCachedThreadPool());
        server.start();
        ConsoleRenderer.step("Server running on http://localhost:8080");
        
        // Keep the main thread alive so the server doesn't shut down when the executor thread pool is empty
        Thread.currentThread().join();
    }
    
    private static String extractJsonString(String json, String key) {
        Pattern pattern = Pattern.compile("\"" + key + "\"\\s*:\\s*\"([^\"]+)\"");
        Matcher matcher = pattern.matcher(json);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }
}