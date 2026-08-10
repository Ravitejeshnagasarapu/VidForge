import java.util.function.Consumer;

public class ThumbnailService {
    private final ThumbnailCache cache;
    private final ThumbnailDownloader downloader;
    private final ImageLoader loader;

    public ThumbnailService() {
        this.cache = new ThumbnailCache();
        this.downloader = new ThumbnailDownloader();
        this.loader = new ImageLoader();
    }

    public void fetchThumbnail(String videoId, String thumbnailUrl, Consumer<String> onReady) {
        if (videoId == null || videoId.isEmpty()) {
            return;
        }

        if (cache.isCached(videoId)) {
            String path = cache.getCachedPath(videoId);
            onReady.accept(path);
            return;
        }

        loader.loadAsync(videoId, thumbnailUrl, downloader, cache).thenAccept(path -> {
            if (path != null) {
                onReady.accept(path);
            }
        });
    }
}
