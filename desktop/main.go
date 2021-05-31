package main

import (
	"bufio"
	"embed"
	"fmt"
	"io"
	"log"
	"math/rand"
	"mime"
	"net"
	"net/http"
	"os/exec"
	"path"
	"path/filepath"
	"runtime"
	"time"
)

//go:embed build
var content embed.FS

var fs = http.FS(content)

func serveStatic(writer http.ResponseWriter, request *http.Request) {
	url := "/build" + path.Clean(request.URL.Path)

	file, err := fs.Open(url)
	if err != nil {
		url = "/build/index.html"
		file, err = fs.Open(url)
	}

	if err != nil {
		http.NotFound(writer, request)
		return
	}

	headers := writer.Header()

	headers.Set("Cross-Origin-Embedder-Policy", "require-corp")
	headers.Set("Cross-Origin-Opener-Policy", "same-origin")

	contentType := mime.TypeByExtension(filepath.Ext(url))
	if contentType == "" {
		data := make([]byte, 512)
		read, err := io.ReadFull(file, data)
		if err != nil && read == 0 {
			http.Error(writer, "could not read file", http.StatusInternalServerError)
			return
		}
		contentType = http.DetectContentType(data)
	}

	headers.Set("Content-Type", contentType)

	reader := bufio.NewReader(file)

	_, err = reader.WriteTo(writer)
	if err != nil {
		log.Print("response write failed", err)
	}
}

func randomPort() int {
	return 1024 + rand.Intn(40000)
}

func startServer() string {
	http.HandleFunc("/", serveStatic)

	port := 16810

	for i := 0; i < 10; i++ {
		addr := fmt.Sprintf("localhost:%d", port)

		listener, err := net.Listen("tcp", addr)
		if err != nil {
			log.Print("could not start server on ", addr)
			port = randomPort()
			continue
		}

		go func() {
			server := &http.Server{Addr: addr}
			err := server.Serve(listener)
			log.Fatal(err)
		}()

		return addr
	}

	log.Fatal("could not bind to any port")
	panic(nil)
}

func open(url string) error {
	var cmd string
	var args []string

	switch runtime.GOOS {
	case "windows":
		cmd = "cmd"
		args = []string{"/c", "start"}
	case "darwin":
		cmd = "open"
	default:
		cmd = "xdg-open"
	}

	args = append(args, url)

	return exec.Command(cmd, args...).Start()
}

func main() {
	rand.Seed(time.Now().Unix())

	addr := "http://" + startServer()

	if err := open(addr); err != nil {
		log.Print("не удалось открыть браузер, перейдите на страницу самостоятельно: ", addr)
	}

	log.Print("нажмите Ctrl+C или закройте окно, чтобы завершить игру")

	select {}
}
