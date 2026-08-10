import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.*;
import java.nio.file.Files;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class DownloadController {

    private final DownloadManager downloadManager = new DownloadManager();

    public void registerRoutes(HttpServer server) {
        server.createContext("/api/stream", exchange -> {
            if ("GET".equals(exchange.getRequestMethod())) {
                Main.SSEBroadcaster.register(exchange);
            }
        });

        server.createContext("/api/download", exchange -> {
            if ("POST".equals(exchange.getRequestMethod())) {
                try {
                    String body = readBody(exchange);
                    DownloadRequest req;
                    try {
                        req = DownloadRequest.parseJson(body);
                    } catch (IllegalArgumentException e) {
                        sendResponse(exchange, 400, "{\"error\": \"" + e.getMessage() + "\"}");
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
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        });

        server.createContext("/api/download/cancel", exchange -> {
            if ("POST".equals(exchange.getRequestMethod())) {
                try {
                    String body = readBody(exchange);
                    Matcher m = Pattern.compile("\"downloadId\"\\s*:\\s*\"(.*?)\"").matcher(body);
                    String downloadId = m.find() ? m.group(1) : null;

                    if (downloadId != null) {
                        DownloadSessionManager.getInstance().cancelSession(downloadId);
                        CleanupManager.cleanupPartialFiles();

                        sendResponse(exchange, 200, "{\"success\":true,\"message\":\"Download cancelled.\"}");
                    } else {
                        sendResponse(exchange, 400, "{\"success\":false,\"message\":\"Missing downloadId.\"}");
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        });

        server.createContext("/", exchange -> {
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
        java.nio.file.Path cwd = java.nio.file.Paths.get("").toAbsolutePath().normalize();
        java.util.List<java.nio.file.Path> roots = new java.util.ArrayList<>();
        roots.add(cwd.resolve("Frontend").normalize());
        roots.add(cwd.resolve("Backend").resolve("Frontend").normalize());

        roots.add(cwd.resolve("Backend").resolve("cache").normalize());
        roots.add(cwd.resolve("Backend").resolve("cache").resolve("thumbnails").normalize());

        roots.add(cwd);

        try {
            java.nio.file.Path codeLocation = java.nio.file.Paths.get(
                    DownloadController.class.getProtectionDomain().getCodeSource().getLocation().toURI())
                    .toAbsolutePath().normalize();
            java.nio.file.Path codeDir = codeLocation.getParent();
            if (codeDir != null) {
                roots.add(codeDir.resolve("Frontend").normalize());
                roots.add(codeDir.resolve("..").resolve("Frontend").normalize());
                roots.add(codeDir.resolve("..").resolve("Backend").resolve("cache").normalize());
                roots.add(codeDir.resolve("..").resolve("Backend").resolve("cache").resolve("thumbnails").normalize());
                roots.add(codeDir);
                roots.add(codeDir.resolve("..").normalize());
            }
        } catch (Exception ignored) {
        }

        for (java.nio.file.Path root : roots) {
            if (root == null)
                continue;
            java.nio.file.Path filePath = root.resolve(normalizedPath).normalize();
            if (java.nio.file.Files.exists(filePath) && !java.nio.file.Files.isDirectory(filePath)) {
                return filePath.toFile();
            }
        }
        return null;
    }

    private String readBody(HttpExchange exchange) throws IOException {
        InputStream input = exchange.getRequestBody();
        byte[] bytes = input.readAllBytes();
        return new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
    }

    private void sendResponse(HttpExchange exchange, int statusCode, String response) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", response.startsWith("{") ? "application/json" : "text/plain");
        exchange.sendResponseHeaders(statusCode, response.length());
        OutputStream os = exchange.getResponseBody();
        os.write(response.getBytes());
        os.close();
    }
}
