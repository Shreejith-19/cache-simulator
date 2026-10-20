#pragma once

#include <cstdint>
#include <cstddef>
#include <string>
#include <vector>
#include <optional>
#include <sstream>
#include <iomanip>
#include <algorithm>
#include <cctype>
#include "crow/json.h"
#include "cache_config.hpp"
#include "workload_generator.hpp"
#include "simulation_stats.hpp"

namespace cache_sim {

inline std::string to_lower_copy(std::string str) {
    std::transform(str.begin(), str.end(), str.begin(), [](unsigned char c) {
        return static_cast<char>(std::tolower(c));
    });
    return str;
}

inline std::string format_hex(uint64_t address) {
    std::stringstream ss;
    ss << "0x" << std::hex << std::uppercase << std::setfill('0') << std::setw(8) << address;
    return ss.str();
}

struct ApiValidationResult {
    bool valid = true;
    std::string error_message;

    static ApiValidationResult ok() {
        return {true, ""};
    }

    static ApiValidationResult fail(const std::string& msg) {
        return {false, msg};
    }
};

struct SimulateRequest {
    std::size_t capacityBytes = 4096;
    std::size_t lineSizeBytes = 64;
    MappingStrategy mappingStrategy = MappingStrategy::SetAssociative;
    std::size_t associativity = 4;
    ReplacementPolicyType replacementPolicy = ReplacementPolicyType::LRU;
    WorkloadType workloadType = WorkloadType::Sequential;
    std::size_t numberOfAccesses = 1000;
    uint64_t randomSeed = 42;
    std::optional<double> hitTimeNs;
    std::optional<double> missPenaltyNs;

    static std::pair<std::optional<SimulateRequest>, ApiValidationResult> fromJson(const crow::json::rvalue& json) {
        SimulateRequest req;

        // 1. capacityBytes
        if (!json.has("capacityBytes")) {
            return {std::nullopt, ApiValidationResult::fail("Missing required field 'capacityBytes'.")};
        }
        if (json["capacityBytes"].t() != crow::json::type::Number) {
            return {std::nullopt, ApiValidationResult::fail("'capacityBytes' must be an integer power of two >= 1024.")};
        }
        req.capacityBytes = static_cast<std::size_t>(json["capacityBytes"].u());

        // 2. lineSizeBytes
        if (!json.has("lineSizeBytes")) {
            return {std::nullopt, ApiValidationResult::fail("Missing required field 'lineSizeBytes'.")};
        }
        if (json["lineSizeBytes"].t() != crow::json::type::Number) {
            return {std::nullopt, ApiValidationResult::fail("'lineSizeBytes' must be a number (16, 32, 64, or 128).")};
        }
        req.lineSizeBytes = static_cast<std::size_t>(json["lineSizeBytes"].u());

        // 3. mappingStrategy
        if (!json.has("mappingStrategy")) {
            return {std::nullopt, ApiValidationResult::fail("Missing required field 'mappingStrategy'.")};
        }
        if (json["mappingStrategy"].t() != crow::json::type::String) {
            return {std::nullopt, ApiValidationResult::fail("'mappingStrategy' must be a string ('DirectMapped', 'SetAssociative', or 'FullyAssociative').")};
        }
        std::string strategy_str = to_lower_copy(json["mappingStrategy"].s());
        if (strategy_str == "directmapped" || strategy_str == "direct-mapped" || strategy_str == "direct") {
            req.mappingStrategy = MappingStrategy::DirectMapped;
            req.associativity = 1;
        } else if (strategy_str == "setassociative" || strategy_str == "set-associative" || strategy_str == "n-way") {
            req.mappingStrategy = MappingStrategy::SetAssociative;
        } else if (strategy_str == "fullyassociative" || strategy_str == "fully-associative" || strategy_str == "full") {
            req.mappingStrategy = MappingStrategy::FullyAssociative;
        } else {
            return {std::nullopt, ApiValidationResult::fail("Unknown mappingStrategy '" + std::string(json["mappingStrategy"].s()) + "'. Must be DirectMapped, SetAssociative, or FullyAssociative.")};
        }

        // 4. associativity (for SetAssociative)
        if (req.mappingStrategy == MappingStrategy::SetAssociative) {
            if (!json.has("associativity") || json["associativity"].t() != crow::json::type::Number) {
                return {std::nullopt, ApiValidationResult::fail("'associativity' is required for SetAssociative cache and must be 2, 4, or 8.")};
            }
            req.associativity = static_cast<std::size_t>(json["associativity"].u());
        }

        // 5. replacementPolicy
        if (json.has("replacementPolicy")) {
            if (json["replacementPolicy"].t() != crow::json::type::String) {
                return {std::nullopt, ApiValidationResult::fail("'replacementPolicy' must be a string ('LRU' or 'FIFO').")};
            }
            std::string policy_str = to_lower_copy(json["replacementPolicy"].s());
            if (policy_str == "lru") {
                req.replacementPolicy = ReplacementPolicyType::LRU;
            } else if (policy_str == "fifo") {
                req.replacementPolicy = ReplacementPolicyType::FIFO;
            } else {
                return {std::nullopt, ApiValidationResult::fail("Unknown replacementPolicy '" + std::string(json["replacementPolicy"].s()) + "'. Must be 'LRU' or 'FIFO'.")};
            }
        } else {
            req.replacementPolicy = ReplacementPolicyType::LRU;
        }

        // 6. workloadType
        if (!json.has("workloadType") || json["workloadType"].t() != crow::json::type::String) {
            return {std::nullopt, ApiValidationResult::fail("Missing or invalid field 'workloadType'. Must be 'sequential' or 'random'.")};
        }
        std::string workload_str = to_lower_copy(json["workloadType"].s());
        if (workload_str == "sequential") {
            req.workloadType = WorkloadType::Sequential;
        } else if (workload_str == "random") {
            req.workloadType = WorkloadType::Random;
        } else {
            return {std::nullopt, ApiValidationResult::fail("Unknown workloadType '" + std::string(json["workloadType"].s()) + "'. Must be 'sequential' or 'random'.")};
        }

        // 7. numberOfAccesses
        if (!json.has("numberOfAccesses") || json["numberOfAccesses"].t() != crow::json::type::Number) {
            return {std::nullopt, ApiValidationResult::fail("Missing or invalid field 'numberOfAccesses'.")};
        }
        int64_t accesses = json["numberOfAccesses"].i();
        if (accesses < 100 || accesses > 10000) {
            return {std::nullopt, ApiValidationResult::fail("'numberOfAccesses' must be between 100 and 10,000 (got " + std::to_string(accesses) + ").")};
        }
        req.numberOfAccesses = static_cast<std::size_t>(accesses);

        // 8. randomSeed (optional, default 42)
        if (json.has("randomSeed")) {
            if (json["randomSeed"].t() != crow::json::type::Number) {
                return {std::nullopt, ApiValidationResult::fail("'randomSeed' must be a numeric integer.")};
            }
            req.randomSeed = json["randomSeed"].u();
        }

        // 9. Optional custom timing
        if (json.has("hitTimeNs") && json["hitTimeNs"].t() == crow::json::type::Number) {
            req.hitTimeNs = json["hitTimeNs"].d();
            if (*req.hitTimeNs <= 0.0) {
                return {std::nullopt, ApiValidationResult::fail("'hitTimeNs' must be greater than 0.")};
            }
        }
        if (json.has("missPenaltyNs") && json["missPenaltyNs"].t() == crow::json::type::Number) {
            req.missPenaltyNs = json["missPenaltyNs"].d();
            if (*req.missPenaltyNs <= 0.0) {
                return {std::nullopt, ApiValidationResult::fail("'missPenaltyNs' must be greater than 0.")};
            }
        }

        // Validate cache configuration semantics
        CacheConfig config;
        config.capacity_bytes = req.capacityBytes;
        config.line_size_bytes = req.lineSizeBytes;
        config.mapping_strategy = req.mappingStrategy;
        config.associativity = req.associativity;
        config.replacement_policy = req.replacementPolicy;

        CacheConfig norm = config.normalized();
        if (!norm.isValid()) {
            try {
                norm.validate();
            } catch (const std::exception& e) {
                return {std::nullopt, ApiValidationResult::fail(std::string("Cache configuration invalid: ") + e.what())};
            }
            return {std::nullopt, ApiValidationResult::fail("Invalid cache configuration parameters.")};
        }

        return {req, ApiValidationResult::ok()};
    }

    CacheConfig toCacheConfig() const {
        CacheConfig config;
        config.capacity_bytes = capacityBytes;
        config.line_size_bytes = lineSizeBytes;
        config.mapping_strategy = mappingStrategy;
        config.associativity = associativity;
        config.replacement_policy = replacementPolicy;
        if (hitTimeNs.has_value()) {
            config.timing.hit_time_ns = *hitTimeNs;
        }
        if (missPenaltyNs.has_value()) {
            config.timing.additional_miss_penalty_ns = *missPenaltyNs;
        }
        return config.normalized();
    }
};

struct AccessRecord {
    std::size_t accessIndex = 0;
    uint64_t address = 0;
    std::string hexAddress;
    uint64_t setIndex = 0;
    std::size_t lineIndex = 0;
    uint64_t tag = 0;
    bool hit = false;
    bool eviction = false;
    uint64_t evictedTag = 0;

    crow::json::wvalue toJson() const {
        crow::json::wvalue obj;
        obj["accessIndex"] = accessIndex;
        obj["address"] = address;
        obj["hexAddress"] = hexAddress;
        obj["setIndex"] = setIndex;
        obj["lineIndex"] = lineIndex;
        obj["tag"] = tag;
        obj["hit"] = hit;
        obj["eviction"] = eviction;
        if (eviction) {
            obj["evictedTag"] = evictedTag;
        } else {
            obj["evictedTag"] = nullptr;
        }
        return obj;
    }
};

struct SimulateResponse {
    CacheConfig normalizedConfig;
    WorkloadConfig workloadConfig;
    SimulationReport report;
    std::vector<AccessRecord> accessHistory;

    crow::json::wvalue toJson() const {
        crow::json::wvalue root;

        // Normalized Cache Configuration
        crow::json::wvalue config_obj;
        config_obj["capacityBytes"] = normalizedConfig.capacity_bytes;
        config_obj["lineSizeBytes"] = normalizedConfig.line_size_bytes;
        config_obj["mappingStrategy"] = to_string(normalizedConfig.mapping_strategy);
        config_obj["associativity"] = normalizedConfig.effectiveAssociativity();
        config_obj["replacementPolicy"] = to_string(normalizedConfig.replacement_policy);
        config_obj["numSets"] = normalizedConfig.numSets();
        config_obj["totalLines"] = normalizedConfig.totalLines();
        config_obj["offsetBits"] = normalizedConfig.offsetBits();
        config_obj["indexBits"] = normalizedConfig.indexBits();
        config_obj["tagBits"] = normalizedConfig.tagBits();
        root["cacheConfig"] = std::move(config_obj);

        // Workload Configuration
        crow::json::wvalue workload_obj;
        workload_obj["workloadType"] = to_string(workloadConfig.type);
        workload_obj["numberOfAccesses"] = workloadConfig.access_count;
        workload_obj["randomSeed"] = workloadConfig.seed;
        root["workloadConfig"] = std::move(workload_obj);

        // Statistics Summary
        crow::json::wvalue stats_obj;
        stats_obj["totalAccesses"] = report.totalAccesses;
        stats_obj["hits"] = report.hits;
        stats_obj["misses"] = report.misses;
        stats_obj["evictions"] = report.evictions;
        stats_obj["hitRate"] = report.hitRate;
        stats_obj["missRate"] = report.missRate;
        stats_obj["amatNs"] = report.amatNs;
        root["statistics"] = std::move(stats_obj);

        // Timing Assumptions Metadata
        crow::json::wvalue timing_obj;
        timing_obj["hitTimeNs"] = report.timing.hit_time_ns;
        timing_obj["additionalMissPenaltyNs"] = report.timing.additional_miss_penalty_ns;
        timing_obj["notes"] = report.timing.notes;
        root["timingAssumptions"] = std::move(timing_obj);

        // Access History (bounded up to 10,000 items)
        crow::json::wvalue::list history_list;
        history_list.reserve(accessHistory.size());
        for (const auto& record : accessHistory) {
            history_list.push_back(record.toJson());
        }
        root["accessHistory"] = std::move(history_list);

        return root;
    }
};

struct ConfigResponse {
    static crow::json::wvalue toJson() {
        crow::json::wvalue root;

        // Supported capacities
        crow::json::wvalue::list capacities;
        for (std::size_t cap : {1024, 2048, 4096, 8192, 16384, 32768}) {
            crow::json::wvalue c;
            c["bytes"] = cap;
            c["label"] = std::to_string(cap / 1024) + " KiB";
            capacities.push_back(std::move(c));
        }
        root["supportedCapacities"] = std::move(capacities);

        // Supported line sizes
        crow::json::wvalue::list line_sizes;
        for (std::size_t line : {16, 32, 64, 128}) {
            crow::json::wvalue l;
            l["bytes"] = line;
            l["label"] = std::to_string(line) + " B";
            line_sizes.push_back(std::move(l));
        }
        root["supportedLineSizes"] = std::move(line_sizes);

        // Supported mapping strategies
        crow::json::wvalue::list mappings;
        mappings.push_back("DirectMapped");
        mappings.push_back("SetAssociative");
        mappings.push_back("FullyAssociative");
        root["supportedMappingStrategies"] = std::move(mappings);

        // Supported associativity options for SetAssociative
        crow::json::wvalue::list assoc_options;
        assoc_options.push_back(2);
        assoc_options.push_back(4);
        assoc_options.push_back(8);
        root["supportedAssociativity"] = std::move(assoc_options);

        // Supported replacement policies
        crow::json::wvalue::list policies;
        policies.push_back("LRU");
        policies.push_back("FIFO");
        root["supportedReplacementPolicies"] = std::move(policies);

        // Supported workload types
        crow::json::wvalue::list workloads;
        workloads.push_back("sequential");
        workloads.push_back("random");
        root["supportedWorkloads"] = std::move(workloads);

        // Access count limits
        crow::json::wvalue limits;
        limits["min"] = 100;
        limits["max"] = 10000;
        limits["default"] = 1000;
        root["accessLimits"] = std::move(limits);

        // Default timing assumptions
        crow::json::wvalue timing;
        timing["hitTimeNs"] = 1.0;
        timing["additionalMissPenaltyNs"] = 50.0;
        timing["notes"] = "Configurable educational timing model assumptions; not measurements of real hardware.";
        root["defaultTiming"] = std::move(timing);

        return root;
    }
};

} // namespace cache_sim
