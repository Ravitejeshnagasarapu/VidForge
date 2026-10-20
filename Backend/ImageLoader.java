import java.util.concurrent.CompletableFuture;
import java.io.InputStream;

public class ImageLoader {
    public CompletableFuture<String> loadAsync(String videoId, String thumbnailUrl, ThumbnailDownloader downloader,
            ThumbnailCache cache) {
        return CompletableFuture.supplyAsync(() -> {
            try (InputStream is = downloader.download(thumbnailUrl, videoId)) {
                cache.save(videoId, is);
                return cache.getCachedPath(videoId);
            } catch (Exception e) {

                return null;
            }
        });
    }
}
