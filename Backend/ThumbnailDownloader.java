import java.io.InputStream;
import java.io.FilterInputStream;
import java.io.IOException;
import java.net.URL;
import java.net.HttpURLConnection;
import java.util.Arrays;
import java.util.List;

public class ThumbnailDownloader {

    public InputStream download(String primaryUrl, String videoId) throws Exception {
        if (primaryUrl != null && !primaryUrl.isEmpty() && !primaryUrl.equals("Unknown")) {
            InputStream is = tryDownload(primaryUrl);
            if (is != null) {
                return is;
            }
        }

        if (videoId != null && !videoId.isEmpty()) {
            List<String> fallbacks = Arrays.asList(
                    "maxresdefault.jpg",
                    "sddefault.jpg",
                    "hqdefault.jpg",
                    "mqdefault.jpg",
                    "default.jpg");

            for (String fallback : fallbacks) {
                String url = "https://i.ytimg.com/vi/" + videoId + "/" + fallback;
                InputStream is = tryDownload(url);
                if (is != null) {
                    return is;
                }
            }
        }

        throw new Exception("Failed to download thumbnail from any source.");
    }

    private InputStream tryDownload(String urlString) {
        HttpURLConnection conn = null;
        boolean handedOff = false;
        try {
            URL url = new java.net.URI(urlString).toURL();
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);

            if (conn.getResponseCode() == 200) {
                final HttpURLConnection connection = conn;
                InputStream stream = new FilterInputStream(conn.getInputStream()) {
                    @Override
                    public void close() throws IOException {
                        try {
                            super.close();
                        } finally {
                            connection.disconnect();
                        }
                    }
                };
                handedOff = true;
                return stream;
            }
        } catch (Exception e) {

        } finally {
            if (!handedOff && conn != null) {
                conn.disconnect();
            }
        }
        return null;
    }
}
