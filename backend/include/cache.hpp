#pragma once

#include <vector>
#include <memory>
#include <cstdint>
#include <stdexcept>
#include "cache_config.hpp"
#include "cache_line.hpp"
#include "cache_set.hpp"
#include "replacement_policy.hpp"
#include "simulation_stats.hpp"

namespace cache_sim {

struct AddressDecomposition {
    uint64_t raw_address = 0;
    uint64_t block_address = 0;
    uint64_t offset = 0;
    uint64_t set_index = 0;
    uint64_t tag = 0;
};

struct AccessResult {
    bool hit = false;
    bool eviction = false;
    uint64_t set_index = 0;
    std::size_t line_index = 0;
    uint64_t tag = 0;
    uint64_t evicted_tag = 0;
    uint64_t address = 0;
};

class Cache {
public:
    explicit Cache(const CacheConfig& config);

    AddressDecomposition decompose(uint64_t address) const noexcept;

    AccessResult access(uint64_t address);

    void reset() noexcept;

    const CacheConfig& getConfig() const noexcept { return config_; }
    const SimulationStats& getStats() const noexcept { return stats_; }
    const std::vector<CacheSet>& getSets() const noexcept { return sets_; }
    std::size_t getNumSets() const noexcept { return sets_.size(); }
    std::size_t getAssociativity() const noexcept { return config_.effectiveAssociativity(); }

    SimulationReport getReport() const noexcept { return stats_.generateReport(config_.timing); }
    SimulationReport getReport(const TimingAssumptions& timing) const noexcept { return stats_.generateReport(timing); }
    void setTimingAssumptions(const TimingAssumptions& timing) noexcept { config_.timing = timing; }
    const TimingAssumptions& getTimingAssumptions() const noexcept { return config_.timing; }

private:
    CacheConfig config_;
    std::vector<CacheSet> sets_;
    std::unique_ptr<ReplacementPolicy> replacement_policy_;
    SimulationStats stats_;
    uint64_t access_counter_ = 0;
};

} // namespace cache_sim
