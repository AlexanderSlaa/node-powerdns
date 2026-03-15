import { Client, ZoneType } from '../src';

const client = new Client({
	baseUrl: 'http://127.0.0.1:8081',
	apiKey: process.env.POWERDNS_API_KEY!
});

async function main() {
	await client.zones().create({
		name: 'example.org.',
		kind: ZoneType.Native
	});

	await client
		.zones()
		.rrset({ id: 'example.org.' }, { name: 'www.example.org.', type: 'A', ttl: 300 })
		.create({
			record: {
				content: '203.0.113.10',
				disabled: false
			},
			comments: {
				content: 'Created by node-powerdns example',
				account: 'example-account'
			}
		});

	console.log('Zone, record, and comment created');
}

main().catch(console.error);
