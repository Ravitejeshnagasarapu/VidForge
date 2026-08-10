public enum DownloadMode {
    VIDEO("video"),
    AUDIO("audio");

    private final String value;

    DownloadMode(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static DownloadMode fromString(String text) {
        if (text == null || text.trim().isEmpty() || text.equalsIgnoreCase("null")) {
            throw new IllegalArgumentException("Mode cannot be null");
        }
        for (DownloadMode mode : DownloadMode.values()) {
            if (mode.value.equalsIgnoreCase(text.trim())) {
                return mode;
            }
        }
        throw new IllegalArgumentException("Invalid mode: " + text);
    }
}
