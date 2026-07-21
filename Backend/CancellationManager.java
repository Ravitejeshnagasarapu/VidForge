import java.io.File;
import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.logging.Logger;
import java.util.regex.Pattern;

public class CancellationManager {
    private static final Logger logger = Logger.getLogger(CancellationManager.class.getName());
    
    // Pattern to match yt-dlp partial fragments like .f137.mp4, .f251.m4a, etc.
    private static final Pattern FRAGMENT_PATTERN = Pattern.compile(".*\\.f\\d{2,4}\\.(mp4|m4a|webm)$");

    public static void cleanupPartialFiles() {
        CleanupManager.cleanupPartialFiles();
    }
}
