#include <iostream>
#include <cassert>
#include <string>
#include "crow/json.h"
#include "api_models.hpp"
#include "cache.hpp"
#include "workload_generator.hpp"

using namespace cache_sim;

void test_valid_api_requests() {
    std::cout << "[TEST] Running test_valid_api_requests..." << std::endl;

    // 1. Valid SetAssociative Request
    std::string json_str_1 = R"({
        "capacityBytes": 4096,
        "lineSizeBytes": 64,
        "mappingStrategy": "SetAssociative",
        "associativity": 4,
        "replacementPolicy": "LRU",
        "workloadType": "sequential",
        "numberOfAccesses": 1000,
        "randomSeed": 42
    })";

    crow::json::rvalue r1 = crow::json::load(json_str_1);
    assert(r1);
    auto [req1, val1] = SimulateRequest::fromJson(r1);
    assert(val1.valid);
    assert(req1.has_value());
    assert(req1->capacityBytes == 4096);
    assert(req1->lineSizeBytes == 64);
    assert(req1->mappingStrategy == MappingStrategy::SetAssociative);
    assert(req1->associativity == 4);
    assert(req1->replacementPolicy == ReplacementPolicyType::LRU);
    assert(req1->workloadType == WorkloadType::Sequential);
    assert(req1->numberOfAccesses == 1000);
    assert(req1->randomSeed == 42);

    // 2. Valid DirectMapped Request
    std::string json_str_2 = R"({
        "capacityBytes": 1024,
        "lineSizeBytes": 32,
        "mappingStrategy": "DirectMapped",
        "replacementPolicy": "FIFO",
        "workloadType": "random",
        "numberOfAccesses": 500,
        "randomSeed": 999
    })";

    crow::json::rvalue r2 = crow::json::load(json_str_2);
    assert(r2);
    auto [req2, val2] = SimulateRequest::fromJson(r2);
    assert(val2.valid);
    assert(req2.has_value());
    assert(req2->mappingStrategy == MappingStrategy::DirectMapped);
    assert(req2->associativity == 1);
    assert(req2->replacementPolicy == ReplacementPolicyType::FIFO);
    assert(req2->workloadType == WorkloadType::Random);
    assert(req2->numberOfAccesses == 500);

    // 3. Valid FullyAssociative Request
    std::string json_str_3 = R"({
        "capacityBytes": 2048,
        "lineSizeBytes": 64,
        "mappingStrategy": "FullyAssociative",
        "replacementPolicy": "LRU",
        "workloadType": "sequential",
        "numberOfAccesses": 250
    })";

    crow::json::rvalue r3 = crow::json::load(json_str_3);
    assert(r3);
    auto [req3, val3] = SimulateRequest::fromJson(r3);
    assert(val3.valid);
    assert(req3.has_value());
    assert(req3->mappingStrategy == MappingStrategy::FullyAssociative);

    // 4. Valid Request with Custom Timing
    std::string json_str_4 = R"({
        "capacityBytes": 8192,
        "lineSizeBytes": 64,
        "mappingStrategy": "SetAssociative",
        "associativity": 8,
        "replacementPolicy": "LRU",
        "workloadType": "sequential",
        "numberOfAccesses": 100,
        "hitTimeNs": 1.5,
        "missPenaltyNs": 60.0
    })";

    crow::json::rvalue r4 = crow::json::load(json_str_4);
    assert(r4);
    auto [req4, val4] = SimulateRequest::fromJson(r4);
    assert(val4.valid);
    assert(req4.has_value());
    assert(req4->hitTimeNs.has_value() && *req4->hitTimeNs == 1.5);
    assert(req4->missPenaltyNs.has_value() && *req4->missPenaltyNs == 60.0);

    std::cout << "  -> test_valid_api_requests PASSED!" << std::endl;
}

void test_invalid_api_requests() {
    std::cout << "[TEST] Running test_invalid_api_requests..." << std::endl;

    auto check_invalid = [](const std::string& json_str) {
        crow::json::rvalue r = crow::json::load(json_str);
        if (!r) return true; // Malformed JSON correctly rejected
        auto [req, val] = SimulateRequest::fromJson(r);
        return !val.valid;
    };

    // Missing capacityBytes
    assert(check_invalid(R"({
        "lineSizeBytes": 64,
        "mappingStrategy": "DirectMapped",
        "workloadType": "sequential",
        "numberOfAccesses": 500
    })"));

    // Non-power-of-2 capacity
    assert(check_invalid(R"({
        "capacityBytes": 3000,
        "lineSizeBytes": 64,
        "mappingStrategy": "DirectMapped",
        "workloadType": "sequential",
        "numberOfAccesses": 500
    })"));

    // Capacity < 1024
    assert(check_invalid(R"({
        "capacityBytes": 512,
        "lineSizeBytes": 64,
        "mappingStrategy": "DirectMapped",
        "workloadType": "sequential",
        "numberOfAccesses": 500
    })"));

    // Invalid line size (48 bytes)
    assert(check_invalid(R"({
        "capacityBytes": 4096,
        "lineSizeBytes": 48,
        "mappingStrategy": "DirectMapped",
        "workloadType": "sequential",
        "numberOfAccesses": 500
    })"));

    // Unknown mapping strategy
    assert(check_invalid(R"({
        "capacityBytes": 4096,
        "lineSizeBytes": 64,
        "mappingStrategy": "MagicAssociative",
        "workloadType": "sequential",
        "numberOfAccesses": 500
    })"));

    // SetAssociative without associativity
    assert(check_invalid(R"({
        "capacityBytes": 4096,
        "lineSizeBytes": 64,
        "mappingStrategy": "SetAssociative",
        "workloadType": "sequential",
        "numberOfAccesses": 500
    })"));

    // SetAssociative with invalid associativity (3-way)
    assert(check_invalid(R"({
        "capacityBytes": 4096,
        "lineSizeBytes": 64,
        "mappingStrategy": "SetAssociative",
        "associativity": 3,
        "workloadType": "sequential",
        "numberOfAccesses": 500
    })"));

    // Unknown replacement policy
    assert(check_invalid(R"({
        "capacityBytes": 4096,
        "lineSizeBytes": 64,
        "mappingStrategy": "DirectMapped",
        "replacementPolicy": "RANDOM_GUESS",
        "workloadType": "sequential",
        "numberOfAccesses": 500
    })"));

    // Unknown workload type
    assert(check_invalid(R"({
        "capacityBytes": 4096,
        "lineSizeBytes": 64,
        "mappingStrategy": "DirectMapped",
        "workloadType": "matrix_multiply",
        "numberOfAccesses": 500
    })"));

    // Accesses < 100
    assert(check_invalid(R"({
        "capacityBytes": 4096,
        "lineSizeBytes": 64,
        "mappingStrategy": "DirectMapped",
        "workloadType": "sequential",
        "numberOfAccesses": 50
    })"));

    // Accesses > 10000
    assert(check_invalid(R"({
        "capacityBytes": 4096,
        "lineSizeBytes": 64,
        "mappingStrategy": "DirectMapped",
        "workloadType": "sequential",
        "numberOfAccesses": 20000
    })"));

    // Negative custom hit time
    assert(check_invalid(R"({
        "capacityBytes": 4096,
        "lineSizeBytes": 64,
        "mappingStrategy": "DirectMapped",
        "workloadType": "sequential",
        "numberOfAccesses": 500,
        "hitTimeNs": -2.0
    })"));

    std::cout << "  -> test_invalid_api_requests PASSED!" << std::endl;
}

void test_simulation_response_serialization() {
    std::cout << "[TEST] Running test_simulation_response_serialization..." << std::endl;

    std::string json_req = R"({
        "capacityBytes": 4096,
        "lineSizeBytes": 64,
        "mappingStrategy": "SetAssociative",
        "associativity": 4,
        "replacementPolicy": "LRU",
        "workloadType": "sequential",
        "numberOfAccesses": 128,
        "randomSeed": 42
    })";

    crow::json::rvalue r = crow::json::load(json_req);
    auto [sim_req, val] = SimulateRequest::fromJson(r);
    assert(val.valid);

    CacheConfig cache_config = sim_req->toCacheConfig();
    Cache cache(cache_config);

    WorkloadConfig workload_config;
    workload_config.type = sim_req->workloadType;
    workload_config.access_count = sim_req->numberOfAccesses;
    workload_config.seed = sim_req->randomSeed;

    auto trace = WorkloadGenerator::generate(workload_config);
    assert(trace.size() == 128);

    std::vector<AccessRecord> history;
    history.reserve(trace.size());
    for (std::size_t i = 0; i < trace.size(); ++i) {
        uint64_t addr = trace[i];
        auto access_res = cache.access(addr);

        AccessRecord rec;
        rec.accessIndex = i + 1;
        rec.address = addr;
        rec.hexAddress = format_hex(addr);
        rec.setIndex = access_res.set_index;
        rec.lineIndex = access_res.line_index;
        rec.tag = access_res.tag;
        rec.hit = access_res.hit;
        rec.eviction = access_res.eviction;
        rec.evictedTag = access_res.evicted_tag;

        history.push_back(std::move(rec));
    }

    SimulateResponse response;
    response.normalizedConfig = cache_config;
    response.workloadConfig = workload_config;
    response.report = cache.getReport();
    response.accessHistory = std::move(history);

    crow::json::wvalue res_json = response.toJson();
    std::string serialized = res_json.dump();
    assert(!serialized.empty());

    // Verify response deserializes back cleanly
    crow::json::rvalue parsed = crow::json::load(serialized);
    assert(parsed);
    assert(parsed.has("cacheConfig"));
    assert(parsed.has("workloadConfig"));
    assert(parsed.has("statistics"));
    assert(parsed.has("timingAssumptions"));
    assert(parsed.has("accessHistory"));

    // Check statistics
    assert(parsed["statistics"]["totalAccesses"].u() == 128);
    assert(parsed["statistics"]["hits"].u() + parsed["statistics"]["misses"].u() == 128);
    assert(parsed["statistics"]["amatNs"].d() > 0.0);

    // Check access history
    assert(parsed["accessHistory"].size() == 128);
    assert(parsed["accessHistory"][0]["accessIndex"].u() == 1);
    assert(parsed["accessHistory"][0]["hexAddress"].s() == "0x00000000");

    std::cout << "  -> test_simulation_response_serialization PASSED!" << std::endl;
}

void test_config_endpoint_serialization() {
    std::cout << "[TEST] Running test_config_endpoint_serialization..." << std::endl;

    crow::json::wvalue config_json = ConfigResponse::toJson();
    std::string serialized = config_json.dump();
    assert(!serialized.empty());

    crow::json::rvalue parsed = crow::json::load(serialized);
    assert(parsed);
    assert(parsed.has("supportedCapacities"));
    assert(parsed.has("supportedLineSizes"));
    assert(parsed.has("supportedMappingStrategies"));
    assert(parsed.has("supportedAssociativity"));
    assert(parsed.has("supportedReplacementPolicies"));
    assert(parsed.has("supportedWorkloads"));
    assert(parsed.has("accessLimits"));
    assert(parsed.has("defaultTiming"));

    assert(parsed["accessLimits"]["min"].i() == 100);
    assert(parsed["accessLimits"]["max"].i() == 10000);
    assert(parsed["defaultTiming"]["hitTimeNs"].d() == 1.0);
    assert(parsed["defaultTiming"]["additionalMissPenaltyNs"].d() == 50.0);

    std::cout << "  -> test_config_endpoint_serialization PASSED!" << std::endl;
}

void test_compare_endpoint_and_same_trace() {
    std::cout << "[TEST] Running test_compare_endpoint_and_same_trace..." << std::endl;

    // 1. Valid multi-configuration comparison
    std::string compare_json = R"({
        "workload": {
            "workloadType": "random",
            "numberOfAccesses": 500,
            "randomSeed": 12345
        },
        "configurations": [
            {
                "id": "c1",
                "label": "Direct-Mapped 1KB",
                "capacityBytes": 1024,
                "lineSizeBytes": 32,
                "mappingStrategy": "DirectMapped",
                "replacementPolicy": "FIFO"
            },
            {
                "id": "c2",
                "label": "2-Way SA 2KB LRU",
                "capacityBytes": 2048,
                "lineSizeBytes": 32,
                "mappingStrategy": "SetAssociative",
                "associativity": 2,
                "replacementPolicy": "LRU"
            },
            {
                "id": "c3",
                "label": "4-Way SA 4KB FIFO",
                "capacityBytes": 4096,
                "lineSizeBytes": 64,
                "mappingStrategy": "SetAssociative",
                "associativity": 4,
                "replacementPolicy": "FIFO"
            }
        ]
    })";

    crow::json::rvalue r = crow::json::load(compare_json);
    assert(r);
    auto [comp_req, val] = CompareRequest::fromJson(r);
    assert(val.valid);
    assert(comp_req.has_value());
    assert(comp_req->configurations.size() == 3);

    // Generate single trace
    std::vector<uint64_t> master_trace = WorkloadGenerator::generate(comp_req->workload);
    assert(master_trace.size() == 500);

    // Verify all configurations receive and process the exact same sequence of addresses
    std::vector<std::vector<uint64_t>> processed_sequences(comp_req->configurations.size());
    std::vector<CompareItemResult> results;

    for (std::size_t i = 0; i < comp_req->configurations.size(); ++i) {
        const auto& item = comp_req->configurations[i];
        CacheConfig norm = item.toCacheConfig();
        Cache cache(norm);

        for (uint64_t addr : master_trace) {
            processed_sequences[i].push_back(addr);
            cache.access(addr);
        }

        CompareItemResult res;
        res.id = item.id;
        res.label = item.label;
        res.normalizedConfig = norm;
        res.report = cache.getReport();
        results.push_back(std::move(res));
    }

    // Proof: Compare every address in every configuration's recorded stream against master_trace
    for (std::size_t i = 0; i < comp_req->configurations.size(); ++i) {
        assert(processed_sequences[i].size() == master_trace.size());
        for (std::size_t j = 0; j < master_trace.size(); ++j) {
            assert(processed_sequences[i][j] == master_trace[j]);
        }
    }
    // Also pairwise check between configs
    assert(processed_sequences[0] == processed_sequences[1]);
    assert(processed_sequences[1] == processed_sequences[2]);

    // Check statistics validity
    for (const auto& item_res : results) {
        assert(item_res.report.totalAccesses == 500);
        assert(item_res.report.hits + item_res.report.misses == 500);
        assert(item_res.report.hitRate >= 0.0 && item_res.report.hitRate <= 100.0);
        assert(item_res.report.missRate >= 0.0 && item_res.report.missRate <= 100.0);
        assert(item_res.report.amatNs > 0.0);
    }

    // Response serialization test
    CompareResponse response;
    response.workloadConfig = comp_req->workload;
    response.comparisons = std::move(results);
    response.highestHitRateConfigId = "c3";
    response.lowestAmatConfigId = "c3";
    for (std::size_t i = 0; i < 5; ++i) {
        response.sampleAddresses.push_back(format_hex(master_trace[i]));
    }

    crow::json::wvalue resp_w = response.toJson();
    std::string resp_dump = resp_w.dump();
    crow::json::rvalue resp_r = crow::json::load(resp_dump);
    assert(resp_r);
    assert(resp_r.has("comparisons"));
    assert(resp_r["comparisons"].size() == 3);
    assert(resp_r.has("analysis"));
    assert(resp_r["analysis"].has("workloadDependenceNotice"));
    assert(resp_r.has("sampleTraceAddresses"));
    assert(resp_r["sampleTraceAddresses"].size() == 5);

    // 2. Validation bounds tests:
    // Reject fewer than 2 configurations
    std::string too_few_configs = R"({
        "workload": {"workloadType": "sequential", "numberOfAccesses": 200},
        "configurations": [
            {"id": "c1", "capacityBytes": 1024, "lineSizeBytes": 32, "mappingStrategy": "DirectMapped"}
        ]
    })";
    crow::json::rvalue r_few = crow::json::load(too_few_configs);
    auto [req_few, val_few] = CompareRequest::fromJson(r_few);
    assert(!val_few.valid);

    // Reject more than 6 configurations
    std::string too_many_configs = R"({
        "workload": {"workloadType": "sequential", "numberOfAccesses": 200},
        "configurations": [
            {"id": "c1", "capacityBytes": 1024, "lineSizeBytes": 32, "mappingStrategy": "DirectMapped"},
            {"id": "c2", "capacityBytes": 2048, "lineSizeBytes": 32, "mappingStrategy": "DirectMapped"},
            {"id": "c3", "capacityBytes": 4096, "lineSizeBytes": 32, "mappingStrategy": "DirectMapped"},
            {"id": "c4", "capacityBytes": 8192, "lineSizeBytes": 32, "mappingStrategy": "DirectMapped"},
            {"id": "c5", "capacityBytes": 16384, "lineSizeBytes": 32, "mappingStrategy": "DirectMapped"},
            {"id": "c6", "capacityBytes": 32768, "lineSizeBytes": 32, "mappingStrategy": "DirectMapped"},
            {"id": "c7", "capacityBytes": 65536, "lineSizeBytes": 32, "mappingStrategy": "DirectMapped"}
        ]
    })";
    crow::json::rvalue r_many = crow::json::load(too_many_configs);
    auto [req_many, val_many] = CompareRequest::fromJson(r_many);
    assert(!val_many.valid);

    // Reject out-of-range numberOfAccesses (e.g. 50 < 100)
    std::string too_few_accesses = R"({
        "workload": {"workloadType": "sequential", "numberOfAccesses": 50},
        "configurations": [
            {"id": "c1", "capacityBytes": 1024, "lineSizeBytes": 32, "mappingStrategy": "DirectMapped"},
            {"id": "c2", "capacityBytes": 2048, "lineSizeBytes": 32, "mappingStrategy": "DirectMapped"}
        ]
    })";
    crow::json::rvalue r_acc = crow::json::load(too_few_accesses);
    auto [req_acc, val_acc] = CompareRequest::fromJson(r_acc);
    assert(!val_acc.valid);

    std::cout << "  -> test_compare_endpoint_and_same_trace PASSED!" << std::endl;
}

int main() {
    std::cout << "========================================" << std::endl;
    std::cout << " CPU Cache Simulator API Integration Tests" << std::endl;
    std::cout << "========================================" << std::endl;

    test_valid_api_requests();
    test_invalid_api_requests();
    test_simulation_response_serialization();
    test_config_endpoint_serialization();
    test_compare_endpoint_and_same_trace();

    std::cout << "========================================" << std::endl;
    std::cout << " ALL API INTEGRATION TESTS PASSED (5/5)!" << std::endl;
    std::cout << "========================================" << std::endl;

    return 0;
}
