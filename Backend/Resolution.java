public enum Resolution {
    BEST("best"),
    RES_1080("1080"),
    RES_1440("1440"),
    RES_2160("2160");

    private final String value;

    Resolution(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static Resolution fromString(String text) {
        if (text == null || text.trim().isEmpty() || text.equalsIgnoreCase("null")) {
            return null; // Allowed to be null
        }
        for (Resolution res : Resolution.values()) {
            if (res.value.equalsIgnoreCase(text.trim())) {
                return res;
            }
        }
        throw new IllegalArgumentException("Invalid resolution: " + text);
    }
}
