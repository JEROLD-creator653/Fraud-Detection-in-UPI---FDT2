FROM redis:6-alpine

# Configure Redis with persistence
CMD ["redis-server", "--appendonly", "yes", "--maxmemory", "128mb", "--maxmemory-policy", "allkeys-lru"]

EXPOSE 6379
