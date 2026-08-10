public class DownloadSession {
    private final String id;
    private Process process;
    private Thread executionThread;
    private final CancellationToken cancellationToken = new CancellationToken();

    public DownloadSession(String id) {
        this.id = id;
    }

    public String getId() {
        return id;
    }

    public CancellationToken getCancellationToken() {
        return cancellationToken;
    }

    public synchronized void setProcess(Process process) {
        this.process = process;
    }

    public synchronized void setExecutionThread(Thread thread) {
        this.executionThread = thread;
    }

    public synchronized void cancel() {
        cancellationToken.cancel();
        if (process != null && process.isAlive()) {
            process.destroyForcibly();
        }
        if (executionThread != null && executionThread.isAlive()) {
            executionThread.interrupt();
        }
    }
}
