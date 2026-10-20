import java.net.URI;
import java.net.URISyntaxException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class DownloadRequest {
    private final String url;
    private final DownloadMode mode;
    private final Resolution resolution;
    private final AudioFormat audioFormat;
    private final String outputFolder;
    private final boolean browserFolderSelected;

    public DownloadRequest(String url, DownloadMode mode, Resolution resolution, AudioFormat audioFormat,
            String outputFolder, boolean browserFolderSelected) {
        this.url = url;
        this.mode = mode;
        this.resolution = resolution;
        this.audioFormat = audioFormat;
        this.outputFolder = outputFolder;
        this.browserFolderSelected = browserFolderSelected;
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

    public String getOutputFolder() {
        return outputFolder;
    }

    public boolean isBrowserFolderSelected() {
        return browserFolderSelected;
    }

    public static DownloadRequest parseJson(String json) {
        String rawUrl = extractJsonString(json, "url");
        if (rawUrl == null || rawUrl.trim().isEmpty() || rawUrl.equals("Unknown")) {
            throw new IllegalArgumentException("URL cannot be missing or empty");
        }
        String url = validateYoutubeUrl(rawUrl);

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

        String outputFolder = extractJsonString(json, "outputFolder");
        boolean browserFolderSelected = extractJsonBoolean(json, "browserFolderSelected");

        return new DownloadRequest(url, mode, resolution, audioFormat, outputFolder, browserFolderSelected);
    }

    private static boolean extractJsonBoolean(String json, String key) {
        Matcher matcher = Pattern.compile("\"" + Pattern.quote(key) + "\"\\s*:\\s*(true|false)",
                Pattern.CASE_INSENSITIVE).matcher(json);
        return matcher.find() && Boolean.parseBoolean(matcher.group(1));
    }

    private static String validateYoutubeUrl(String value) {
        String trimmedUrl = value.trim();
        if (trimmedUrl.length() > 2048) {
            throw new IllegalArgumentException("URL must be 2048 characters or fewer");
        }

        String candidate = trimmedUrl.matches("^[a-zA-Z][a-zA-Z0-9+.-]*:.*$")
                ? trimmedUrl
                : "https://" + trimmedUrl;
        try {
            URI uri = new URI(candidate);
            String scheme = uri.getScheme();
            String host = uri.getHost();
            if (scheme == null || (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https"))
                    || host == null || uri.getUserInfo() != null) {
                throw new IllegalArgumentException("Enter a valid YouTube URL using HTTP or HTTPS");
            }

            String normalizedHost = host.toLowerCase(java.util.Locale.ROOT);
            if (normalizedHost.endsWith(".")) {
                normalizedHost = normalizedHost.substring(0, normalizedHost.length() - 1);
            }
            boolean youtubeHost = normalizedHost.equals("youtube.com")
                    || normalizedHost.endsWith(".youtube.com")
                    || normalizedHost.equals("youtu.be")
                    || normalizedHost.endsWith(".youtu.be");
            if (!youtubeHost) {
                throw new IllegalArgumentException("Only YouTube video, playlist, or channel URLs are supported");
            }
            return uri.toASCIIString();
        } catch (URISyntaxException e) {
            throw new IllegalArgumentException("Enter a valid YouTube URL", e);
        }
    }

    private static String extractJsonString(String json, String key) {
        Pattern p1 = Pattern.compile(
                "\"" + Pattern.quote(key) + "\"\\s*:\\s*\"((?:\\\\.|[^\"\\\\])*)\"");
        Matcher m1 = p1.matcher(json);
        if (m1.find()) {
            return unescapeJsonString(m1.group(1));
        }

        Pattern p2 = Pattern.compile("\"" + key + "\"\\s*:\\s*(null|true|false|[0-9]+)");
        Matcher m2 = p2.matcher(json);
        if (m2.find()) {
            return m2.group(1);
        }

        return null;
    }

    private static String unescapeJsonString(String value) {
        StringBuilder result = new StringBuilder(value.length());
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (c != '\\') {
                result.append(c);
                continue;
            }
            if (++i >= value.length()) {
                throw new IllegalArgumentException("Invalid JSON string escape");
            }
            switch (value.charAt(i)) {
                case '"':
                    result.append('"');
                    break;
                case '\\':
                    result.append('\\');
                    break;
                case '/':
                    result.append('/');
                    break;
                case 'b':
                    result.append('\b');
                    break;
                case 'f':
                    result.append('\f');
                    break;
                case 'n':
                    result.append('\n');
                    break;
                case 'r':
                    result.append('\r');
                    break;
                case 't':
                    result.append('\t');
                    break;
                case 'u':
                    if (i + 4 >= value.length()) {
                        throw new IllegalArgumentException("Invalid JSON unicode escape");
                    }
                    try {
                        result.append((char) Integer.parseInt(value.substring(i + 1, i + 5), 16));
                    } catch (NumberFormatException e) {
                        throw new IllegalArgumentException("Invalid JSON unicode escape", e);
                    }
                    i += 4;
                    break;
                default:
                    throw new IllegalArgumentException("Invalid JSON string escape");
            }
        }
        return result.toString();
    }
}
