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

int main() {
    std::cout << "========================================" << std::endl;
    std::cout << " CPU Cache Simulator API Integration Tests" << std::endl;
    std::cout << "========================================" << std::endl;

    test_valid_api_requests();
    test_invalid_api_requests();
    test_simulation_response_serialization();
    test_config_endpoint_serialization();

    std::cout << "========================================" << std::endl;
    std::cout << " ALL API INTEGRATION TESTS PASSED (4/4)!" << std::endl;
    std::cout << "========================================" << std::endl;

    return 0;
}
