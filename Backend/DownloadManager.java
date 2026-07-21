import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import java.util.logging.Logger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class DownloadManager {
    private static final Logger logger = Logger.getLogger("yt_downloader");
    private final Main.ProgressRenderer renderer = new Main.ProgressRenderer();

    public void executeDownloadProcess(String downloadId, DownloadRequest req) {
        DownloadSession session = DownloadSessionManager.getInstance().getSession(downloadId);
        if (session == null) return;
        CancellationToken cancellationToken = session.getCancellationToken();
        
        try {
            cancellationToken.throwIfCancelled();
            Main.SSEBroadcaster.broadcast("DOWNLOAD_STARTED", "{\"downloadId\":\"" + downloadId + "\"}");
            
            String cleanUrl = cleanYoutubeUrl(req.getUrl());
            Main.YouTubeDownloader metaDownloader = new Main.YouTubeDownloader();
            
            cancellationToken.throwIfCancelled();
            Map<String, String> info = getMetadata(cleanUrl, metaDownloader, cancellationToken);
            
            String activeCodec = computeActiveCodec(req, info);
            info.put("activeCodec", activeCodec);

            cancellationToken.throwIfCancelled();
            Main.SSEBroadcaster.broadcast("METADATA_READY", info);
            
            ThumbnailService thumbnailService = new ThumbnailService();
            thumbnailService.fetchThumbnail(info.get("id"), info.get("thumbnail"), path -> {
                if (!cancellationToken.isCancelled()) {
                    Main.SSEBroadcaster.broadcast("THUMBNAIL_READY", "{\"path\":\"" + Main.SSEBroadcaster.escapeJson(path) + "\"}");
                }
            });
            
            cancellationToken.throwIfCancelled();
            downloadWithRetries(downloadId, req, info, session);
            
            cancellationToken.throwIfCancelled();
            Map<String, String> res = new HashMap<>();
            res.put("title", info.getOrDefault("title", "Unknown"));
            res.put("size", "Unknown"); // Can be extracted from stats if passed back
            Main.SSEBroadcaster.broadcast("DOWNLOAD_COMPLETE", res);
            
        } catch (Exceptions.UserCancelledException e) {
            logger.info("Session " + downloadId + " cancelled by user.");
            CleanupManager.cleanupPartialFiles();
            Main.SSEBroadcaster.broadcast("DOWNLOAD_FAILED", "{\"message\":\"Download cancelled.\"}");
        } catch (Exception e) {
            if (e instanceof InterruptedException || e.getMessage() != null && e.getMessage().contains("destroyed")) {
                logger.info("Session " + downloadId + " interrupted/destroyed.");
                CleanupManager.cleanupPartialFiles();
                Main.SSEBroadcaster.broadcast("DOWNLOAD_FAILED", "{\"message\":\"Download cancelled.\"}");
            } else {
                logger.severe("Session " + downloadId + " failed: " + e.getMessage());
                Main.SSEBroadcaster.broadcast("DOWNLOAD_FAILED", "{\"message\":\"" + Main.SSEBroadcaster.escapeJson(e.getMessage()) + "\"}");
            }
        } finally {
            DownloadSessionManager.getInstance().removeSession(downloadId);
        }
    }

    private Map<String, String> getMetadata(String url, Main.YouTubeDownloader downloader, CancellationToken token) throws Exception {
        token.throwIfCancelled();
        return downloader.getMetadata(url);
    }

    private void downloadWithRetries(String downloadId, DownloadRequest req, Map<String, String> meta, DownloadSession session) throws Exception {
        CancellationToken token = session.getCancellationToken();
        Main.DownloadStatistics stats = new Main.DownloadStatistics();
        Main.ProgressModel progressModel = new Main.ProgressModel();
        progressModel.activeCodec = computeActiveCodec(req, meta);
        
        List<String> cmd = buildCommand(req, meta, stats);
        
        int attempt = 1;
        while (attempt <= Main.Config.MAX_RETRIES) {
            token.throwIfCancelled();
            try {
                logger.info("Starting download attempt " + attempt);
                stats.start();
                progressModel.peakSpeed = 0;
                
                ProcessBuilder pb = new ProcessBuilder(cmd);
                pb.redirectErrorStream(true);
                Process p = pb.start();
                session.setProcess(p);

                AtomicReference<Exception> threadException = new AtomicReference<>();
                Thread readerThread = new Thread(() -> {
                    try (BufferedReader reader = new BufferedReader(new InputStreamReader(p.getInputStream(), "UTF-8"))) {
                        String line;
                        while ((line = reader.readLine()) != null) {
                            if (token.isCancelled()) break;
                            logger.info("yt-dlp: " + line);
                            Main.ProgressParser.parseLine(line, renderer, progressModel, stats);
                        }
                    } catch (IOException e) {
                        threadException.set(e);
                    }
                });
                readerThread.start();
                
                int exitCode = p.waitFor();
                readerThread.join();
                renderer.complete();
                stats.stop();
                
                token.throwIfCancelled();
                
                if (threadException.get() != null) {
                    throw threadException.get();
                }
                
                if (exitCode == 0) {
                    return;
                } else {
                    throw new IOException("yt-dlp exited with code " + exitCode);
                }
            } catch (Exception e) {
                renderer.complete();
                if (!RetryPolicy.isRetryable(e) || token.isCancelled()) {
                    if (e instanceof InterruptedException || token.isCancelled()) {
                        throw new Exceptions.UserCancelledException("User cancelled the download.");
                    }
                    throw e; 
                }
                
                logger.severe("Error on attempt " + attempt + ": " + e.getMessage());
                if (attempt < Main.Config.MAX_RETRIES) {
                    int sleepTime = (int) Math.pow(Main.Config.BASE_BACKOFF, attempt);
                    Main.ConsoleRenderer.warning("Network error/failure. Retrying in " + sleepTime + " seconds... (" + attempt + "/" + Main.Config.MAX_RETRIES + ")");
                    try { 
                        for(int i=0; i<sleepTime; i++){
                           token.throwIfCancelled();
                           Thread.sleep(1000L); 
                        }
                    } catch (InterruptedException ie) { 
                        Thread.currentThread().interrupt(); 
                        throw new Exceptions.UserCancelledException("User cancelled the download.");
                    }
                    attempt++;
                } else {
                    throw new Exceptions.NetworkException("Max retries exceeded due to persistent issues.");
                }
            }
        }
    }

    private List<String> buildCommand(DownloadRequest req, Map<String, String> meta, Main.DownloadStatistics stats) {
        String url = req.getUrl();
        String mode = req.getMode().getValue();
        String resolution = req.getResolution() != null ? req.getResolution().getValue() : null;
        String audioFmt = req.getAudioFormat() != null ? req.getAudioFormat().getValue() : null;
        List<String> cmd = new ArrayList<>();
        cmd.add("yt-dlp");
        cmd.add("--newline");
        cmd.add("--no-warnings");
        cmd.add("--windows-filenames");
        
        stats.title = meta.getOrDefault("title", "Unknown");
        
        if (mode.equals("audio")) {
            cmd.add("-f"); cmd.add("bestaudio/best");
            cmd.add("-x");
            cmd.add("--audio-format"); cmd.add(audioFmt != null ? audioFmt : Main.Config.DEFAULT_AUDIO_EXT);
            cmd.add("--audio-quality"); cmd.add("0");
            stats.format = "Audio (" + (audioFmt != null ? audioFmt : Main.Config.DEFAULT_AUDIO_EXT) + ")";
            stats.resolution = "N/A";
        } else {
            String format = "best";
            if ("best".equals(resolution)) format = "bestvideo+bestaudio/best";
            else if (resolution != null) format = "bestvideo[height<=" + resolution + "]+bestaudio/bestvideo+bestaudio/best";
            
            cmd.add("-f"); cmd.add(format);
            cmd.add("--merge-output-format"); cmd.add(Main.Config.DEFAULT_VIDEO_EXT);
            stats.format = "Video (" + Main.Config.DEFAULT_VIDEO_EXT + ")";
            stats.resolution = resolution != null && !resolution.equals("best") ? resolution + "p" : "Best Available";
        }

        String outputDir = mode.equals("audio") ? Main.Config.AUDIO_PATH : Main.Config.VIDEO_PATH;
        stats.outputDir = outputDir;
        String suffix = (mode.equals("video") && resolution != null) ? (resolution.equals("best") ? "_best" : "_" + resolution + "p") : "";
        cmd.add("-P"); cmd.add(outputDir);
        cmd.add("-o"); cmd.add("%(title)s_%(id)s" + suffix + ".%(ext)s");

        if (Main.Config.EMBED_METADATA) cmd.add("--embed-metadata");
        if (Main.Config.EMBED_THUMBNAIL) cmd.add("--embed-thumbnail");
        if (Main.Config.EMBED_SUBTITLES && mode.equals("video")) {
            cmd.add("--write-subs");
            cmd.add("--embed-subs");
            cmd.add("--sub-langs"); cmd.add("en,.*");
            cmd.add("--compat-options"); cmd.add("no-live-chat");
        }

        cmd.add("--concurrent-fragments"); cmd.add(String.valueOf(Main.Config.CONCURRENT_FRAGMENTS));
        // Add cookies if required logic can be passed here or activeBrowser. 
        cmd.add(url);
        return cmd;
    }

    private String cleanYoutubeUrl(String url) {
        try {
            if (!url.startsWith("http")) url = "https://" + url;
            if (url.contains("&")) url = url.substring(0, url.indexOf("&"));
            return url;
        } catch (Exception e) {
            return url;
        }
    }

    public static String computeActiveCodec(DownloadRequest req, Map<String, String> meta) {
        if (req == null) return "-- • --";

        String mode = req.getMode() != null ? req.getMode().getValue() : "video";
        String audioFmt = req.getAudioFormat() != null ? req.getAudioFormat().getValue() : null;
        String rawJson = meta != null ? meta.get("raw_json") : null;

        // Parse audio codec strictly from yt-dlp metadata
        String audioCodec = parseAudioCodecFromJson(rawJson, audioFmt, meta != null ? meta.get("acodec") : null);

        if ("audio".equalsIgnoreCase(mode)) {
            return audioCodec != null ? audioCodec : "--";
        }

        // Video + Audio mode: Extract exact video resolution from metadata
        String resReq = req.getResolution() != null ? req.getResolution().getValue() : "best";
        String resLabel = parseResolutionLabelFromJson(rawJson, resReq);

        if (resLabel != null && audioCodec != null) {
            return resLabel + " • " + audioCodec;
        } else if (resLabel != null) {
            return resLabel + " • --";
        } else if (audioCodec != null) {
            return "-- • " + audioCodec;
        } else {
            return "-- • --";
        }
    }

    private static String parseAudioCodecFromJson(String json, String requestedAudioFmt, String rawAcodec) {
        if (requestedAudioFmt != null && !requestedAudioFmt.isEmpty() && !requestedAudioFmt.equalsIgnoreCase("null")) {
            String lower = requestedAudioFmt.toLowerCase();
            if (lower.contains("mp3")) return "MP3";
            if (lower.contains("flac")) return "FLAC";
            if (lower.contains("m4a")) return "M4A";
            if (lower.contains("aac")) return "AAC";
            if (lower.contains("opus")) return "Opus";
        }

        if (json != null && !json.isEmpty()) {
            Matcher reqAcodecM = Pattern.compile("\"requested_formats\":\\s*\\[.*?\"acodec\":\\s*\"([^\"]+)\"", Pattern.DOTALL).matcher(json);
            if (reqAcodecM.find()) {
                String codecStr = reqAcodecM.group(1).toLowerCase();
                if (codecStr.contains("opus")) return "Opus";
                if (codecStr.contains("mp4a") || codecStr.contains("aac")) return "AAC";
                if (codecStr.contains("mp3")) return "MP3";
                if (codecStr.contains("flac")) return "FLAC";
                if (codecStr.contains("vorbis")) return "Vorbis";
            }

            String lowerJson = json.toLowerCase();
            if (lowerJson.contains("\"acodec\": \"opus\"") || lowerJson.contains("opus")) return "Opus";
            if (lowerJson.contains("\"acodec\": \"mp4a") || lowerJson.contains("aac")) return "AAC";
            if (lowerJson.contains("\"acodec\": \"mp3\"") || lowerJson.contains("mp3")) return "MP3";
            if (lowerJson.contains("\"acodec\": \"flac\"") || lowerJson.contains("flac")) return "FLAC";
            if (lowerJson.contains("\"acodec\": \"vorbis\"") || lowerJson.contains("vorbis")) return "Vorbis";
        }

        if (rawAcodec != null && !rawAcodec.isEmpty() && !rawAcodec.equalsIgnoreCase("none") && !rawAcodec.equalsIgnoreCase("Unknown")) {
            String lower = rawAcodec.toLowerCase();
            if (lower.contains("opus")) return "Opus";
            if (lower.contains("mp3")) return "MP3";
            if (lower.contains("flac")) return "FLAC";
            if (lower.contains("m4a")) return "M4A";
            if (lower.contains("mp4a") || lower.contains("aac")) return "AAC";
            if (lower.contains("vorbis")) return "Vorbis";
        }

        return "AAC";
    }

    private static String parseResolutionLabelFromJson(String json, String resReq) {
        if (json != null && !json.isEmpty()) {
            // Check requested_formats for video stream height first
            Matcher reqHeightM = Pattern.compile("\"requested_formats\":\\s*\\[.*?\"height\":\\s*(\\d+)", Pattern.DOTALL).matcher(json);
            if (reqHeightM.find()) {
                int h = Integer.parseInt(reqHeightM.group(1));
                if (h >= 144) return formatHeightLabel(h);
            }

            // Check top-level height at end of JSON (e.g. ,"height":2160,"width":3840})
            Matcher topHeightM = Pattern.compile(",\"height\":\\s*(\\d+)[,}]").matcher(json);
            if (topHeightM.find()) {
                int h = Integer.parseInt(topHeightM.group(1));
                if (h >= 144) return formatHeightLabel(h);
            }

            // Check resolution string like "3840x2160" or "1920x1080"
            Matcher resM = Pattern.compile("\"resolution\":\\s*\"(\\d+x\\d+)\"").matcher(json);
            if (resM.find()) {
                String r = resM.group(1);
                if (r.contains("x")) {
                    try {
                        int h = Integer.parseInt(r.split("x")[1]);
                        if (h >= 144) return formatHeightLabel(h);
                    } catch (Exception e) {}
                }
            }

            // Find highest height in formats array >= 144
            Matcher allHeights = Pattern.compile("\"height\":\\s*(\\d+)").matcher(json);
            int maxHeight = 0;
            while (allHeights.find()) {
                int val = Integer.parseInt(allHeights.group(1));
                if (val >= 144 && val > maxHeight) {
                    maxHeight = val;
                }
            }
            if (maxHeight > 0) {
                return formatHeightLabel(maxHeight);
            }
        }

        if (resReq != null && !resReq.equalsIgnoreCase("best") && !resReq.isEmpty() && !resReq.equalsIgnoreCase("null")) {
            return resReq.endsWith("p") ? resReq : resReq + "p";
        }

        return null;
    }

    private static String formatHeightLabel(int h) {
        if (h >= 2160) return "2160p";
        if (h >= 1440) return "1440p";
        if (h >= 1080) return "1080p";
        if (h >= 720) return "720p";
        if (h >= 480) return "480p";
        if (h >= 360) return "360p";
        return h + "p";
    }
}
