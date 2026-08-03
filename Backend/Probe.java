public class Probe {
    public static void main(String[] args) {
        String json = "{\"url\":\"https://www.youtube.com/watch?v=dQw4w9WgXcQ\",\"mode\":\"video\",\"resolution\":\"best\",\"audioFormat\":null,\"metadata\":true,\"thumbnail\":true,\"subtitles\":true,\"outputFolder\":\"\",\"cookies\":\"\"}";
        try {
            DownloadRequest req = DownloadRequest.parseJson(json);
            System.out.println("URL=" + req.getUrl());
            System.out.println("MODE=" + req.getMode());
            System.out.println("RES=" + req.getResolution());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
