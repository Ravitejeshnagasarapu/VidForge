import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class DownloadRequest {
    private final String url;
    private final DownloadMode mode;
    private final Resolution resolution;
    private final AudioFormat audioFormat;
    private final boolean embedMetadata;
    private final boolean embedThumbnail;
    private final boolean embedSubtitles;
    private final String outputFolder;
    private final String cookies;

    public DownloadRequest(String url, DownloadMode mode, Resolution resolution, AudioFormat audioFormat,
            boolean embedMetadata, boolean embedThumbnail, boolean embedSubtitles,
            String outputFolder, String cookies) {
        this.url = url;
        this.mode = mode;
        this.resolution = resolution;
        this.audioFormat = audioFormat;
        this.embedMetadata = embedMetadata;
        this.embedThumbnail = embedThumbnail;
        this.embedSubtitles = embedSubtitles;
        this.outputFolder = outputFolder;
        this.cookies = cookies;
    }

    public String getUrl() {
        return url;
    }

    public DownloadMode getMode() {
        return mode;
    }

    public Resolution getResolution() {
        return resolution;
    }

    public AudioFormat getAudioFormat() {
        return audioFormat;
    }

    public boolean isEmbedMetadata() {
        return embedMetadata;
    }

    public boolean isEmbedThumbnail() {
        return embedThumbnail;
    }

    public boolean isEmbedSubtitles() {
        return embedSubtitles;
    }

    public String getOutputFolder() {
        return outputFolder;
    }

    public String getCookies() {
        return cookies;
    }

    public static DownloadRequest parseJson(String json) {
        String url = extractJsonString(json, "url");
        if (url == null || url.trim().isEmpty() || url.equals("Unknown")) {
            throw new IllegalArgumentException("URL cannot be missing or empty");
        }

        String requestMode = extractJsonString(json, "mode");
        DownloadMode mode;
        Resolution resolution = null;
        AudioFormat audioFormat = null;

        if (requestMode != null) {
            switch (requestMode.trim()) {
                case "1":
                    mode = DownloadMode.AUDIO;
                    audioFormat = AudioFormat.MP3;
                    break;
                case "2":
                    mode = DownloadMode.AUDIO;
                    audioFormat = AudioFormat.FLAC;
                    break;
                case "3":
                    mode = DownloadMode.VIDEO;
                    resolution = Resolution.BEST;
                    break;
                case "4":
                    mode = DownloadMode.VIDEO;
                    resolution = Resolution.RES_1080;
                    break;
                case "5":
                    mode = DownloadMode.VIDEO;
                    resolution = Resolution.RES_1440;
                    break;
                case "6":
                    mode = DownloadMode.VIDEO;
                    resolution = Resolution.RES_2160;
                    break;
                default:
                    mode = DownloadMode.fromString(requestMode);
                    resolution = Resolution.fromString(extractJsonString(json, "resolution"));
                    audioFormat = AudioFormat.fromString(extractJsonString(json, "audioFormat"));
                    break;
            }
        } else {
            mode = DownloadMode.fromString(extractJsonString(json, "mode"));
            resolution = Resolution.fromString(extractJsonString(json, "resolution"));
            audioFormat = AudioFormat.fromString(extractJsonString(json, "audioFormat"));
        }

        String metadataFlag = extractJsonString(json, "metadata");
        boolean metadata = "true".equalsIgnoreCase(metadataFlag);

        String thumbnailFlag = extractJsonString(json, "thumbnail");
        boolean thumbnail = thumbnailFlag == null || "true".equalsIgnoreCase(thumbnailFlag);

        String subtitlesFlag = extractJsonString(json, "subtitles");
        boolean subtitles = "true".equalsIgnoreCase(subtitlesFlag);

        String outputFolder = extractJsonString(json, "outputFolder");
        String cookies = extractJsonString(json, "cookies");

        return new DownloadRequest(url, mode, resolution, audioFormat, metadata, thumbnail, subtitles, outputFolder,
                cookies);
    }

    private static String extractJsonString(String json, String key) {
        Pattern p1 = Pattern.compile("\"" + key + "\"\\s*:\\s*\"([^\"]*)\"");
        Matcher m1 = p1.matcher(json);
        if (m1.find()) {
            return m1.group(1).replace("\\\"", "\"");
        }

        Pattern p2 = Pattern.compile("\"" + key + "\"\\s*:\\s*(null|true|false|[0-9]+)");
        Matcher m2 = p2.matcher(json);
        if (m2.find()) {
            return m2.group(1);
        }

        return null;
    }
}
