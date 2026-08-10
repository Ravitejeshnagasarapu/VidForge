public class Exceptions {
    public static class UserCancelledException extends RuntimeException {
        private static final long serialVersionUID = 1L;

        public UserCancelledException(String message) {
            super(message);
        }
    }

    public static class NetworkException extends RuntimeException {
        private static final long serialVersionUID = 1L;

        public NetworkException(String message) {
            super(message);
        }

        public NetworkException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
