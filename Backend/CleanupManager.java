import java.io.File;
import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.logging.Logger;
import java.util.regex.Pattern;

public class CleanupManager {
    private static final Logger logger = Logger.getLogger(CleanupManager.class.getName());
    
    // Pattern to match yt-dlp partial fragments like .f137.mp4, .f251.m4a, etc.
    private static final Pattern FRAGMENT_PATTERN = Pattern.compile(".*\\.f\\d{2,4}\\.(mp4|m4a|webm)$");

    public static void cleanupPartialFiles() {
        cleanDirectory(Main.Config.AUDIO_PATH);
        cleanDirectory(Main.Config.VIDEO_PATH);
    }

    private static void cleanDirectory(String dirPath) {
        Path startPath = Paths.get(dirPath);
        if (!Files.exists(startPath)) return;
        
        try {
            Files.walkFileTree(startPath, new SimpleFileVisitor<Path>() {
                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    String name = file.getFileName().toString().toLowerCase();
                    if (name.endsWith(".part") || 
                        name.endsWith(".temp") || 
                        name.endsWith(".ytdl") || 
                        FRAGMENT_PATTERN.matcher(name).matches()) {
                        
                        deleteFileWithRetries(file);
                    }
                    return FileVisitResult.CONTINUE;
                }
            });
        } catch (IOException e) {
            logger.fine("Error walking directory for cleanup: " + e.getMessage());
        }
    }

    private static void deleteFileWithRetries(Path file) {
        boolean deleted = false;
        for (int i = 0; i < 4; i++) {
            try {
                if (Files.deleteIfExists(file) || !Files.exists(file)) {
                    deleted = true;
                    logger.info("Deleted partial file: " + file.getFileName().toString());
                    break;
                }
            } catch (Exception e) {
                try {
                    Thread.sleep(150);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }
        if (!deleted && Files.exists(file)) {
            File f = file.toFile();
            if (!f.delete()) {
                f.deleteOnExit();
            }
        }
    }
}
