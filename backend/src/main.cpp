#include "crow.h"
#include <iostream>

int main() {
    crow::SimpleApp app;

    // GET /api/health
    CROW_ROUTE(app, "/api/health")
    .methods("GET"_method, "OPTIONS"_method)
    ([](const crow::request& req) {
        if (req.method == "OPTIONS"_method) {
            crow::response res(204);
            res.set_header("Access-Control-Allow-Origin", "*");
            res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            res.set_header("Access-Control-Allow-Headers", "Content-Type");
            return res;
        }

        crow::json::wvalue res_data;
        res_data["status"] = "ok";
        res_data["service"] = "cpu-cache-simulator-backend";
        res_data["version"] = "1.0.0";
        res_data["message"] = "C++ Crow Backend is healthy and ready for cache simulation requests.";
        
        crow::response res(200, res_data);
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type");
        return res;
    });

    // Root endpoint for simple browser / curl verification
    CROW_ROUTE(app, "/")
    ([]() {
        return crow::response(200, "CPU Cache Simulator Backend is running. Access /api/health for API status.\n");
    });

    const int port = 8080;
    std::cout << "Starting CPU Cache Simulator backend on port " << port << "..." << std::endl;
    app.port(port).multithreaded().run();
    return 0;
}
