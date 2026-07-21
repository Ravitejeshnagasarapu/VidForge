import java.io.IOException;
import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;

public class RetryPolicy {
    public static boolean isRetryable(Exception e) {
        if (e instanceof Exceptions.UserCancelledException || e instanceof InterruptedException) {
            return false;
        }
        
        if (e instanceof SocketTimeoutException || 
            e instanceof ConnectException || 
            e instanceof UnknownHostException) {
            return true;
        }

        if (e instanceof IOException) {
            String msg = e.getMessage();
            if (msg != null && (msg.toLowerCase().contains("connection reset") || msg.toLowerCase().contains("timeout"))) {
                return true;
            }
        }
        
        // Also allow general network/IO exceptions if not caused by user interrupt or destroyed process
        if (e.getMessage() != null && (e.getMessage().contains("destroyed") || e.getMessage().contains("cancelled") || e.getMessage().contains("Interrupted"))) {
            return false;
        }

        return true; // default to retryable for other unexpected IO errors
    }
}
