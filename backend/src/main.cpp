#include "crow.h"
#include <iostream>
#include <string>
#include "cache.hpp"
#include "workload_generator.hpp"
#include "api_models.hpp"

namespace {

void apply_cors_headers(crow::response& res) {
    res.set_header("Access-Control-Allow-Origin", "*");
    res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
}

crow::response make_cors_options_response() {
    crow::response res(204);
    apply_cors_headers(res);
    return res;
}

crow::response make_error_response(int code, const std::string& message) {
    crow::json::wvalue err_json;
    err_json["error"] = message;
    err_json["status"] = code;
    crow::response res(code, err_json);
    apply_cors_headers(res);
    return res;
}

} // anonymous namespace

int main() {
    crow::SimpleApp app;

    // 1. GET /api/health
    CROW_ROUTE(app, "/api/health")
    .methods("GET"_method, "OPTIONS"_method)
    ([](const crow::request& req) {
        if (req.method == "OPTIONS"_method) {
            return make_cors_options_response();
        }

        crow::json::wvalue res_data;
        res_data["status"] = "ok";
        res_data["service"] = "cpu-cache-simulator-backend";
        res_data["version"] = "1.0.0";
        res_data["message"] = "C++ Crow Backend is healthy and ready for cache simulation requests.";

        crow::response res(200, res_data);
        apply_cors_headers(res);
        return res;
    });

    // 2. GET /api/config
    CROW_ROUTE(app, "/api/config")
    .methods("GET"_method, "OPTIONS"_method)
    ([](const crow::request& req) {
        if (req.method == "OPTIONS"_method) {
            return make_cors_options_response();
        }

        crow::json::wvalue config_json = cache_sim::ConfigResponse::toJson();
        crow::response res(200, config_json);
        apply_cors_headers(res);
        return res;
    });

    // 3. POST /api/simulate
    CROW_ROUTE(app, "/api/simulate")
    .methods("POST"_method, "OPTIONS"_method)
    ([](const crow::request& req) {
        if (req.method == "OPTIONS"_method) {
            return make_cors_options_response();
        }

        // Parse JSON body
        crow::json::rvalue body = crow::json::load(req.body);
        if (!body) {
            return make_error_response(400, "Malformed JSON request body.");
        }

        // Validate and deserialize request model
        auto [sim_req_opt, validation] = cache_sim::SimulateRequest::fromJson(body);
        if (!validation.valid || !sim_req_opt.has_value()) {
            return make_error_response(400, validation.error_message);
        }

        try {
            const auto& sim_req = *sim_req_opt;
            cache_sim::CacheConfig cache_config = sim_req.toCacheConfig();
            cache_sim::Cache cache(cache_config);

            // Configure workload generator
            cache_sim::WorkloadConfig workload_config;
            workload_config.type = sim_req.workloadType;
            workload_config.access_count = sim_req.numberOfAccesses;
            workload_config.seed = sim_req.randomSeed;

            // Generate trace
            std::vector<uint64_t> trace = cache_sim::WorkloadGenerator::generate(workload_config);

            // Execute simulation
            std::vector<cache_sim::AccessRecord> history;
            history.reserve(trace.size());

            for (std::size_t i = 0; i < trace.size(); ++i) {
                uint64_t addr = trace[i];
                auto access_res = cache.access(addr);

                cache_sim::AccessRecord record;
                record.accessIndex = i + 1;
                record.address = addr;
                record.hexAddress = cache_sim::format_hex(addr);
                record.setIndex = access_res.set_index;
                record.lineIndex = access_res.line_index;
                record.tag = access_res.tag;
                record.hit = access_res.hit;
                record.eviction = access_res.eviction;
                record.evictedTag = access_res.evicted_tag;

                history.push_back(std::move(record));
            }

            // Build response
            cache_sim::SimulateResponse sim_response;
            sim_response.normalizedConfig = cache_config;
            sim_response.workloadConfig = workload_config;
            sim_response.report = cache.getReport();
            sim_response.accessHistory = std::move(history);

            crow::json::wvalue res_json = sim_response.toJson();
            crow::response res(200, res_json);
            apply_cors_headers(res);
            return res;

        } catch (const std::invalid_argument& ex) {
            return make_error_response(400, std::string("Validation error: ") + ex.what());
        } catch (const std::exception& ex) {
            return make_error_response(500, std::string("Internal simulation error: ") + ex.what());
        } catch (...) {
            return make_error_response(500, "Unknown internal simulation failure.");
        }
    });

    // Root endpoint for simple browser / curl verification
    CROW_ROUTE(app, "/")
    ([]() {
        return crow::response(200, "CPU Cache Simulator Backend is running.\nEndpoints:\n - GET  /api/health\n - GET  /api/config\n - POST /api/simulate\n");
    });

    const int port = 8080;
    std::cout << "Starting CPU Cache Simulator backend on port " << port << "..." << std::endl;
    app.port(port).multithreaded().run();
    return 0;
}
