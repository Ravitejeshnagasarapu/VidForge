public class Exceptions {
    public static class UserCancelledException extends RuntimeException {
        public UserCancelledException(String message) {
            super(message);
        }
    }

    public static class NetworkException extends RuntimeException {
        public NetworkException(String message) {
            super(message);
        }
        public NetworkException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
