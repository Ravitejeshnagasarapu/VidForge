import java.util.concurrent.ConcurrentHashMap;

public class DownloadSessionManager {
    private static final DownloadSessionManager INSTANCE = new DownloadSessionManager();
    private final ConcurrentHashMap<String, DownloadSession> sessions = new ConcurrentHashMap<>();

    private DownloadSessionManager() {}

    public static DownloadSessionManager getInstance() {
        return INSTANCE;
    }

    public DownloadSession createSession(String id) {
        DownloadSession session = new DownloadSession(id);
        sessions.put(id, session);
        return session;
    }

    public DownloadSession getSession(String id) {
        return sessions.get(id);
    }

    public void removeSession(String id) {
        sessions.remove(id);
    }

    public boolean cancelSession(String id) {
        DownloadSession session = sessions.get(id);
        if (session != null) {
            session.cancel();
            removeSession(id);
            return true;
        }
        return false;
    }
}
