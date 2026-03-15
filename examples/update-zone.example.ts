import { Client, ZoneType } from '../src';

const client = new Client({
	baseUrl: 'http://127.0.0.1:8081',
	apiKey: process.env.POWERDNS_API_KEY!
});

async function main() {
	await client.zones().update({
		id: 'example.org.',
		kind: ZoneType.Native,
		account: 'example-account',
		soa_edit_api: 'DEFAULT'
	});

	console.log('Zone updated');
}

main().catch(console.error);
