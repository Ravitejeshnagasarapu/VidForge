public enum AudioFormat {
    MP3("mp3"),
    FLAC("flac");

    private final String value;

    AudioFormat(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static AudioFormat fromString(String text) {
        if (text == null || text.trim().isEmpty() || text.equalsIgnoreCase("null")) {
            return null; // Allowed to be null
        }
        for (AudioFormat fmt : AudioFormat.values()) {
            if (fmt.value.equalsIgnoreCase(text.trim())) {
                return fmt;
            }
        }
        throw new IllegalArgumentException("Invalid audio format: " + text);
    }
}
