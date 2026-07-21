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
                    System.out.println("\nResolution:\n" + (req.getResolution() != null ? req.getResolution().getValue() : "null"));
                    System.out.println("\nAudio Format:\n" + (req.getAudioFormat() != null ? req.getAudioFormat().getValue() : "null"));
                    System.out.println("====================================\n");
                    
                    Thread downloadThread = new Thread(() -> {
                        downloadManager.executeDownloadProcess(downloadId, req);
                    });
                    
                    session.setExecutionThread(downloadThread);
                    downloadThread.start();
                    
                    sendResponse(exchange, 200, "{\"downloadId\":\"" + downloadId + "\"}");
                } catch(Exception e) {
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
                        boolean cancelled = DownloadSessionManager.getInstance().cancelSession(downloadId);
                        CleanupManager.cleanupPartialFiles();
                        
                        sendResponse(exchange, 200, "{\"success\":true,\"message\":\"Download cancelled.\"}");
                    } else {
                        sendResponse(exchange, 400, "{\"success\":false,\"message\":\"Missing downloadId.\"}");
                    }
                } catch(Exception e) {
                    e.printStackTrace();
                }
            }
        });

        server.createContext("/", exchange -> {
            String path = exchange.getRequestURI().getPath();
            if (path.equals("/")) path = "/index.html";
            
            File file = new File("." + path);
            if (!file.exists()) {
                file = new File(".." + path);
            }
            if (file.exists() && !file.isDirectory()) {
                String mime = "text/plain";
                if (path.endsWith(".html")) mime = "text/html";
                else if (path.endsWith(".css")) mime = "text/css";
                else if (path.endsWith(".js")) mime = "application/javascript";
                else if (path.endsWith(".png")) mime = "image/png";
                else if (path.endsWith(".jpg") || path.endsWith(".jpeg")) mime = "image/jpeg";
                
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

    private String readBody(HttpExchange exchange) throws IOException {
        InputStreamReader isr = new InputStreamReader(exchange.getRequestBody(), "utf-8");
        BufferedReader br = new BufferedReader(isr);
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) {
            sb.append(line);
        }
        return sb.toString();
    }

    private void sendResponse(HttpExchange exchange, int statusCode, String response) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", response.startsWith("{") ? "application/json" : "text/plain");
        exchange.sendResponseHeaders(statusCode, response.length());
        OutputStream os = exchange.getResponseBody();
        os.write(response.getBytes());
        os.close();
    }
}
