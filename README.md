# node-powerdns (Node.js + TypeScript)

[![npm version](https://img.shields.io/npm/v/node-powerdns?logo=npm)](https://www.npmjs.com/package/node-powerdns)
[![License](https://img.shields.io/npm/l/node-powerdns)](https://github.com/AlexanderSlaa/node-powerdns/blob/main/LICENSE)
[![CI](https://github.com/AlexanderSlaa/node-powerdns/actions/workflows/test.yml/badge.svg)](https://github.com/AlexanderSlaa/node-powerdns/actions/workflows/test.yml)
[![Codecov](https://img.shields.io/codecov/c/github/AlexanderSlaa/node-powerdns)](https://codecov.io/gh/AlexanderSlaa/node-powerdns)

A typed PowerDNS Authoritative HTTP API client for Node.js.

This library wraps the PowerDNS API with a small, fetch-based client and exposes TypeScript types for the main Authoritative server resources.
You can import the client as either the default export or the named `Client` export.

## Features

### API coverage

- Servers, config, metrics, zones, RRsets, views, networks, metadata, TSIG keys, cryptokeys, autoprimaries, search, statistics, and cache flush endpoints.
- Versioned API base path support through the `version` client option.
- Default server selection with automatic fallback to `localhost`.

### Type safety

- Typed request and response models for common PowerDNS resources.
- Exported enums and helper types for zones, records, statistics, and related API payloads.
- Generic `extra` config field for attaching caller-specific metadata to a client instance.

### Runtime model

- Uses the built-in `fetch()` available in modern Node.js.
- Minimal abstraction over raw PowerDNS endpoints.
- JSON, text, and void response helpers for the different endpoint behaviors.

### Package output

- ESM and CommonJS builds.
- Bundled declaration files.
- TypeDoc generation for hosted API docs.

---

## Installation

```bash
npm install node-powerdns
```

Node.js 18 or newer is recommended because the client relies on the built-in `fetch()` API.

---

## Quick start

### 1. Create a client

```ts
import { Client, Versions } from 'node-powerdns';

const client = new Client({
  baseUrl: 'http://127.0.0.1:8081',
  apiKey: process.env.POWERDNS_API_KEY!,
  version: Versions[0],
  server: { id: 'localhost' }
});
```

Default import is also supported:

```ts
import PowerDNS, { Versions } from 'node-powerdns';

const client = new PowerDNS({
  baseUrl: 'http://127.0.0.1:8081',
  apiKey: process.env.POWERDNS_API_KEY!,
  version: Versions[0]
});
```

### 2. Read server information

```ts
const server = await client.servers.get();

console.log(server.id);
console.log(server.version);
```

### 3. List zones

```ts
const zones = await client.zones().list({ dnssec: false });

for (const zone of zones) {
  console.log(zone.name, zone.kind);
}
```

---

## API Reference (high level)

### `new Client(config)`

```ts
type ClientConfig<E = unknown> = {
  baseUrl: string;
  apiKey: string;
  version: string;
  server?: { id: string };
  extra?: E;
};
```

The client trims a trailing slash from `baseUrl` and uses `server.id = 'localhost'` when no server is provided.

---

### `client.servers`

```ts
await client.servers.list();
await client.servers.get();
```

Use this to enumerate available PowerDNS servers or inspect the configured default server.

---

### `client.zones(server?)`

```ts
import { ZoneType } from 'node-powerdns';

const zones = client.zones();

await zones.list();
await zones.get({ id: 'example.org.' });
await zones.create({
  name: 'example.org.',
  kind: ZoneType.Native
});
```

The zone API also exposes helpers for updates, deletes, AXFR retrieval, notifications, export, rectify, and RRSet-level operations.

---

### `client.zones().rrset(zone, target)`

```ts
await client
  .zones()
  .rrset({ id: 'example.org.' }, { name: 'www.example.org.', type: 'A', ttl: 300 })
  .create({
    record: { content: '203.0.113.10', disabled: false }
  });
```

Use the RRSet helper to create, update, or delete records inside an existing zone.

---

### `client.metrics.get()`

```ts
const metrics = await client.metrics.get();
console.log(metrics);
```

This calls the webserver metrics endpoint and returns the raw text response.

---

## Options

```ts
import { Versions, ZoneType, type ZoneCreateRequest, type ZoneUpdateRequest } from 'node-powerdns';
```

### Notes

- `baseUrl` should point at the PowerDNS webserver root, for example `http://127.0.0.1:8081`.
- `version` should match the PowerDNS API path, for example `Versions[0]` for `/api/v1`.
- `server.id` defaults to `localhost` if omitted.
- Most methods throw the JSON error payload returned by PowerDNS when the API responds with a non-2xx status.

---

## Common endpoints

This client exposes grouped API helpers:

- `client.config`
- `client.servers`
- `client.metrics`
- `client.zones(server?)`
- `client.views`
- `client.networks`
- `client.cryptokeys`
- `client.metadata`
- `client.tsigkeys`
- `client.autoprimaries`
- `client.search`
- `client.statistics`
- `client.cache`

---

## Minimal example with manual inspection

```ts
import { Client, Versions } from 'node-powerdns';

const client = new Client({
  baseUrl: 'http://127.0.0.1:8081',
  apiKey: process.env.POWERDNS_API_KEY!,
  version: Versions[0]
});

const zone = await client.zones().get({ id: 'example.org.' }, { rrsets: true });

console.log(zone.rrsets.length);
```

---

## Error handling

```ts
import { Client, Versions, type Error as PowerDNSError } from 'node-powerdns';

const client = new Client({
  baseUrl: 'http://127.0.0.1:8081',
  apiKey: process.env.POWERDNS_API_KEY!,
  version: Versions[0]
});

try {
  await client.servers.get();
} catch (error) {
  const apiError = error as PowerDNSError;
  console.error(apiError.error);
  console.error(apiError.errors);
}
```

---

## Runtime requirements

- Node.js 18+.
- A reachable PowerDNS Authoritative API endpoint.
- A valid PowerDNS API key supplied through `X-API-Key`.

---

## Documentation

- README: [github.com/AlexanderSlaa/node-powerdns](https://github.com/AlexanderSlaa/node-powerdns#readme)
- Generated API docs: [alexanderslaa.github.io/node-powerdns](https://alexanderslaa.github.io/node-powerdns/)
- PowerDNS API reference: [doc.powerdns.com/authoritative/http-api](https://doc.powerdns.com/authoritative/http-api/)

---

## License

Apache 2.0. See [LICENSE](./LICENSE).
