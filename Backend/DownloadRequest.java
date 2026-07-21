import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class DownloadRequest {
    private final String url;
    private final DownloadMode mode;
    private final Resolution resolution;
    private final AudioFormat audioFormat;
    private final boolean embedMetadata;
    private final boolean embedSubtitles;

    public DownloadRequest(String url, DownloadMode mode, Resolution resolution, AudioFormat audioFormat, boolean embedMetadata, boolean embedSubtitles) {
        this.url = url;
        this.mode = mode;
        this.resolution = resolution;
        this.audioFormat = audioFormat;
        this.embedMetadata = embedMetadata;
        this.embedSubtitles = embedSubtitles;
    }

    public String getUrl() { return url; }
    public DownloadMode getMode() { return mode; }
    public Resolution getResolution() { return resolution; }
    public AudioFormat getAudioFormat() { return audioFormat; }
    public boolean isEmbedMetadata() { return embedMetadata; }
    public boolean isEmbedSubtitles() { return embedSubtitles; }

    public static DownloadRequest parseJson(String json) {
        String url = extractJsonString(json, "url");
        if (url == null || url.trim().isEmpty() || url.equals("Unknown")) {
            throw new IllegalArgumentException("URL cannot be missing or empty");
        }

        DownloadMode mode = DownloadMode.fromString(extractJsonString(json, "mode"));
        Resolution resolution = Resolution.fromString(extractJsonString(json, "resolution"));
        AudioFormat audioFormat = AudioFormat.fromString(extractJsonString(json, "audioFormat"));
        
        String metaStr = extractJsonString(json, "metadata");
        boolean metadata = metaStr != null && metaStr.equals("true");
        
        String subStr = extractJsonString(json, "subtitles");
        boolean subtitles = subStr != null && subStr.equals("true");

        return new DownloadRequest(url, mode, resolution, audioFormat, metadata, subtitles);
    }

    private static String extractJsonString(String json, String key) {
        // Matches "key": "value" or "key": null or "key": true/false
        Pattern p1 = Pattern.compile("\"" + key + "\"\\s*:\\s*\"(.*?)\"");
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
