#include <iostream>
#include <cassert>
#include <vector>
#include <cmath>
#include "cache_config.hpp"
#include "cache.hpp"
#include "workload_generator.hpp"

using namespace cache_sim;

void test_config_validation() {
    std::cout << "[TEST] Running test_config_validation..." << std::endl;

    // Standard valid power-of-two capacities and line sizes
    for (std::size_t cap : {1024, 2048, 4096, 8192, 16384, 32768}) {
        for (std::size_t line : {16, 32, 64, 128}) {
            // Direct-mapped
            CacheConfig dm_config{cap, line, MappingStrategy::DirectMapped, 1, ReplacementPolicyType::LRU};
            assert(dm_config.isValid());
            assert(dm_config.numSets() == cap / line);
            assert(dm_config.effectiveAssociativity() == 1);

            // Set-associative (2, 4, 8-way)
            for (std::size_t assoc : {2, 4, 8}) {
                if (cap >= line * assoc) {
                    CacheConfig sa_config{cap, line, MappingStrategy::SetAssociative, assoc, ReplacementPolicyType::LRU};
                    assert(sa_config.isValid());
                    assert(sa_config.numSets() == cap / (line * assoc));
                    assert(sa_config.effectiveAssociativity() == assoc);
                }
            }

            // Fully associative
            CacheConfig fa_config{cap, line, MappingStrategy::FullyAssociative, 0, ReplacementPolicyType::LRU};
            CacheConfig norm = fa_config.normalized();
            assert(norm.isValid());
            assert(norm.numSets() == 1);
            assert(norm.effectiveAssociativity() == cap / line);
        }
    }

    // Invalid capacity: not a power of 2
    CacheConfig bad_cap{3000, 64, MappingStrategy::DirectMapped, 1, ReplacementPolicyType::LRU};
    assert(!bad_cap.isValid());

    // Invalid capacity: < 1024
    CacheConfig small_cap{512, 64, MappingStrategy::DirectMapped, 1, ReplacementPolicyType::LRU};
    assert(!small_cap.isValid());

    // Invalid line size: 48 bytes (not 16, 32, 64, 128)
    CacheConfig bad_line{4096, 48, MappingStrategy::DirectMapped, 1, ReplacementPolicyType::LRU};
    assert(!bad_line.isValid());

    // Invalid associativity for SetAssociative: 3 (not power of 2)
    CacheConfig bad_assoc{4096, 64, MappingStrategy::SetAssociative, 3, ReplacementPolicyType::LRU};
    assert(!bad_assoc.isValid());

    std::cout << "  -> test_config_validation PASSED!" << std::endl;
}

void test_address_to_set_mapping() {
    std::cout << "[TEST] Running test_address_to_set_mapping..." << std::endl;

    // Config: 1024 B capacity, 64 B line size, Direct-Mapped (16 sets)
    // Offset bits = 6 (2^6 = 64)
    // Index bits = 4 (2^4 = 16 sets)
    // Tag bits = 64 - 6 - 4 = 54
    CacheConfig config{1024, 64, MappingStrategy::DirectMapped, 1, ReplacementPolicyType::LRU};
    Cache cache(config);

    assert(config.offsetBits() == 6);
    assert(config.indexBits() == 4);
    assert(config.numSets() == 16);

    // Address 0x0000: Block 0, Offset 0, Set 0, Tag 0
    auto d0 = cache.decompose(0);
    assert(d0.offset == 0);
    assert(d0.set_index == 0);
    assert(d0.tag == 0);

    // Address 0x003F (63): Same block, Offset 63, Set 0, Tag 0
    auto d63 = cache.decompose(63);
    assert(d63.offset == 63);
    assert(d63.set_index == 0);
    assert(d63.tag == 0);

    // Address 0x0040 (64): Block 1, Offset 0, Set 1, Tag 0
    auto d64 = cache.decompose(64);
    assert(d64.offset == 0);
    assert(d64.set_index == 1);
    assert(d64.tag == 0);

    // Address 0x03C0 (15 * 64 = 960): Block 15, Set 15, Tag 0
    auto d960 = cache.decompose(960);
    assert(d960.offset == 0);
    assert(d960.set_index == 15);
    assert(d960.tag == 0);

    // Address 0x0400 (1024): Block 16, wraps around to Set 0 with Tag 1!
    auto d1024 = cache.decompose(1024);
    assert(d1024.offset == 0);
    assert(d1024.set_index == 0);
    assert(d1024.tag == 1);

    // Fully associative test: 2048 B, 64 B line, 1 set
    CacheConfig fa_config{2048, 64, MappingStrategy::FullyAssociative, 0, ReplacementPolicyType::LRU};
    Cache fa_cache(fa_config);
    assert(fa_cache.getNumSets() == 1);
    assert(fa_cache.getAssociativity() == 32);

    auto fa_d1 = fa_cache.decompose(0x1234);
    assert(fa_d1.set_index == 0);
    assert(fa_d1.tag == (0x1234 >> 6));

    std::cout << "  -> test_address_to_set_mapping PASSED!" << std::endl;
}

void test_compulsory_misses_and_hits() {
    std::cout << "[TEST] Running test_compulsory_misses_and_hits..." << std::endl;

    // 4096 B cache, 64 B line size, 4-way set-associative
    CacheConfig config{4096, 64, MappingStrategy::SetAssociative, 4, ReplacementPolicyType::LRU};
    Cache cache(config);

    // Access address 0: Compulsory Miss
    auto res0 = cache.access(0);
    assert(!res0.hit);
    assert(!res0.eviction);
    assert(res0.set_index == 0);

    // Next 15 words: 4, 8, 12, ..., 60 are within the same 64-byte block (bytes 0 to 63)
    // They must all result in Cache HITS!
    for (uint64_t addr = 4; addr < 64; addr += 4) {
        auto res = cache.access(addr);
        assert(res.hit);
        assert(!res.eviction);
        assert(res.set_index == 0);
    }

    const auto& stats = cache.getStats();
    assert(stats.total_accesses == 16);
    assert(stats.hits == 15);
    assert(stats.misses == 1);
    assert(stats.evictions == 0);
    assert(std::abs(stats.hit_rate() - (15.0 / 16.0)) < 1e-6);
    assert(std::abs(stats.miss_rate() - (1.0 / 16.0)) < 1e-6);

    std::cout << "  -> test_compulsory_misses_and_hits PASSED!" << std::endl;
}

void test_repeated_accesses() {
    std::cout << "[TEST] Running test_repeated_accesses..." << std::endl;

    CacheConfig config{2048, 64, MappingStrategy::SetAssociative, 2, ReplacementPolicyType::LRU};
    Cache cache(config);

    // First access to 0x1000: Miss
    assert(!cache.access(0x1000).hit);
    // Second access: Hit
    assert(cache.access(0x1000).hit);
    // Third access: Hit
    assert(cache.access(0x1000).hit);

    // First access to 0x5000: Miss
    assert(!cache.access(0x5000).hit);
    // Repeat: Hit
    assert(cache.access(0x5000).hit);

    assert(cache.getStats().total_accesses == 5);
    assert(cache.getStats().hits == 3);
    assert(cache.getStats().misses == 2);
    assert(cache.getStats().evictions == 0);

    std::cout << "  -> test_repeated_accesses PASSED!" << std::endl;
}

void test_direct_mapped_evictions() {
    std::cout << "[TEST] Running test_direct_mapped_evictions..." << std::endl;

    // 1024 B capacity, 64 B line size, DirectMapped
    // 16 sets. Set size = 1 line.
    // Address 0 maps to Set 0, Tag 0
    // Address 1024 (16 * 64) maps to Set 0, Tag 1
    // Address 2048 (32 * 64) maps to Set 0, Tag 2
    CacheConfig config{1024, 64, MappingStrategy::DirectMapped, 1, ReplacementPolicyType::LRU};
    Cache cache(config);

    // Access 0: Miss, compulsory, slot 0 filled, no eviction
    auto r1 = cache.access(0);
    assert(!r1.hit && !r1.eviction && r1.set_index == 0 && r1.tag == 0);

    // Access 1024: Miss, conflict! Set 0 line evicted (old tag 0 replaced by tag 1)
    auto r2 = cache.access(1024);
    assert(!r2.hit && r2.eviction);
    assert(r2.set_index == 0 && r2.tag == 1 && r2.evicted_tag == 0);

    // Access 2048: Miss, conflict! Old tag 1 replaced by tag 2
    auto r3 = cache.access(2048);
    assert(!r3.hit && r3.eviction);
    assert(r3.set_index == 0 && r3.tag == 2 && r3.evicted_tag == 1);

    // Access 0 again: Miss, conflict! Old tag 2 replaced by tag 0
    auto r4 = cache.access(0);
    assert(!r4.hit && r4.eviction);
    assert(r4.set_index == 0 && r4.tag == 0 && r4.evicted_tag == 2);

    assert(cache.getStats().total_accesses == 4);
    assert(cache.getStats().hits == 0);
    assert(cache.getStats().misses == 4);
    assert(cache.getStats().evictions == 3);

    std::cout << "  -> test_direct_mapped_evictions PASSED!" << std::endl;
}

void test_set_associative_evictions() {
    std::cout << "[TEST] Running test_set_associative_evictions..." << std::endl;

    // 2048 B capacity, 64 B line, 2-way set-associative
    // Sets = 2048 / (64 * 2) = 16 sets.
    // Stride between addresses mapping to Set 0 is 16 * 64 = 1024 bytes.
    CacheConfig config{2048, 64, MappingStrategy::SetAssociative, 2, ReplacementPolicyType::LRU};
    Cache cache(config);

    const uint64_t addr_A = 0;           // Set 0, Tag 0
    const uint64_t addr_B = 1024;        // Set 0, Tag 1
    const uint64_t addr_C = 2048;        // Set 0, Tag 2

    // Fill Set 0 (capacity: 2 lines)
    auto rA = cache.access(addr_A); // Miss, slot 0
    assert(!rA.hit && !rA.eviction);

    auto rB = cache.access(addr_B); // Miss, slot 1
    assert(!rB.hit && !rB.eviction);

    // Both lines in set 0 are now occupied. Accessing addr_C must trigger eviction!
    auto rC = cache.access(addr_C);
    assert(!rC.hit && rC.eviction);
    assert(rC.set_index == 0 && rC.tag == 2);

    assert(cache.getStats().total_accesses == 3);
    assert(cache.getStats().misses == 3);
    assert(cache.getStats().evictions == 1);

    std::cout << "  -> test_set_associative_evictions PASSED!" << std::endl;
}

void test_lru_vs_fifo_replacement() {
    std::cout << "[TEST] Running test_lru_vs_fifo_replacement..." << std::endl;

    // We configure a 2-way set-associative cache.
    // 2048 B, 64 B line, 2-way => 16 sets.
    // Addr A = 0, Addr B = 1024, Addr C = 2048 all map to Set 0.
    const uint64_t addr_A = 0;
    const uint64_t addr_B = 1024;
    const uint64_t addr_C = 2048;

    // -------------------------------------------------------------
    // Test FIFO Replacement Policy:
    // 1. Access A (ins=1)
    // 2. Access B (ins=2)
    // 3. Access A (Hit! For FIFO, insertion_time remains 1)
    // 4. Access C (Miss! Evicts line with oldest insertion_time -> A!)
    // 5. Access B -> Should HIT (B was not evicted)
    // 6. Access A -> Should MISS (A was evicted)
    // -------------------------------------------------------------
    {
        CacheConfig fifo_config{2048, 64, MappingStrategy::SetAssociative, 2, ReplacementPolicyType::FIFO};
        Cache fifo_cache(fifo_config);

        fifo_cache.access(addr_A); // Miss (ins=1)
        fifo_cache.access(addr_B); // Miss (ins=2)
        auto hit_A = fifo_cache.access(addr_A); // HIT!
        assert(hit_A.hit);

        // Access C: set 0 is full. Oldest insertion is A (ins=1 < ins=2).
        auto evict_res = fifo_cache.access(addr_C);
        assert(!evict_res.hit && evict_res.eviction);
        assert(evict_res.evicted_tag == 0); // Tag of addr_A is 0!

        // B should still be in the cache!
        assert(fifo_cache.access(addr_B).hit);

        // A was evicted, so accessing A must be a MISS!
        assert(!fifo_cache.access(addr_A).hit);
    }

    // -------------------------------------------------------------
    // Test LRU Replacement Policy:
    // 1. Access A (ins=1, acc=1)
    // 2. Access B (ins=2, acc=2)
    // 3. Access A (Hit! In LRU, A's last_accessed_time becomes 3)
    // 4. Access C (Miss! Oldest accessed line is B (acc=2 < acc=3) -> Evicts B!)
    // 5. Access A -> Should HIT (A was recently used, kept in cache)
    // 6. Access B -> Should MISS (B was evicted)
    // -------------------------------------------------------------
    {
        CacheConfig lru_config{2048, 64, MappingStrategy::SetAssociative, 2, ReplacementPolicyType::LRU};
        Cache lru_cache(lru_config);

        lru_cache.access(addr_A); // Miss (acc=1)
        lru_cache.access(addr_B); // Miss (acc=2)
        auto hit_A = lru_cache.access(addr_A); // HIT! (acc becomes 3)
        assert(hit_A.hit);

        // Access C: set 0 is full. Least recently used is B (acc=2 < acc=3).
        auto evict_res = lru_cache.access(addr_C);
        assert(!evict_res.hit && evict_res.eviction);
        assert(evict_res.evicted_tag == 1); // Tag of addr_B is 1!

        // A was kept in cache, so A must HIT!
        assert(lru_cache.access(addr_A).hit);

        // B was evicted, so accessing B must be a MISS!
        assert(!lru_cache.access(addr_B).hit);
    }

    std::cout << "  -> test_lru_vs_fifo_replacement PASSED!" << std::endl;
}

void test_workload_generator() {
    std::cout << "[TEST] Running test_workload_generator..." << std::endl;

    // 1. Sequential workload test
    auto seq100 = WorkloadGenerator::generateSequential(100, 0, 4);
    assert(seq100.size() == 100);
    for (std::size_t i = 0; i < 100; ++i) {
        assert(seq100[i] == i * 4);
        assert((seq100[i] % 4) == 0); // Aligned to 4 bytes
    }

    // 2. Random workload test - Reproducibility with fixed seed
    auto rand_a = WorkloadGenerator::generateRandom(500, 12345, 65536);
    auto rand_b = WorkloadGenerator::generateRandom(500, 12345, 65536);
    assert(rand_a.size() == 500);
    assert(rand_b.size() == 500);
    for (std::size_t i = 0; i < 500; ++i) {
        assert(rand_a[i] == rand_b[i]); // Bit-for-bit identical
        assert((rand_a[i] % 4) == 0);   // Strictly 4-byte aligned
        assert(rand_a[i] < 65536);      // Within address space
    }

    // Different seed produces different sequence
    auto rand_c = WorkloadGenerator::generateRandom(500, 54321, 65536);
    bool any_difference = false;
    for (std::size_t i = 0; i < 500; ++i) {
        if (rand_a[i] != rand_c[i]) {
            any_difference = true;
            break;
        }
    }
    assert(any_difference);

    // 3. Large access count test (10,000 accesses)
    auto seq_large = WorkloadGenerator::generateSequential(10000, 0, 4);
    assert(seq_large.size() == 10000);
    assert(seq_large.back() == (10000 - 1) * 4);

    auto rand_large = WorkloadGenerator::generateRandom(10000, 999, 131072);
    assert(rand_large.size() == 10000);
    for (uint64_t addr : rand_large) {
        assert((addr % 4) == 0);
    }

    std::cout << "  -> test_workload_generator PASSED!" << std::endl;
}

void test_statistics_and_timing_model() {
    std::cout << "[TEST] Running test_statistics_and_timing_model..." << std::endl;

    TimingAssumptions default_timing{1.0, 50.0, "Educational timing assumptions"};

    // 1. 100% Hits Test
    {
        SimulationStats stats;
        for (int i = 0; i < 50; ++i) {
            stats.recordHit();
        }
        auto report = stats.generateReport(default_timing);

        assert(report.totalAccesses == 50);
        assert(report.hits == 50);
        assert(report.misses == 0);
        assert(report.hits + report.misses == report.totalAccesses);
        assert(report.hitRate == 100.0);
        assert(report.missRate == 0.0);
        assert(std::abs((report.hitRate + report.missRate) - 100.0) < 1e-9);
        // AMAT = 1.0 + (0.0 * 50.0) = 1.0 ns
        assert(std::abs(report.amatNs - 1.0) < 1e-9);
        assert(report.timing.hit_time_ns == 1.0);
        assert(report.timing.additional_miss_penalty_ns == 50.0);
        assert(!report.timing.notes.empty());
    }

    // 2. 100% Misses Test
    {
        SimulationStats stats;
        for (int i = 0; i < 40; ++i) {
            stats.recordMiss(false);
        }
        auto report = stats.generateReport(default_timing);

        assert(report.totalAccesses == 40);
        assert(report.hits == 0);
        assert(report.misses == 40);
        assert(report.hits + report.misses == report.totalAccesses);
        assert(report.hitRate == 0.0);
        assert(report.missRate == 100.0);
        assert(std::abs((report.hitRate + report.missRate) - 100.0) < 1e-9);
        // AMAT = 1.0 + (1.0 * 50.0) = 51.0 ns
        assert(std::abs(report.amatNs - 51.0) < 1e-9);
    }

    // 3. Mixed Results Test
    {
        SimulationStats stats;
        for (int i = 0; i < 80; ++i) {
            stats.recordHit();
        }
        for (int i = 0; i < 20; ++i) {
            stats.recordMiss(i % 2 == 0);
        }
        auto report = stats.generateReport(default_timing);

        assert(report.totalAccesses == 100);
        assert(report.hits == 80);
        assert(report.misses == 20);
        assert(report.evictions == 10);
        assert(report.hits + report.misses == report.totalAccesses);
        assert(std::abs(report.hitRate - 80.0) < 1e-9);
        assert(std::abs(report.missRate - 20.0) < 1e-9);
        assert(std::abs((report.hitRate + report.missRate) - 100.0) < 1e-9);
        // AMAT = 1.0 + (0.20 * 50.0) = 1.0 + 10.0 = 11.0 ns
        assert(std::abs(report.amatNs - 11.0) < 1e-9);

        // Custom timing assumptions
        TimingAssumptions custom_timing{2.5, 100.0, "Custom model"};
        auto custom_report = stats.generateReport(custom_timing);
        // AMAT = 2.5 + (0.20 * 100.0) = 2.5 + 20.0 = 22.5 ns
        assert(std::abs(custom_report.amatNs - 22.5) < 1e-9);
        assert(custom_report.timing.hit_time_ns == 2.5);
        assert(custom_report.timing.additional_miss_penalty_ns == 100.0);
    }

    // 4. Zero Accesses Test (Avoid division by zero)
    {
        SimulationStats stats;
        auto report = stats.generateReport(default_timing);

        assert(report.totalAccesses == 0);
        assert(report.hits == 0);
        assert(report.misses == 0);
        assert(report.evictions == 0);
        assert(report.hits + report.misses == report.totalAccesses);
        assert(report.hitRate == 0.0);
        assert(report.missRate == 0.0);
        assert(report.amatNs == 0.0); // Zero accesses should safely produce 0.0 ns AMAT
    }

    // 5. Full Precision & Display Rounding Test
    {
        SimulationStats stats;
        stats.recordHit();
        stats.recordMiss(false);
        stats.recordMiss(false); // 1 hit, 2 misses, 3 total

        auto report = stats.generateReport(default_timing);
        assert(report.totalAccesses == 3);
        assert(report.hits == 1);
        assert(report.misses == 2);
        assert(report.hits + report.misses == report.totalAccesses);

        // Raw values preserve full IEEE-754 double precision
        assert(std::abs(report.hitRate - (100.0 / 3.0)) < 1e-12);
        assert(std::abs(report.missRate - (200.0 / 3.0)) < 1e-12);
        assert(std::abs((report.hitRate + report.missRate) - 100.0) < 1e-12);

        // Display rounding helper
        assert(SimulationReport::roundTo(report.hitRate, 2) == 33.33);
        assert(SimulationReport::roundTo(report.missRate, 2) == 66.67);
    }

    // 6. Cache Class Integration Test
    {
        CacheConfig config{4096, 64, MappingStrategy::SetAssociative, 4, ReplacementPolicyType::LRU};
        config.timing.hit_time_ns = 1.0;
        config.timing.additional_miss_penalty_ns = 50.0;
        Cache cache(config);

        // Initial zero-access state
        auto initial_report = cache.getReport();
        assert(initial_report.totalAccesses == 0);
        assert(initial_report.amatNs == 0.0);

        // Access 0: Miss
        cache.access(0);
        // Access 4: Hit (same block)
        cache.access(4);
        // Access 8: Hit (same block)
        cache.access(8);
        // Access 12: Hit (same block)
        cache.access(12);

        auto rep = cache.getReport();
        assert(rep.totalAccesses == 4);
        assert(rep.hits == 3);
        assert(rep.misses == 1);
        assert(rep.hitRate == 75.0);
        assert(rep.missRate == 25.0);
        assert(rep.hits + rep.misses == rep.totalAccesses);
        assert(std::abs((rep.hitRate + rep.missRate) - 100.0) < 1e-9);
        // AMAT = 1.0 + (0.25 * 50.0) = 13.5 ns
        assert(std::abs(rep.amatNs - 13.5) < 1e-9);

        // Update timing assumptions on existing cache
        cache.setTimingAssumptions({1.5, 60.0, "Updated assumptions"});
        auto updated_rep = cache.getReport();
        // AMAT = 1.5 + (0.25 * 60.0) = 1.5 + 15.0 = 16.5 ns
        assert(std::abs(updated_rep.amatNs - 16.5) < 1e-9);
        assert(updated_rep.timing.hit_time_ns == 1.5);
    }

    std::cout << "  -> test_statistics_and_timing_model PASSED!" << std::endl;
}

int main() {
    std::cout << "========================================" << std::endl;
    std::cout << " CPU Cache Simulation Engine Unit Tests" << std::endl;
    std::cout << "========================================" << std::endl;

    test_config_validation();
    test_address_to_set_mapping();
    test_compulsory_misses_and_hits();
    test_repeated_accesses();
    test_direct_mapped_evictions();
    test_set_associative_evictions();
    test_lru_vs_fifo_replacement();
    test_workload_generator();
    test_statistics_and_timing_model();

    std::cout << "========================================" << std::endl;
    std::cout << " ALL CACHE ENGINE TESTS PASSED (9/9)!" << std::endl;
    std::cout << "========================================" << std::endl;

    return 0;
}
