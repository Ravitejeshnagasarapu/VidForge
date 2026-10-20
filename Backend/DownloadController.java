import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.*;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.logging.Logger;

public class DownloadController {

    private static final int MAX_REQUEST_BODY_BYTES = 16 * 1024;
    private static final Logger logger = Logger.getLogger(DownloadController.class.getName());
    private final DownloadManager downloadManager = new DownloadManager();

    public void registerRoutes(HttpServer server) {
        server.createContext("/api/stream", exchange -> {
            if ("GET".equals(exchange.getRequestMethod())) {
                Main.SSEBroadcaster.register(exchange);
            } else {
                exchange.getResponseHeaders().set("Allow", "GET");
                sendResponse(exchange, 405, "{\"error\":\"Method Not Allowed\"}");
            }
        });

        server.createContext("/api/download", exchange -> {
            if (!"POST".equals(exchange.getRequestMethod())) {
                exchange.getResponseHeaders().set("Allow", "POST");
                sendResponse(exchange, 405, "{\"error\":\"Method Not Allowed\"}");
                return;
            }

            if (!isSameOrigin(exchange)) {
                sendResponse(exchange, 403, "{\"error\":\"Cross-origin requests are not allowed.\"}");
                return;
            }

            try {
                String body = readBody(exchange);
                DownloadRequest req;
                try {
                    req = DownloadRequest.parseJson(body);
                } catch (IllegalArgumentException e) {
                    sendResponse(exchange, 400,
                            "{\"error\":\"" + Main.SSEBroadcaster.escapeJson(e.getMessage()) + "\"}");
                    return;
                }

                String downloadId = java.util.UUID.randomUUID().toString();
                DownloadSession session = DownloadSessionManager.getInstance().createSession(downloadId);

                System.out.println("\n====================================");
                System.out.println("DOWNLOAD REQUEST");
                System.out.println("====================================");
                System.out.println("ID:\n" + downloadId);
                System.out.println("URL:\n" + req.getUrl());
                System.out.println("\nMode:\n" + req.getMode().getValue());
                System.out.println("\nResolution:\n"
                        + (req.getResolution() != null ? req.getResolution().getValue() : "null"));
                System.out.println("\nAudio Format:\n"
                        + (req.getAudioFormat() != null ? req.getAudioFormat().getValue() : "null"));
                System.out.println("====================================\n");

                Thread downloadThread = new Thread(() -> {
                    downloadManager.executeDownloadProcess(downloadId, req);
                });

                session.setExecutionThread(downloadThread);
                downloadThread.start();

                sendResponse(exchange, 200, "{\"downloadId\":\"" + downloadId + "\"}");
            } catch (RequestTooLargeException e) {
                sendResponse(exchange, 413, "{\"error\":\"Request body is too large.\"}");
            } catch (Exception e) {
                e.printStackTrace();
                sendResponse(exchange, 500, "{\"error\":\"Failed to start download.\"}");
            }
        });

        server.createContext("/api/download/cancel", exchange -> {
            if (!"POST".equals(exchange.getRequestMethod())) {
                exchange.getResponseHeaders().set("Allow", "POST");
                sendResponse(exchange, 405, "{\"error\":\"Method Not Allowed\"}");
                return;
            }

            if (!isSameOrigin(exchange)) {
                sendResponse(exchange, 403, "{\"error\":\"Cross-origin requests are not allowed.\"}");
                return;
            }

            try {
                String body = readBody(exchange);
                Matcher m = Pattern.compile("\"downloadId\"\\s*:\\s*\"(.*?)\"").matcher(body);
                String downloadId = m.find() ? m.group(1) : null;

                if (downloadId != null) {
                    if (DownloadSessionManager.getInstance().cancelSession(downloadId)) {
                        sendResponse(exchange, 200, "{\"success\":true,\"message\":\"Download cancelled.\"}");
                    } else {
                        sendResponse(exchange, 404,
                                "{\"success\":false,\"message\":\"Download not found.\"}");
                    }
                } else {
                    sendResponse(exchange, 400, "{\"success\":false,\"message\":\"Missing downloadId.\"}");
                }
            } catch (RequestTooLargeException e) {
                sendResponse(exchange, 413, "{\"error\":\"Request body is too large.\"}");
            } catch (Exception e) {
                e.printStackTrace();
                sendResponse(exchange, 500, "{\"error\":\"Failed to cancel download.\"}");
            }
        });

        server.createContext("/api/download-file", exchange -> {
            if (!"GET".equals(exchange.getRequestMethod())) {
                exchange.getResponseHeaders().set("Allow", "GET");
                sendResponse(exchange, 405, "{\"error\":\"Method Not Allowed\"}");
                return;
            }
            if (!isSameOrigin(exchange)) {
                sendResponse(exchange, 403, "{\"error\":\"Cross-origin requests are not allowed.\"}");
                return;
            }

            String downloadId = queryParameter(exchange.getRequestURI(), "id");
            if (downloadId == null || !downloadId.matches(
                    "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")) {
                sendResponse(exchange, 400, "{\"error\":\"A valid download ID is required.\"}");
                return;
            }

            Path file = DownloadSessionManager.getInstance().getCompletedFile(downloadId);
            if (file == null || !Files.isRegularFile(file)) {
                sendResponse(exchange, 404, "{\"error\":\"Completed download file is unavailable.\"}");
                return;
            }

            try {
                String filename = file.getFileName().toString();
                String encodedFilename = java.net.URLEncoder.encode(filename, "UTF-8").replace("+", "%20");
                exchange.getResponseHeaders().set("Content-Type", "application/octet-stream");
                exchange.getResponseHeaders().set("Content-Disposition",
                        "attachment; filename*=UTF-8''" + encodedFilename);
                exchange.getResponseHeaders().set("X-Content-Type-Options", "nosniff");
                exchange.sendResponseHeaders(200, Files.size(file));
                try (InputStream input = Files.newInputStream(file);
                        OutputStream output = exchange.getResponseBody()) {
                    input.transferTo(output);
                }
            } catch (IOException e) {
                logger.log(java.util.logging.Level.WARNING, "Could not stream a completed download to the browser.", e);
            } finally {
                exchange.close();
            }
        });

        server.createContext("/api/download-file/cleanup", exchange -> {
            if (!"POST".equals(exchange.getRequestMethod())) {
                exchange.getResponseHeaders().set("Allow", "POST");
                sendResponse(exchange, 405, "{\"error\":\"Method Not Allowed\"}");
                return;
            }
            if (!isSameOrigin(exchange)) {
                sendResponse(exchange, 403, "{\"error\":\"Cross-origin requests are not allowed.\"}");
                return;
            }
            try {
                String body = readBody(exchange);
                Matcher matcher = Pattern.compile("\"downloadId\"\\s*:\\s*\"([0-9a-fA-F-]{36})\"")
                        .matcher(body);
                if (!matcher.find()) {
                    sendResponse(exchange, 400, "{\"error\":\"A valid download ID is required.\"}");
                    return;
                }
                String downloadId = matcher.group(1);
                Path file = DownloadSessionManager.getInstance().getCompletedFile(downloadId);
                if (file == null) {
                    sendResponse(exchange, 404, "{\"error\":\"Completed download file is unavailable.\"}");
                    return;
                }
                Files.deleteIfExists(file);
                DownloadSessionManager.getInstance().removeCompletedFile(downloadId);
                sendResponse(exchange, 200, "{\"success\":true}");
            } catch (RequestTooLargeException e) {
                sendResponse(exchange, 413, "{\"error\":\"Request body is too large.\"}");
            } catch (IOException e) {
                logger.log(java.util.logging.Level.WARNING, "Could not remove the transferred download file.", e);
                sendResponse(exchange, 500, "{\"error\":\"Could not remove the temporary download file.\"}");
            }
        });

        server.createContext("/", exchange -> {
            if (!"GET".equals(exchange.getRequestMethod()) && !"HEAD".equals(exchange.getRequestMethod())) {
                exchange.getResponseHeaders().set("Allow", "GET, HEAD");
                sendResponse(exchange, 405, "{\"error\":\"Method Not Allowed\"}");
                return;
            }

            String path = exchange.getRequestURI().getPath();
            if (path.equals("/"))
                path = "/index.html";

            File file = resolveStaticFile(path);
            if (file != null && file.exists() && !file.isDirectory()) {
                String mime = "text/plain";
                if (path.endsWith(".html"))
                    mime = "text/html";
                else if (path.endsWith(".css"))
                    mime = "text/css";
                else if (path.endsWith(".js"))
                    mime = "application/javascript";
                else if (path.endsWith(".png"))
                    mime = "image/png";
                else if (path.endsWith(".jpg") || path.endsWith(".jpeg"))
                    mime = "image/jpeg";
                else if (path.endsWith(".svg"))
                    mime = "image/svg+xml";

                exchange.getResponseHeaders().set("Content-Type", mime);
                if ("HEAD".equals(exchange.getRequestMethod())) {
                    exchange.sendResponseHeaders(200, -1);
                    exchange.close();
                    return;
                }
                exchange.sendResponseHeaders(200, file.length());
                OutputStream os = exchange.getResponseBody();
                Files.copy(file.toPath(), os);
                os.close();
            } else {
                sendResponse(exchange, 404, "404 Not Found");
            }
        });
    }

    private File resolveStaticFile(String path) {
        String normalizedPath = path.startsWith("/") ? path.substring(1) : path;
        boolean cacheRequest = normalizedPath.startsWith("cache/");
        String relativePath = cacheRequest ? normalizedPath.substring("cache/".length()) : normalizedPath;
        Path requestedPath = Paths.get(relativePath);
        if (requestedPath.isAbsolute()) {
            return null;
        }

        Path cwd = Paths.get("").toAbsolutePath().normalize();
        java.util.List<Path> roots = new java.util.ArrayList<>();
        addStaticRoots(roots, cwd, cacheRequest);

        try {
            Path codeLocation = Paths.get(
                    DownloadController.class.getProtectionDomain().getCodeSource().getLocation().toURI())
                    .toAbsolutePath().normalize();
            Path codeDir = Files.isDirectory(codeLocation) ? codeLocation : codeLocation.getParent();
            if (codeDir != null) {
                addStaticRoots(roots, codeDir, cacheRequest);
                addStaticRoots(roots, codeDir.resolve("..").normalize(), cacheRequest);
            }
        } catch (Exception e) {
            logger.warning("Could not resolve frontend resources from the application location: " + e.getMessage());
        }

        for (Path root : roots) {
            if (root == null)
                continue;
            Path normalizedRoot = root.toAbsolutePath().normalize();
            Path filePath = normalizedRoot.resolve(requestedPath).normalize();
            if (filePath.startsWith(normalizedRoot) && java.nio.file.Files.isRegularFile(filePath)) {
                try {
                    Path realRoot = normalizedRoot.toRealPath();
                    Path realFile = filePath.toRealPath();
                    if (realFile.startsWith(realRoot)) {
                        return realFile.toFile();
                    }
                } catch (IOException e) {
                    logger.fine("Could not resolve static resource path: " + e.getMessage());
                }
            }
        }
        return null;
    }

    private void addStaticRoots(java.util.List<Path> roots, Path base, boolean cacheRequest) {
        if (cacheRequest) {
            roots.add(base.resolve("cache").normalize());
            roots.add(base.resolve("Backend/cache").normalize());
            roots.add(base.resolve("../Backend/cache").normalize());
        } else {
            roots.add(base.resolve("Frontend").normalize());
            roots.add(base.resolve("../Frontend").normalize());
        }
    }

    private boolean isSameOrigin(HttpExchange exchange) {
        String fetchSite = exchange.getRequestHeaders().getFirst("Sec-Fetch-Site");
        if ("cross-site".equalsIgnoreCase(fetchSite)) {
            return false;
        }

        String origin = exchange.getRequestHeaders().getFirst("Origin");
        if (origin == null) {
            return true;
        }

        String host = exchange.getRequestHeaders().getFirst("Host");
        if (host == null) {
            return false;
        }
        try {
            URI originUri = new URI(origin);
            URI requestAuthority = new URI("http://" + host);
            return "http".equalsIgnoreCase(originUri.getScheme())
                    && originUri.getUserInfo() == null
                    && originUri.getRawAuthority() != null
                    && originUri.getRawAuthority().equalsIgnoreCase(requestAuthority.getRawAuthority());
        } catch (java.net.URISyntaxException e) {
            return false;
        }
    }

    private String queryParameter(URI uri, String name) {
        String query = uri.getRawQuery();
        if (query == null) {
            return null;
        }
        for (String parameter : query.split("&")) {
            String[] pair = parameter.split("=", 2);
            try {
                if (java.net.URLDecoder.decode(pair[0], "UTF-8").equals(name)) {
                    return pair.length > 1 ? java.net.URLDecoder.decode(pair[1], "UTF-8") : "";
                }
            } catch (java.io.UnsupportedEncodingException e) {
                throw new IllegalStateException("UTF-8 is not supported.", e);
            }
        }
        return null;
    }

    private String readBody(HttpExchange exchange) throws IOException {
        InputStream input = exchange.getRequestBody();
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        byte[] buffer = new byte[4096];
        int totalBytes = 0;
        int bytesRead;
        while ((bytesRead = input.read(buffer)) != -1) {
            totalBytes += bytesRead;
            if (totalBytes > MAX_REQUEST_BODY_BYTES) {
                throw new RequestTooLargeException();
            }
            bytes.write(buffer, 0, bytesRead);
        }
        return bytes.toString(java.nio.charset.StandardCharsets.UTF_8);
    }

    private static class RequestTooLargeException extends IOException {
        private static final long serialVersionUID = 1L;
    }

    private void sendResponse(HttpExchange exchange, int statusCode, String response) throws IOException {
        byte[] body = response.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type",
                response.startsWith("{") ? "application/json; charset=utf-8" : "text/plain; charset=utf-8");
        exchange.sendResponseHeaders(statusCode, body.length);
        OutputStream os = exchange.getResponseBody();
        os.write(body);
        os.close();
    }
}
