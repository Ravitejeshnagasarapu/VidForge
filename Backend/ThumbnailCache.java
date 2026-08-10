import java.io.InputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

public class ThumbnailCache {
    private static final String CACHE_DIR = "cache/thumbnails";

    public ThumbnailCache() {
        try {
            Files.createDirectories(Paths.get(CACHE_DIR));
        } catch (IOException e) {
            System.err.println("Failed to create thumbnail cache directory.");
        }
    }

    public boolean isCached(String videoId) {
        return Files.exists(getFilePath(videoId));
    }

    public String getCachedPath(String videoId) {
        return "/" + CACHE_DIR + "/" + videoId + ".jpg";
    }

    public void save(String videoId, InputStream data) throws IOException {
        Path targetPath = getFilePath(videoId);
        Files.copy(data, targetPath, StandardCopyOption.REPLACE_EXISTING);
    }

    private Path getFilePath(String videoId) {
        return Paths.get(CACHE_DIR, videoId + ".jpg");
    }
}
