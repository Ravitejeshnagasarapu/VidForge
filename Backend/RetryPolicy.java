import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import java.util.Locale;
import java.util.regex.Pattern;

public class RetryPolicy {
    private static final Pattern TRANSIENT_HTTP_STATUS = Pattern.compile("http error (408|429|5\\d\\d)\\b");

    public static boolean isRetryable(Exception e) {
        if (e instanceof Exceptions.UserCancelledException || e instanceof InterruptedException) {
            return false;
        }

        for (Throwable cause = e; cause != null; cause = cause.getCause()) {
            if (cause instanceof Exceptions.UserCancelledException || cause instanceof InterruptedException) {
                return false;
            }
            if (cause instanceof SocketTimeoutException
                    || cause instanceof ConnectException
                    || cause instanceof UnknownHostException) {
                return true;
            }

            String message = cause.getMessage();
            if (message != null) {
                String normalized = message.toLowerCase(Locale.ROOT);
                if (normalized.contains("destroyed") || normalized.contains("cancelled")
                        || normalized.contains("interrupted")) {
                    return false;
                }
                if (normalized.contains("connection reset") || normalized.contains("connection refused")
                        || normalized.contains("connection aborted") || normalized.contains("timed out")
                        || normalized.contains("timeout") || normalized.contains("temporary failure")
                        || normalized.contains("temporary name resolution")
                        || normalized.contains("remote end closed connection")
                        || normalized.contains("incomplete read")
                        || TRANSIENT_HTTP_STATUS.matcher(normalized).find()) {
                    return true;
                }
            }
        }

        return false;
    }
}
