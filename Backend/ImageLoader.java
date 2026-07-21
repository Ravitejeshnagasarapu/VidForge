import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.io.InputStream;

public class ImageLoader {
    private final ExecutorService executor;

    public ImageLoader() {
        this.executor = Executors.newCachedThreadPool();
    }

    public CompletableFuture<String> loadAsync(String videoId, String thumbnailUrl, ThumbnailDownloader downloader, ThumbnailCache cache) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                InputStream is = downloader.download(thumbnailUrl, videoId);
                cache.save(videoId, is);
                if (is != null) is.close();
                return cache.getCachedPath(videoId);
            } catch (Exception e) {
                // Silently fail if thumbnail cannot be downloaded to prevent CLI rendering corruption
                return null;
            }
        }, executor);
    }
}
