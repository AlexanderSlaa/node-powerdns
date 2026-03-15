import { afterEach, describe, expect, it, vi } from 'vitest';

import PowerDNS, { Client, Versions, ZoneType } from '../src';

const jsonResponse = (payload: unknown, status = 200) =>
	new Response(JSON.stringify(payload), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});

const textResponse = (payload: string | null, status = 200, contentType = 'text/plain') =>
	new Response(payload, {
		status,
		headers: { 'Content-Type': contentType }
	});

const makeClient = () =>
	new Client({
		baseUrl: 'http://127.0.0.1:8081',
		apiKey: 'test-key',
		version: Versions[0],
		extra: { traceId: 'trace-1' }
	});

const makeClientWithFetch = (fetch: typeof globalThis.fetch) =>
	new Client({
		baseUrl: 'http://127.0.0.1:8081',
		apiKey: 'test-key',
		version: Versions[0],
		extra: { traceId: 'trace-1' },
		fetch
	});

const exampleZone = {
	id: 'example.org.',
	name: 'example.org.',
	type: 'Zone',
	kind: ZoneType.Native,
	rrsets: [],
	serial: 1,
	notified_serial: 1,
	edited_serial: 1,
	masters: [],
	dnssec: false,
	nsec3param: '',
	nsec3narrow: false,
	presigned: false,
	soa_edit: '',
	soa_edit_api: '',
	api_rectify: false,
	account: '',
	master_tsig_key_ids: [],
	slave_tsig_key_ids: [],
	url: '/api/v1/servers/localhost/zones/example.org.'
};

afterEach(() => {
	vi.restoreAllMocks();
});

describe('Client', () => {
	it('defaults the server id to localhost and exposes config getters', () => {
		const client = new Client({
			baseUrl: 'http://127.0.0.1:8081/',
			apiKey: 'test-key',
			version: Versions[0],
			extra: { traceId: 'trace-1' }
		});

		expect(client.server.id).toBe('localhost');
		expect(client.baseUrl.toString()).toBe('http://127.0.0.1:8081/');
		expect(client.webserverUrl.toString()).toBe('http://127.0.0.1:8081/');
		expect(client.version).toBe('/api/v1');
		expect(client.extra).toEqual({ traceId: 'trace-1' });
	});

	it('defaults the API version when omitted', () => {
		const client = new Client({
			baseUrl: 'http://127.0.0.1:8081/',
			apiKey: 'test-key'
		});

		expect(client.version).toBe(Versions[0]);
	});

	it('exports Client as the default export', () => {
		expect(PowerDNS).toBe(Client);
	});

	it('requests server data from the configured PowerDNS endpoint', async () => {
		const fetchMock = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementation(async () => jsonResponse([{ id: 'localhost', type: 'Server' }]));

		const result = await makeClient().servers.list();

		expect(result).toEqual([{ id: 'localhost', type: 'Server' }]);
		expect(fetchMock).toHaveBeenCalledWith(
			'http://127.0.0.1:8081/api/v1/servers',
			expect.objectContaining({ headers: expect.any(Headers) })
		);

		const [, init] = fetchMock.mock.calls[0];
		const headers = init?.headers as Headers;
		expect(headers.get('X-API-Key')).toBe('test-key');
		expect(headers.get('Accept')).toBe('application/json');
	});

	it('creates zones with a JSON body', async () => {
		const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => jsonResponse(exampleZone, 201));

		await makeClient().zones().create({
			name: 'example.org.',
			kind: ZoneType.Native
		});

		const [, init] = fetchMock.mock.calls[0];
		expect(init?.method).toBe('POST');
		expect(init?.body).toBe(JSON.stringify({ name: 'example.org.', kind: ZoneType.Native }));
		expect((init?.headers as Headers).get('Content-Type')).toBe('application/json');
	});

	it('encodes zone query parameters and path segments', async () => {
		const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => jsonResponse([]));

		await makeClient().zones({ id: 'server/main' }).list({ zone: 'example.org.', dnssec: false });
		await makeClient()
			.zones({ id: 'server/main' })
			.get({ id: 'example.org./A B' }, { rrsets: true, include_disabled: false });

		expect(fetchMock.mock.calls[0][0]).toBe(
			'http://127.0.0.1:8081/api/v1/servers/server%2Fmain/zones?zone=example.org.&dnssec=false'
		);
		expect(fetchMock.mock.calls[1][0]).toBe(
			'http://127.0.0.1:8081/api/v1/servers/server%2Fmain/zones/example.org.%2FA%20B?rrsets=true&include_disabled=false'
		);
	});

	it('returns metrics as plain text', async () => {
		const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => textResponse('metric_name 1'));

		await expect(makeClient().metrics.get()).resolves.toBe('metric_name 1');

		expect(String(fetchMock.mock.calls[0][0])).toBe('http://127.0.0.1:8081/metrics');
		expect(((fetchMock.mock.calls[0][1] as RequestInit).headers as Headers).get('X-API-Key')).toBe('test-key');
	});

	it('uses a custom fetch override for versioned and webserver endpoints', async () => {
		const customFetch = vi
			.fn<typeof globalThis.fetch>()
			.mockImplementationOnce(async () => jsonResponse([{ id: 'localhost', type: 'Server' }]))
			.mockImplementationOnce(async () => textResponse('metric_name 1'));

		const client = makeClientWithFetch(customFetch);

		await expect(client.servers.list()).resolves.toEqual([{ id: 'localhost', type: 'Server' }]);
		await expect(client.metrics.get()).resolves.toBe('metric_name 1');
		expect(customFetch).toHaveBeenCalledTimes(2);
		expect(customFetch.mock.calls[0][0]).toBe('http://127.0.0.1:8081/api/v1/servers');
		expect(String(customFetch.mock.calls[1][0])).toBe('http://127.0.0.1:8081/metrics');
	});

	it('uses an optional logger for request errors', async () => {
		const logger = { error: vi.fn() };
		vi.spyOn(globalThis, 'fetch').mockImplementation(async () => jsonResponse({ error: 'boom', errors: ['detail'] }, 500));

		const client = new Client({
			baseUrl: 'http://127.0.0.1:8081',
			apiKey: 'test-key',
			logger
		});

		await expect(client.servers.get()).rejects.toEqual({
			error: 'boom',
			errors: ['detail']
		});
		expect(logger.error).toHaveBeenCalledWith({
			error: 'boom',
			errors: ['detail']
		});
	});

	it('throws a fallback HTTP error when metrics response is not JSON', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(async () => textResponse('failure', 502));

		expect(makeClient().metrics.get()).rejects.toEqual({
			error: 'HTTP 502 '
		});
	});

	it('throws the PowerDNS error payload on non-2xx responses', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(async () => jsonResponse({ error: 'boom', errors: ['detail'] }, 500));

		expect(makeClient().servers.get()).rejects.toEqual({
			error: 'boom',
			errors: ['detail']
		});
	});

	it('throws when JSON is requested but the API returns text', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(async () => textResponse('not-json'));

		expect(makeClient().servers.list()).rejects.toEqual({
			error: 'API response is not JSON',
			errors: ['Use _raw() for non-JSON responses']
		});
	});

	it('returns JSON payloads as strings for text endpoints', async () => {
		const fetchMock = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementationOnce(async () => jsonResponse({ exported: true }))
			.mockImplementationOnce(async () => jsonResponse('rectified'));

		const client = makeClient();

		await expect(client.zones().export({ id: 'example.org.' })).resolves.toBe('{"exported":true}');
		await expect(client.zones().rectify({ id: 'example.org.' })).resolves.toBe('rectified');

		expect((fetchMock.mock.calls[1][1] as RequestInit).method).toBe('PUT');
	});

	it('supports rrset deletion', async () => {
		const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => textResponse(null, 204));

		await makeClient()
			.zones()
			.rrset({ id: 'example.org.' }, { name: 'www.example.org.', type: 'A' })
			.delete();

		expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('PATCH');
		expect((fetchMock.mock.calls[0][1] as RequestInit).body).toBe(
			JSON.stringify({
				rrsets: [{ name: 'www.example.org.', type: 'A', changetype: 'DELETE' }]
			})
		);
	});

	it('updates rrsets by filtering existing records and comments', async () => {
		const fetchMock = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementationOnce(async () =>
				jsonResponse({
					...exampleZone,
					rrsets: [
						{
							name: 'www.example.org.',
							type: 'A',
							ttl: 300,
							records: [
								{ content: '203.0.113.10', disabled: false },
								{ content: '203.0.113.11', disabled: true }
							],
							comments: [
								{ content: 'keep', account: 'a' },
								{ content: 'drop', account: 'b' }
							]
						}
					]
				})
			)
			.mockImplementationOnce(async () => textResponse(null, 204));

		await makeClient()
			.zones()
			.rrset({ id: 'example.org.' }, { name: 'www.example.org.', type: 'A' })
			.update({
				records: (record) => !record.disabled,
				comments: (comment) => comment.content === 'keep'
			});

		expect(fetchMock.mock.calls[1][0]).toBe('http://127.0.0.1:8081/api/v1/servers/localhost/zones/example.org.');
		expect((fetchMock.mock.calls[1][1] as RequestInit).body).toBe(
			JSON.stringify({
				rrsets: [
					{
						name: 'www.example.org.',
						type: 'A',
						ttl: 300,
						changetype: 'REPLACE',
						records: [{ content: '203.0.113.10', disabled: false }],
						comments: [{ content: 'keep', account: 'a' }]
					}
				]
			})
		);
	});

	it('creates rrsets by appending records and comments to the existing set', async () => {
		const fetchMock = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementationOnce(async () =>
				jsonResponse({
					...exampleZone,
					rrsets: [
						{
							name: 'www.example.org.',
							type: 'TXT',
							ttl: 600,
							records: [{ content: '"old"', disabled: false }],
							comments: [{ content: 'existing', account: 'ops' }]
						}
					]
				})
			)
			.mockImplementationOnce(async () => textResponse(null, 204));

		await makeClient()
			.zones()
			.rrset({ id: 'example.org.' }, { name: 'www.example.org.', type: 'TXT' })
			.create({
				record: { content: '"new"', disabled: false },
				comments: [{ content: 'added', account: 'test' }]
			});

		expect((fetchMock.mock.calls[1][1] as RequestInit).body).toBe(
			JSON.stringify({
				rrsets: [
					{
						name: 'www.example.org.',
						type: 'TXT',
						ttl: 600,
						changetype: 'REPLACE',
						records: [
							{ content: '"old"', disabled: false },
							{ content: '"new"', disabled: false }
						],
						comments: [
							{ content: 'existing', account: 'ops' },
							{ content: 'added', account: 'test' }
						]
					}
				]
			})
		);
	});

	it('fails rrset mutations when ttl cannot be resolved', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(async () => jsonResponse({ ...exampleZone, rrsets: [] }));

		const rrset = makeClient()
			.zones()
			.rrset({ id: 'example.org.' }, { name: 'www.example.org.', type: 'A' });

		expect(rrset.update({records: []})).rejects.toEqual({
			error: 'RRSet ttl is required when no existing RRSet is found'
		});
		expect(rrset.create({record: {content: '203.0.113.10', disabled: false}})).rejects.toEqual({
			error: 'RRSet ttl is required when no existing RRSet is found'
		});
	});

	it('covers view, network, tsig, search, statistics, cache, metadata, cryptokey, and autoprimary endpoints', async () => {
		const fetchMock = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementationOnce(async () => jsonResponse({ views: ['internal'] }))
			.mockImplementationOnce(async () => jsonResponse({ zones: ['example.org.'] }))
			.mockImplementationOnce(async () => textResponse(null, 204))
			.mockImplementationOnce(async () => textResponse(null, 204))
			.mockImplementationOnce(async () => jsonResponse({ networks: [] }))
			.mockImplementationOnce(async () => jsonResponse({ networks: [] }))
			.mockImplementationOnce(async () => textResponse(null, 204))
			.mockImplementationOnce(async () => jsonResponse([{ kind: 'ALLOW-AXFR-FROM', metadata: ['127.0.0.1'] }]))
			.mockImplementationOnce(async () => textResponse(null, 204))
			.mockImplementationOnce(async () => jsonResponse({ kind: 'ALLOW-AXFR-FROM', metadata: ['127.0.0.1'] }))
			.mockImplementationOnce(async () => jsonResponse({ kind: 'ALLOW-AXFR-FROM', metadata: ['127.0.0.2'] }))
			.mockImplementationOnce(async () => textResponse(null, 204))
			.mockImplementationOnce(async () => jsonResponse([]))
			.mockImplementationOnce(async () => jsonResponse({ id: 1, active: true, published: false }))
			.mockImplementationOnce(async () => jsonResponse({ id: 1, active: true, published: false }))
			.mockImplementationOnce(async () => textResponse(null, 204))
			.mockImplementationOnce(async () => textResponse(null, 204))
			.mockImplementationOnce(async () => jsonResponse([]))
			.mockImplementationOnce(async () => jsonResponse({ name: 'tsig.', id: 'tsig.', algorithm: 'hmac-md5', key: 'abc', type: 'TSIGKey' }))
			.mockImplementationOnce(async () => jsonResponse({ name: 'tsig.', id: 'tsig.', algorithm: 'hmac-sha256', key: 'def', type: 'TSIGKey' }))
			.mockImplementationOnce(async () => textResponse(null, 204))
			.mockImplementationOnce(async () => jsonResponse([]))
			.mockImplementationOnce(async () => textResponse(null, 204))
			.mockImplementationOnce(async () => textResponse(null, 204))
			.mockImplementationOnce(async () => jsonResponse([]))
			.mockImplementationOnce(async () => jsonResponse([{ name: 'packetcache-hits', type: 'StatisticItem', value: '1' }]))
			.mockImplementationOnce(async () => jsonResponse({ count: 1, result: 'Flushed cache.' }))
			.mockImplementationOnce(async () => jsonResponse([{ name: 'webserver-port', type: 'ConfigSetting', value: '8081' }]));

		const client = makeClient();

		expect(client.views.list()).resolves.toEqual({views: ['internal']});
		expect(client.views.get('internal')).resolves.toEqual({zones: ['example.org.']});
		await expect(client.views.addZone('internal', { name: 'example.org.' })).resolves.toBeUndefined();
		await expect(client.views.removeZone('internal', { id: 'example.org.' })).resolves.toBeUndefined();
		expect(client.networks.list()).resolves.toEqual({networks: []});
		expect(client.networks.get({ip: '192.0.2.1', prefixlen: 24})).resolves.toEqual({networks: []});
		await expect(client.networks.set({ ip: '192.0.2.1', prefixlen: 24 }, { view: 'internal' })).resolves.toBeUndefined();
		expect(client.metadata.list({id: 'example.org.'})).resolves.toEqual([
			{kind: 'ALLOW-AXFR-FROM', metadata: ['127.0.0.1']}
		]);
		await expect(
			client.metadata.create({ id: 'example.org.' }, { kind: 'ALLOW-AXFR-FROM', metadata: ['127.0.0.1'] })
		).resolves.toBeUndefined();
		expect(client.metadata.get({id: 'example.org.'}, {kind: 'ALLOW-AXFR-FROM'})).resolves.toEqual({
			kind: 'ALLOW-AXFR-FROM',
			metadata: ['127.0.0.1']
		});
		expect(
			client.metadata.update({id: 'example.org.'}, {kind: 'ALLOW-AXFR-FROM', metadata: ['127.0.0.2']})
		).resolves.toEqual({
			kind: 'ALLOW-AXFR-FROM',
			metadata: ['127.0.0.2']
		});
		await expect(client.metadata.delete({ id: 'example.org.' }, { kind: 'ALLOW-AXFR-FROM' })).resolves.toBeUndefined();
		expect(client.cryptokeys.list({id: 'example.org.'})).resolves.toEqual([]);
		expect(
			client.cryptokeys.create({id: 'example.org.'}, {keytype: 'ksk', active: true, published: false})
		).resolves.toEqual({id: 1, active: true, published: false});
		expect(client.cryptokeys.get({id: 'example.org.'}, {id: '1'})).resolves.toEqual({
			id: 1,
			active: true,
			published: false
		});
		await expect(
			client.cryptokeys.update({ id: 'example.org.' }, { id: '1', active: true, published: false })
		).resolves.toBeUndefined();
		await expect(client.cryptokeys.delete({ id: 'example.org.' }, { id: '1' })).resolves.toBeUndefined();
		expect(client.tsigkeys.list()).resolves.toEqual([]);
		expect(client.tsigkeys.create({name: 'tsig.', algorithm: 'hmac-md5'})).resolves.toEqual({
			name: 'tsig.',
			id: 'tsig.',
			algorithm: 'hmac-md5',
			key: 'abc',
			type: 'TSIGKey'
		});
		expect(
			client.tsigkeys.update({id: 'tsig.', algorithm: 'hmac-sha256', key: 'def'})
		).resolves.toEqual({
			name: 'tsig.',
			id: 'tsig.',
			algorithm: 'hmac-sha256',
			key: 'def',
			type: 'TSIGKey'
		});
		await expect(client.tsigkeys.delete({ id: 'tsig.' })).resolves.toBeUndefined();
		expect(client.autoprimaries.list()).resolves.toEqual([]);
		await expect(
			client.autoprimaries.create({ ip: '192.0.2.1', nameserver: 'ns1.example.org', account: 'ops' })
		).resolves.toBeUndefined();
		await expect(
			client.autoprimaries.delete({ ip: '192.0.2.1', nameserver: 'ns1.example.org' })
		).resolves.toBeUndefined();
		expect(
			client.search.list({q: 'www', max: 5, object_type: 'record'})
		).resolves.toEqual([]);
		expect(client.statistics.get({statistic: 'packetcache-hits', includerings: false})).resolves.toEqual([
			{name: 'packetcache-hits', type: 'StatisticItem', value: '1'}
		]);
		expect(client.cache.flush({domain: 'example.org.'})).resolves.toEqual({
			count: 1,
			result: 'Flushed cache.'
		});
		expect(client.config.get()).resolves.toEqual([
			{name: 'webserver-port', type: 'ConfigSetting', value: '8081'}
		]);

		expect(fetchMock.mock.calls[6][0]).toBe(
			'http://127.0.0.1:8081/api/v1/servers/localhost/networks/192.0.2.1/24'
		);
		expect(fetchMock.mock.calls[21][0]).toBe(
			'http://127.0.0.1:8081/api/v1/servers/localhost/autoprimaries'
		);
		expect(fetchMock.mock.calls[24][0]).toBe(
			'http://127.0.0.1:8081/api/v1/servers/localhost/search-data?q=www&max=5&object_type=record'
		);
		expect(fetchMock.mock.calls[26][0]).toBe(
			'http://127.0.0.1:8081/api/v1/servers/localhost/cache/flush?domain=example.org.'
		);
	});
});
