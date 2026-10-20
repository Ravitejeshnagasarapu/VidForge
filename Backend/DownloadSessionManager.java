import java.util.concurrent.ConcurrentHashMap;
import java.nio.file.Files;
import java.nio.file.Path;
import java.io.IOException;

public class DownloadSessionManager {
    private static final DownloadSessionManager INSTANCE = new DownloadSessionManager();
    private final ConcurrentHashMap<String, DownloadSession> sessions = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Path> completedFiles = new ConcurrentHashMap<>();

    private DownloadSessionManager() {}

    public static DownloadSessionManager getInstance() {
        return INSTANCE;
    }

    public synchronized DownloadSession createSession(String id) {
        DownloadSession session = new DownloadSession(id);
        sessions.put(id, session);
        return session;
    }

    public DownloadSession getSession(String id) {
        return sessions.get(id);
    }

    public boolean registerCompletedFile(String id, Path file) throws IOException {
        Path resolvedFile = file.toRealPath();
        if (!Files.isRegularFile(resolvedFile)) {
            return false;
        }
        completedFiles.put(id, resolvedFile);
        return true;
    }

    public Path getCompletedFile(String id) {
        return completedFiles.get(id);
    }

    public void removeCompletedFile(String id) {
        completedFiles.remove(id);
    }

    public synchronized void removeSession(String id) {
        sessions.remove(id);
    }

    public synchronized void runIfIdle(Runnable action) {
        if (sessions.isEmpty()) {
            action.run();
        }
    }

    public boolean cancelSession(String id) {
        DownloadSession session = sessions.get(id);
        if (session != null) {
            session.cancel();
            return true;
        }
        return false;
    }
}
