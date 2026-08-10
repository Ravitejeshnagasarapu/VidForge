import java.util.concurrent.atomic.AtomicBoolean;

public class CancellationToken {
    private final AtomicBoolean cancelled = new AtomicBoolean(false);

    public void cancel() {
        cancelled.set(true);
    }

    public boolean isCancelled() {
        return cancelled.get();
    }

    public void throwIfCancelled() throws Exceptions.UserCancelledException {
        if (isCancelled()) {
            throw new Exceptions.UserCancelledException("Download cancelled by user.");
        }
    }
}
