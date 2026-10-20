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

    // 4. POST /api/compare - Compare multiple cache configurations against the same workload trace
    CROW_ROUTE(app, "/api/compare").methods("POST"_method, "OPTIONS"_method)
    ([](const crow::request& req) {
        if (req.method == "OPTIONS"_method) {
            crow::response res(204);
            apply_cors_headers(res);
            return res;
        }

        try {
            crow::json::rvalue body_json = crow::json::load(req.body);
            if (!body_json) {
                return make_error_response(400, "Invalid JSON payload in request body.");
            }

            auto [parsed_req, validation] = cache_sim::CompareRequest::fromJson(body_json);
            if (!validation.valid || !parsed_req.has_value()) {
                return make_error_response(400, validation.error_message);
            }

            const auto& compare_req = *parsed_req;

            // Generate memory access trace ONCE for all configurations
            std::vector<uint64_t> trace = cache_sim::WorkloadGenerator::generate(compare_req.workload);

            cache_sim::CompareResponse comp_response;
            comp_response.workloadConfig = compare_req.workload;

            // Store sample trace addresses (up to 10) for UI / verification
            std::size_t sample_count = std::min<std::size_t>(trace.size(), 10);
            for (std::size_t i = 0; i < sample_count; ++i) {
                comp_response.sampleAddresses.push_back(cache_sim::format_hex(trace[i]));
            }

            double max_hit_rate = -1.0;
            double min_amat = 1e18;
            std::string best_hit_rate_id;
            std::string best_amat_id;

            // Run each configuration through the exact same trace
            comp_response.comparisons.reserve(compare_req.configurations.size());
            for (const auto& config_item : compare_req.configurations) {
                cache_sim::CacheConfig norm_cfg = config_item.toCacheConfig();
                cache_sim::Cache cache(norm_cfg);

                for (uint64_t addr : trace) {
                    cache.access(addr);
                }

                cache_sim::CompareItemResult item_result;
                item_result.id = config_item.id;
                item_result.label = config_item.label;
                item_result.normalizedConfig = norm_cfg;
                item_result.report = cache.getReport();

                if (item_result.report.hitRate > max_hit_rate) {
                    max_hit_rate = item_result.report.hitRate;
                    best_hit_rate_id = config_item.id;
                }

                if (item_result.report.amatNs < min_amat) {
                    min_amat = item_result.report.amatNs;
                    best_amat_id = config_item.id;
                }

                comp_response.comparisons.push_back(std::move(item_result));
            }

            comp_response.highestHitRateConfigId = best_hit_rate_id;
            comp_response.lowestAmatConfigId = best_amat_id;

            crow::json::wvalue res_json = comp_response.toJson();
            crow::response res(200, res_json);
            apply_cors_headers(res);
            return res;

        } catch (const std::invalid_argument& ex) {
            return make_error_response(400, std::string("Validation error: ") + ex.what());
        } catch (const std::exception& ex) {
            return make_error_response(500, std::string("Internal comparison error: ") + ex.what());
        } catch (...) {
            return make_error_response(500, "Unknown internal comparison failure.");
        }
    });

    // Root endpoint for simple browser / curl verification
    CROW_ROUTE(app, "/")
    ([]() {
        return crow::response(200, "CPU Cache Simulator Backend is running.\nEndpoints:\n - GET  /api/health\n - GET  /api/config\n - POST /api/simulate\n - POST /api/compare\n");
    });

    const int port = 8080;
    std::cout << "Starting CPU Cache Simulator backend on port " << port << "..." << std::endl;
    app.port(port).multithreaded().run();
    return 0;
}
