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

    std::cout << "========================================" << std::endl;
    std::cout << " ALL CACHE ENGINE TESTS PASSED (8/8)!" << std::endl;
    std::cout << "========================================" << std::endl;

    return 0;
}
