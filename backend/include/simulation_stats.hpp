#pragma once

#include <cstdint>
#include <cstddef>
#include <string>
#include <cmath>

namespace cache_sim {

/**
 * Educational timing model assumptions.
 * Note: These are configurable parameters for an educational model,
 * NOT physical measurements of real hardware.
 */
struct TimingAssumptions {
    double hit_time_ns = 1.0;                  // Cache hit time (default: 1.0 ns)
    double additional_miss_penalty_ns = 50.0;  // Additional miss penalty (default: 50.0 ns)
    std::string notes = "Configurable educational timing model assumptions; not measurements of real hardware.";
};

/**
 * Complete statistical report of a cache simulation run.
 */
struct SimulationReport {
    uint64_t totalAccesses = 0;
    uint64_t hits = 0;
    uint64_t misses = 0;
    uint64_t evictions = 0;
    double hitRate = 0.0;   // Percentage: hits / totalAccesses * 100
    double missRate = 0.0;  // Percentage: misses / totalAccesses * 100
    double amatNs = 0.0;    // AMAT in nanoseconds: hitTime + (missRate_fraction * additionalMissPenalty)
    TimingAssumptions timing;

    // Display / formatting helper preserving internal precision
    static double roundTo(double value, int decimals) noexcept {
        double factor = std::pow(10.0, decimals);
        return std::round(value * factor) / factor;
    }
};

class SimulationStats {
public:
    uint64_t total_accesses = 0;
    uint64_t hits = 0;
    uint64_t misses = 0;
    uint64_t evictions = 0;

    // Fractional rates [0.0, 1.0]
    double hit_rate_fraction() const noexcept {
        return total_accesses > 0 ? (static_cast<double>(hits) / static_cast<double>(total_accesses)) : 0.0;
    }

    double miss_rate_fraction() const noexcept {
        return total_accesses > 0 ? (static_cast<double>(misses) / static_cast<double>(total_accesses)) : 0.0;
    }

    // Percentage rates [0.0, 100.0]
    double hit_rate_percentage() const noexcept {
        return hit_rate_fraction() * 100.0;
    }

    double miss_rate_percentage() const noexcept {
        return miss_rate_fraction() * 100.0;
    }

    // Percentage aliases
    double hitRate() const noexcept {
        return hit_rate_percentage();
    }

    double missRate() const noexcept {
        return miss_rate_percentage();
    }

    // Fractional aliases
    double hit_rate() const noexcept {
        return hit_rate_fraction();
    }

    double miss_rate() const noexcept {
        return miss_rate_fraction();
    }

    // AMAT in nanoseconds
    // AMAT = hitTime + (missRate as fraction * additionalMissPenalty)
    // Avoids division by zero: if total_accesses == 0, returns 0.0 ns.
    double calculate_amat(const TimingAssumptions& timing = {}) const noexcept {
        if (total_accesses == 0) {
            return 0.0;
        }
        return timing.hit_time_ns + (miss_rate_fraction() * timing.additional_miss_penalty_ns);
    }

    SimulationReport generateReport(const TimingAssumptions& timing = {}) const noexcept {
        SimulationReport report;
        report.totalAccesses = total_accesses;
        report.hits = hits;
        report.misses = misses;
        report.evictions = evictions;
        report.hitRate = hit_rate_percentage();
        report.missRate = miss_rate_percentage();
        report.amatNs = calculate_amat(timing);
        report.timing = timing;
        return report;
    }

    void recordHit() noexcept {
        ++total_accesses;
        ++hits;
    }

    void recordMiss(bool evicted) noexcept {
        ++total_accesses;
        ++misses;
        if (evicted) {
            ++evictions;
        }
    }

    void reset() noexcept {
        total_accesses = 0;
        hits = 0;
        misses = 0;
        evictions = 0;
    }
};

} // namespace cache_sim
