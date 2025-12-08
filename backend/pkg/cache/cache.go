package cache

import (
	"sync"
	"time"
)

type Cache struct {
	data     sync.Map
	ttl      time.Duration
	stopChan chan struct{}
}

type cacheItem struct {
	Value      interface{}
	Expiration time.Time
}

func New(ttl, cleanupInterval time.Duration) *Cache {
	c := &Cache{
		ttl:      ttl,
		stopChan: make(chan struct{}),
	}

	// Start cleanup goroutine
	go c.startCleanup(cleanupInterval)

	return c
}

func (c *Cache) Set(key string, value interface{}) {
	c.data.Store(key, cacheItem{
		Value:      value,
		Expiration: time.Now().Add(c.ttl),
	})
}

func (c *Cache) SetWithTTL(key string, value interface{}, ttl time.Duration) {
	c.data.Store(key, cacheItem{
		Value:      value,
		Expiration: time.Now().Add(ttl),
	})
}

func (c *Cache) Get(key string) (interface{}, bool) {
	item, ok := c.data.Load(key)
	if !ok {
		return nil, false
	}

	cacheItem := item.(cacheItem)
	if time.Now().After(cacheItem.Expiration) {
		c.data.Delete(key)
		return nil, false
	}

	return cacheItem.Value, true
}

func (c *Cache) Delete(key string) {
	c.data.Delete(key)
}

func (c *Cache) Clear() {
	c.data.Range(func(key, value interface{}) bool {
		c.data.Delete(key)
		return true
	})
}

func (c *Cache) startCleanup(interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			c.cleanup()
		case <-c.stopChan:
			return
		}
	}
}

func (c *Cache) cleanup() {
	now := time.Now()
	c.data.Range(func(key, value interface{}) bool {
		item := value.(cacheItem)
		if now.After(item.Expiration) {
			c.data.Delete(key)
		}
		return true
	})
}

func (c *Cache) Stop() {
	close(c.stopChan)
}
